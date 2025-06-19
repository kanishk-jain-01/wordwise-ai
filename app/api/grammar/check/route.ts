import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import type { GrammarSuggestion } from "@/lib/db"
import { GrammarEngine } from '../rules/grammar-engine'

export const runtime = "nodejs"

// Initialize the grammar engine
const grammarEngine = new GrammarEngine()

// Helper function to generate UUID (Edge Runtime compatible)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to create hash (Edge Runtime compatible)
async function createHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enhanced grammar checking function using the new grammar engine
async function checkGrammar(text: string): Promise<GrammarSuggestion[]> {
  // Use the grammar engine to check the text
  const result = await grammarEngine.checkText(text)
  
  // Convert GrammarError[] to GrammarSuggestion[]
  const suggestions: GrammarSuggestion[] = result.errors.map(error => ({
    id: generateId(),
    type: error.type,
    message: error.message,
    shortMessage: error.shortMessage,
    offset: error.offset,
    length: error.length,
    // Use multiple suggestions from enhanced spelling engine, fallback to single replacement
    replacements: error.suggestions && error.suggestions.length > 0 
      ? error.suggestions 
      : (error.replacement ? [error.replacement] : []),
    context: {
      text: error.context,
      offset: error.offset,
      length: error.length,
    },
    // Add additional metadata
    ruleId: error.ruleId,
    category: error.category,
    confidence: error.confidence,
    examples: error.examples
  }))

  return suggestions
}

export async function POST(request: NextRequest) {
  try {
    const { text, documentId, minConfidence, maxRisk } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Parse filtering parameters
    const confidenceThreshold = minConfidence ? parseFloat(minConfidence) : 0.5
    const riskFilter = maxRisk || 'RISKY' // SAFE, MODERATE, RISKY

    // Create hash for caching
    const textHash = await createHash(text)
    const cacheKey = `grammar:v3:${documentId}:${textHash}` // v3 for new enhanced engine

    // Check cache first (but still apply filtering to cached results)
    try {
      const cached = await redis.get(cacheKey)
      if (cached && Array.isArray(cached)) {
        // Apply filtering to cached results
        const filteredCached = cached.filter((suggestion: any) => {
          if (suggestion.confidence && suggestion.confidence < confidenceThreshold) {
            return false
          }
          
          const suggestionRisk = suggestion.validationRisk
          if (suggestionRisk) {
            const riskOrder = { 'SAFE': 1, 'MODERATE': 2, 'RISKY': 3 }
            const maxRiskLevel = riskOrder[riskFilter as keyof typeof riskOrder] || 3
            const suggestionRiskLevel = riskOrder[suggestionRisk as keyof typeof riskOrder] || 3
            
            if (suggestionRiskLevel > maxRiskLevel) {
              return false
            }
          }
          
          return true
        })
        
        return NextResponse.json({ 
          suggestions: filteredCached,
          stats: {
            ...grammarEngine.getStats(),
            filtering: {
              totalSuggestions: cached.length,
              filteredSuggestions: filteredCached.length,
              confidenceThreshold,
              riskFilter,
              filteredOut: cached.length - filteredCached.length
            }
          },
          cached: true
        })
      }
    } catch (cacheError) {
      console.warn("Cache read failed:", cacheError)
    }

    // Perform grammar check
    const allSuggestions = await checkGrammar(text)
    
    // Apply confidence and risk filtering
    const suggestions = allSuggestions.filter(suggestion => {
      // Filter by confidence threshold
      if (suggestion.confidence && suggestion.confidence < confidenceThreshold) {
        return false
      }
      
      // Filter by risk level (if validation metadata is available)
      const suggestionRisk = (suggestion as any).validationRisk
      if (suggestionRisk) {
        const riskOrder = { 'SAFE': 1, 'MODERATE': 2, 'RISKY': 3 }
        const maxRiskLevel = riskOrder[riskFilter as keyof typeof riskOrder] || 3
        const suggestionRiskLevel = riskOrder[suggestionRisk as keyof typeof riskOrder] || 3
        
        if (suggestionRiskLevel > maxRiskLevel) {
          return false
        }
      }
      
      return true
    })

    // Cache results for 1 hour
    try {
      await redis.setex(cacheKey, 3600, suggestions)
    } catch (cacheError) {
      console.warn("Cache write failed:", cacheError)
    }

    return NextResponse.json({ 
      suggestions,
      stats: {
        ...grammarEngine.getStats(),
        filtering: {
          totalSuggestions: allSuggestions.length,
          filteredSuggestions: suggestions.length,
          confidenceThreshold,
          riskFilter,
          filteredOut: allSuggestions.length - suggestions.length
        }
      },
      cached: false
    })
  } catch (error) {
    console.error("Grammar check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
