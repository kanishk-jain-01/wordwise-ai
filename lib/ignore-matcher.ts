import type { GrammarSuggestion, IgnoredSuggestion } from "@/lib/db"

/**
 * Extract context around a suggestion for better matching
 */
export function extractContext(text: string, offset: number, length: number, contextLength = 50): {
  before: string
  after: string
} {
  const start = Math.max(0, offset - contextLength)
  const end = Math.min(text.length, offset + length + contextLength)
  
  const before = text.slice(start, offset).trim()
  const after = text.slice(offset + length, end).trim()
  
  return { before, after }
}

/**
 * Calculate similarity between two strings (simple Levenshtein-based)
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0
  if (str1 === str2) return 1
  
  const maxLength = Math.max(str1.length, str2.length)
  if (maxLength === 0) return 1
  
  // Simple similarity based on common characters
  const commonChars = str1.split('').filter(char => str2.includes(char)).length
  return commonChars / maxLength
}

/**
 * Check if a suggestion should be ignored based on the ignored list
 */
export function shouldIgnoreSuggestion(
  suggestion: GrammarSuggestion & { from: number; to: number },
  originalText: string,
  ignoredList: IgnoredSuggestion[]
): boolean {
  if (ignoredList.length === 0) return false
  
  const suggestionText = originalText.slice(suggestion.from, suggestion.to)
  const context = extractContext(originalText, suggestion.from, suggestion.to - suggestion.from)
  
  for (const ignored of ignoredList) {
    // Primary match: exact text and type
    if (ignored.original_text === suggestionText && ignored.suggestion_type === suggestion.type) {
      
      // If we have rule ID, use it for more precise matching
      if (ignored.rule_id && suggestion.ruleId && ignored.rule_id === suggestion.ruleId) {
        return true
      }
      
      // If no rule ID, use position and context for fuzzy matching
      if (!ignored.rule_id || !suggestion.ruleId) {
        // Check position proximity (within 20 characters)
        const positionDiff = Math.abs(ignored.position_start - suggestion.from)
        if (positionDiff <= 20) {
          return true
        }
        
        // Check context similarity
        const beforeSimilarity = calculateSimilarity(ignored.context_before || '', context.before)
        const afterSimilarity = calculateSimilarity(ignored.context_after || '', context.after)
        const avgSimilarity = (beforeSimilarity + afterSimilarity) / 2
        
        if (avgSimilarity > 0.7) { // 70% context similarity threshold
          return true
        }
      }
    }
  }
  
  return false
}

/**
 * Filter suggestions by removing ignored ones
 */
export function filterIgnoredSuggestions(
  suggestions: (GrammarSuggestion & { from: number; to: number })[],
  originalText: string,
  ignoredList: IgnoredSuggestion[]
): (GrammarSuggestion & { from: number; to: number })[] {
  if (ignoredList.length === 0) return suggestions
  
  return suggestions.filter(suggestion => 
    !shouldIgnoreSuggestion(suggestion, originalText, ignoredList)
  )
}

/**
 * Create an IgnoredSuggestion object from a grammar suggestion
 */
export function createIgnoredSuggestionData(
  suggestion: GrammarSuggestion & { from: number; to: number },
  originalText: string,
  documentId: string
): Omit<IgnoredSuggestion, 'id' | 'user_id' | 'ignored_at'> {
  const suggestionText = originalText.slice(suggestion.from, suggestion.to)
  const context = extractContext(originalText, suggestion.from, suggestion.to - suggestion.from)
  
  return {
    document_id: documentId,
    original_text: suggestionText,
    suggestion_type: suggestion.type,
    rule_id: suggestion.ruleId,
    position_start: suggestion.from,
    position_end: suggestion.to,
    context_before: context.before,
    context_after: context.after,
  }
} 