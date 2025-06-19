import { GrammarSuggestion } from './grammar-engine'
import { processWithContextAwareStyleRules, convertToGrammarSuggestions, contextAwareStyleRules } from './context-aware-style-rules'
import { filterGrammarSuggestionsByValidation } from '../../../../lib/grammar-validation'

/**
 * Enhanced style processor that replaces problematic simple pattern matching
 * with intelligent, context-aware analysis
 */
export class EnhancedStyleProcessor {
  private cache = new Map<string, GrammarSuggestion[]>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes

  /**
   * Process text with enhanced style rules
   * This is the main entry point that replaces the old style rule processing
   */
  async processStyleSuggestions(text: string): Promise<GrammarSuggestion[]> {
    // Check cache first
    const cacheKey = this.generateCacheKey(text)
    const cached = this.cache.get(cacheKey)
    if (cached) {
      return cached
    }

    try {
      // Process with context-aware rules
      const contextAwareSuggestions = await processWithContextAwareStyleRules(text, contextAwareStyleRules)
      
      // Convert to grammar engine format
      const grammarSuggestions = convertToGrammarSuggestions(contextAwareSuggestions)
      
      // Apply additional validation filtering
      const filteredSuggestions = await filterGrammarSuggestionsByValidation(grammarSuggestions, text)
      
      // Cache the results
      this.cache.set(cacheKey, filteredSuggestions)
      setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout)
      
      return filteredSuggestions
    } catch (error) {
      console.error('Error processing enhanced style suggestions:', error)
      return [] // Fail gracefully
    }
  }

  /**
   * Process specific problematic patterns that were causing issues
   * This method specifically handles the cases from the screenshot
   */
  async processProblematicPatterns(text: string): Promise<{
    thereAreMany: GrammarSuggestion[]
    aLotOf: GrammarSuggestion[]
    other: GrammarSuggestion[]
  }> {
    const allSuggestions = await this.processStyleSuggestions(text)
    
    const thereAreMany = allSuggestions.filter(s => s.ruleId?.includes('there-are-many'))
    const aLotOf = allSuggestions.filter(s => s.ruleId?.includes('a-lot-of'))
    const other = allSuggestions.filter(s => 
      !s.ruleId?.includes('there-are-many') && 
      !s.ruleId?.includes('a-lot-of')
    )
    
    return { thereAreMany, aLotOf, other }
  }

  /**
   * Get detailed analysis for a specific suggestion
   * Useful for debugging and understanding why a suggestion was made or rejected
   */
  async analyzeSuggestion(text: string, start: number, end: number): Promise<{
    originalText: string
    matchedRules: string[]
    contextAnalysis: any
    validationResults: any
    finalSuggestion: GrammarSuggestion | null
  }> {
    const originalText = text.substring(start, end)
    const suggestions = await this.processStyleSuggestions(text)
    const relevantSuggestion = suggestions.find(s => s.start === start && s.end === end)
    
    // Get context analysis for this position
    const { buildContextMetadata, extractContextWindow } = await import('../../../../lib/grammar-context')
    const context = buildContextMetadata(text, start, end - start)
    const contextWindow = extractContextWindow(text, start, end - start, 50)
    
    return {
      originalText,
      matchedRules: suggestions.filter(s => s.start === start && s.end === end).map(s => s.ruleId || 'unknown'),
      contextAnalysis: {
        sentencePosition: context.sentencePosition,
        isCompleteSentence: context.sentenceBoundary.isComplete,
        surroundingContext: contextWindow.before + '[MATCH]' + contextWindow.after
      },
      validationResults: relevantSuggestion ? {
        validated: (relevantSuggestion as any).validated,
        risk: (relevantSuggestion as any).validationRisk,
        reasons: (relevantSuggestion as any).validationReasons
      } : null,
      finalSuggestion: relevantSuggestion || null
    }
  }

  /**
   * Test the processor with specific problematic examples
   */
  async testProblematicExamples(): Promise<{
    example1: any
    example2: any
  }> {
    // Example 1: "There are many issues with this document"
    const text1 = "There are many issues with this document."
    const analysis1 = await this.analyzeSuggestion(text1, 0, 14) // "There are many"
    
    // Example 2: "I receive a lot of feedback"
    const text2 = "I receive a lot of feedback from users."
    const analysis2 = await this.analyzeSuggestion(text2, 10, 19) // "a lot of"
    
    return {
      example1: {
        text: text1,
        analysis: analysis1
      },
      example2: {
        text: text2,
        analysis: analysis2
      }
    }
  }

  private generateCacheKey(text: string): string {
    // Create a hash of the text content for caching
    let hash = 0
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `style_${hash}_${text.length}`
  }

  /**
   * Clear the cache (useful for testing or memory management)
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    }
  }
}

// Export a singleton instance
export const enhancedStyleProcessor = new EnhancedStyleProcessor()

/**
 * Convenience function for direct usage
 */
export async function processEnhancedStyleSuggestions(text: string): Promise<GrammarSuggestion[]> {
  return enhancedStyleProcessor.processStyleSuggestions(text)
}

/**
 * Test function to validate the enhanced rules work correctly
 */
export async function testEnhancedStyleRules(): Promise<void> {
  console.log('Testing Enhanced Style Rules...')
  
  const testCases = [
    {
      name: 'Problematic "there are many" at start',
      text: 'There are many issues with this document.',
      expectNoSuggestion: true
    },
    {
      name: 'Safe "there are many" in middle',
      text: 'I know there are many solutions available.',
      expectNoSuggestion: true
    },
    {
      name: 'Problematic "a lot of feedback"',
      text: 'I receive a lot of feedback from users.',
      expectedSuggestion: 'much'
    },
    {
      name: 'Correct "a lot of issues"',
      text: 'There are a lot of issues to resolve.',
      expectedSuggestion: 'many'
    },
    {
      name: 'Safe nominalization',
      text: 'We need to make a decision quickly.',
      expectedSuggestion: 'decide'
    }
  ]
  
  for (const testCase of testCases) {
    console.log(`\nTesting: ${testCase.name}`)
    console.log(`Text: "${testCase.text}"`)
    
    const suggestions = await processEnhancedStyleSuggestions(testCase.text)
    
    if (testCase.expectNoSuggestion) {
      console.log(`Expected: No suggestions`)
      console.log(`Actual: ${suggestions.length} suggestions`)
      if (suggestions.length > 0) {
        console.log('Suggestions:', suggestions.map(s => `"${s.text}" -> "${s.replacement}"`))
      }
    } else {
      console.log(`Expected suggestion: "${testCase.expectedSuggestion}"`)
      const relevantSuggestions = suggestions.filter(s => 
        s.replacement === testCase.expectedSuggestion
      )
      console.log(`Found ${relevantSuggestions.length} matching suggestions`)
    }
  }
  
  console.log('\nEnhanced Style Rules Test Complete!')
} 