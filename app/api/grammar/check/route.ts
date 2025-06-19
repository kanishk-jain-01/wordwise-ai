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
  const result = grammarEngine.checkText(text)
  
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
    const { text, documentId } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Create hash for caching
    const textHash = await createHash(text)
    const cacheKey = `grammar:v3:${documentId}:${textHash}` // v3 for new enhanced engine

    // Check cache first
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ 
          suggestions: cached,
          stats: grammarEngine.getStats(),
          cached: true
        })
      }
    } catch (cacheError) {
      console.warn("Cache read failed:", cacheError)
    }

    // Perform grammar check
    const suggestions = await checkGrammar(text)

    // Cache results for 1 hour
    try {
      await redis.setex(cacheKey, 3600, suggestions)
    } catch (cacheError) {
      console.warn("Cache write failed:", cacheError)
    }

    return NextResponse.json({ 
      suggestions,
      stats: grammarEngine.getStats(),
      cached: false
    })
  } catch (error) {
    console.error("Grammar check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
