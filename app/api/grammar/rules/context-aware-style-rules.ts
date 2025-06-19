import { StyleRule } from './style-rules'
import { getSentencePosition, isCompleteSentence, buildContextMetadata, ContextMetadata } from '../../../../lib/grammar-context'
import { validateSuggestion, SuggestionValidation } from '../../../../lib/grammar-validation'

export interface GrammarContext {
  fullText: string
  matchStart: number
  matchEnd: number
  beforeContext: string
  afterContext: string
  sentencePosition: string
  isCompleteSentence: boolean
}

export interface ContextAwareStyleRule extends Omit<StyleRule, 'replacement'> {
  contextAwareReplacement: (match: string, context: GrammarContext) => string | null
  riskLevel: 'safe' | 'moderate' | 'risky'
  requiresValidation: boolean
}

/**
 * Enhanced style rules that use context analysis to prevent problematic suggestions
 * These replace the simple pattern-matching rules with intelligent, context-aware versions
 */
export const contextAwareStyleRules: ContextAwareStyleRule[] = [
  // Enhanced "there are many" rule - prevents sentence fragments
  {
    id: "there-are-many-contextual",
    pattern: /\bthere\s+are\s+many\b/gi,
    type: "style",
    message: "Weak sentence starter. Consider more direct phrasing.",
    shortMessage: "Strengthen opening",
    category: "weak-opening",
    confidence: 0.7,
    riskLevel: 'risky',
    requiresValidation: true,
    contextAwareReplacement: (match: string, context: GrammarContext) => {
      const position = getSentencePosition(context.fullText, context.matchStart)
      
      // Only suggest "Many" if it's at the start of a sentence AND the sentence would remain complete
      if (position === 'start') {
        const beforeMatch = context.fullText.substring(0, context.matchStart)
        const afterMatch = context.fullText.substring(context.matchEnd)
        const newSentence = beforeMatch + "Many" + afterMatch
        
        // Extract the sentence that would be created
        const sentences = context.fullText.split(/[.!?]+/)
        const currentSentenceIndex = sentences.findIndex(s => s.toLowerCase().includes(match.toLowerCase()))
        
        if (currentSentenceIndex >= 0) {
          const originalSentence = sentences[currentSentenceIndex]
          const newSentenceText = originalSentence.replace(/there\s+are\s+many/gi, "Many")
          
          // Check if the new sentence would be complete
          if (isCompleteSentence(newSentenceText.trim())) {
            return "Many"
          }
        }
      }
      
      // If not safe to replace, don't suggest anything
      return null
    }
  },

  // Enhanced "a lot of" rule - considers grammatical agreement
  {
    id: "a-lot-of-contextual",
    pattern: /\ba\s+lot\s+of\b/gi,
    type: "style",
    message: 'Consider more precise quantifiers based on context.',
    shortMessage: "Be more precise",
    category: "vague",
    confidence: 0.7,
    riskLevel: 'moderate',
    requiresValidation: true,
    contextAwareReplacement: (match: string, context: GrammarContext) => {
      // Look at the word that follows "a lot of"
      const afterMatch = context.fullText.substring(context.matchEnd).trim()
      const nextWord = afterMatch.split(/\s+/)[0]?.toLowerCase()
      
      if (!nextWord) return null
      
      // Only suggest changes for clearly countable plural nouns where "many" is much better
      // For plural countable nouns, suggest "many"
      if (nextWord.endsWith('s') || nextWord.endsWith('es')) {
        // Common plural nouns where "many" is clearly better than "a lot of"
        const clearlyCountablePlurals = [
          'issues', 'problems', 'questions', 'ideas', 'options', 'choices', 
          'opportunities', 'challenges', 'benefits', 'advantages', 'features',
          'improvements', 'changes', 'mistakes', 'errors', 'bugs', 'files',
          'documents', 'reports', 'emails', 'messages', 'notifications',
          'users', 'customers', 'clients', 'people', 'items', 'things',
          'requests', 'suggestions', 'recommendations', 'solutions'
        ]
        
        if (clearlyCountablePlurals.includes(nextWord)) {
          return "many"
        }
      }
      
      // For singular nouns that are commonly pluralized, suggest "many" cautiously
      const commonPluralizable = [
        'issue', 'problem', 'question', 'idea', 'option', 'choice', 'opportunity',
        'challenge', 'benefit', 'advantage', 'feature', 'improvement', 'change',
        'mistake', 'error', 'bug', 'file', 'document', 'report', 'email',
        'message', 'notification', 'user', 'customer', 'client', 'person',
        'item', 'thing', 'request', 'suggestion', 'recommendation', 'solution'
      ]
      
      if (commonPluralizable.includes(nextWord)) {
        return "many"
      }
      
      // For uncountable nouns and ambiguous cases, don't suggest anything
      // "A lot of" is perfectly acceptable and often more natural
      return null
    }
  },

  // Enhanced "it is important" rule - preserves sentence structure
  {
    id: "it-is-important-contextual",
    pattern: /\bit\s+is\s+important\s+to\s+note\s+that\b/gi,
    type: "style",
    message: "Wordy phrase. State the important point directly.",
    shortMessage: "Be more direct",
    category: "weak-opening",
    confidence: 0.8,
    riskLevel: 'moderate',
    requiresValidation: true,
    contextAwareReplacement: (match: string, context: GrammarContext) => {
      const position = getSentencePosition(context.fullText, context.matchStart)
      
      // Only remove if it's at the start of a sentence and what follows makes sense
      if (position === 'start') {
        const afterMatch = context.fullText.substring(context.matchEnd).trim()
        
        // Check if removing the phrase would leave a complete sentence
        if (afterMatch && afterMatch.length > 10) {
          // Capitalize the first letter of what remains
          return afterMatch.charAt(0).toUpperCase() + afterMatch.slice(1)
        }
      }
      
      return null
    }
  },

  // Enhanced "basically" rule - considers sentence flow
  {
    id: "basically-contextual",
    pattern: /\bbasically,?\s+/gi,
    type: "style",
    message: '"Basically" is often unnecessary filler.',
    shortMessage: "Remove filler word",
    category: "filler",
    confidence: 0.8,
    riskLevel: 'safe',
    requiresValidation: false,
    contextAwareReplacement: (match: string, context: GrammarContext) => {
      // Safe to remove in most contexts, but preserve punctuation
      const hasComma = match.includes(',')
      return hasComma ? ", " : " "
    }
  },

  // Enhanced "very + adjective" rule - context-aware strength assessment
  {
    id: "very-adjective-contextual",
    pattern: /\bvery\s+(good|bad|big|small|important|difficult|easy|interesting|nice|great)\b/gi,
    type: "style",
    message: 'Consider stronger, more specific adjectives.',
    shortMessage: "Strengthen language",
    category: "adverb-overuse",
    confidence: 0.7,
    riskLevel: 'safe',
    requiresValidation: false,
    contextAwareReplacement: (match: string, context: GrammarContext) => {
      const adjective = match.replace(/very\s+/i, '').toLowerCase()
      
      const strongerAdjectives: Record<string, string> = {
        'good': 'excellent',
        'bad': 'terrible',
        'big': 'enormous',
        'small': 'tiny',
        'important': 'crucial',
        'difficult': 'challenging',
        'easy': 'simple',
        'interesting': 'fascinating',
        'nice': 'wonderful',
        'great': 'outstanding'
      }
      
      return strongerAdjectives[adjective] || adjective
    }
  },

  // Enhanced "make a decision" rule - safe nominalization fix
  {
    id: "make-decision-contextual",
    pattern: /\bmake\s+a\s+decision\b/gi,
    type: "style",
    message: 'More concise: use "decide".',
    shortMessage: 'Use "decide"',
    category: "nominalization",
    confidence: 0.8,
    riskLevel: 'safe',
    requiresValidation: false,
    contextAwareReplacement: (match: string, context: GrammarContext) => {
      // This is generally safe - "make a decision" -> "decide"
      return "decide"
    }
  },

  // Enhanced "give consideration to" rule
  {
    id: "give-consideration-contextual",
    pattern: /\bgive\s+consideration\s+to\b/gi,
    type: "style",
    message: 'More concise: use "consider".',
    shortMessage: 'Use "consider"',
    category: "nominalization",
    confidence: 0.9,
    riskLevel: 'safe',
    requiresValidation: false,
    contextAwareReplacement: (match: string, context: GrammarContext) => {
      return "consider"
    }
  },

  // Enhanced "conduct analysis" rule
  {
    id: "conduct-analysis-contextual",
    pattern: /\bconduct\s+an?\s+analysis\b/gi,
    type: "style",
    message: 'More concise: use "analyze".',
    shortMessage: 'Use "analyze"',
    category: "nominalization",
    confidence: 0.9,
    riskLevel: 'safe',
    requiresValidation: false,
    contextAwareReplacement: (match: string, context: GrammarContext) => {
      return "analyze"
    }
  }
]

/**
 * Process text with context-aware style rules
 * This function applies the enhanced rules and validates suggestions before returning them
 */
export async function processWithContextAwareStyleRules(
  text: string,
  rules: ContextAwareStyleRule[] = contextAwareStyleRules
): Promise<Array<{
  rule: ContextAwareStyleRule
  match: string
  start: number
  end: number
  suggestion: string
  validation?: SuggestionValidation
}>> {
  const suggestions = []
  
  for (const rule of rules) {
    const matches = Array.from(text.matchAll(rule.pattern))
    
    for (const match of matches) {
      if (!match.index) continue
      
      const matchStart = match.index
      const matchEnd = match.index + match[0].length
      
      // Build context for this match
      const metadata = buildContextMetadata(text, matchStart, matchEnd)
      const context: GrammarContext = {
        fullText: text,
        matchStart,
        matchEnd,
        beforeContext: text.substring(Math.max(0, matchStart - 50), matchStart),
        afterContext: text.substring(matchEnd, Math.min(text.length, matchEnd + 50)),
        sentencePosition: metadata.sentencePosition,
        isCompleteSentence: metadata.sentenceBoundary.isComplete
      }
      
      // Get context-aware replacement
      const suggestion = rule.contextAwareReplacement(match[0], context)
      
      if (suggestion === null) {
        // Rule decided not to suggest anything for this context
        continue
      }
      
      let validation: SuggestionValidation | undefined
      
      // Validate risky suggestions
      if (rule.requiresValidation) {
        validation = await validateSuggestion({
          originalText: text,
          matchStart,
          matchEnd,
          replacement: suggestion,
          rule: {
            id: rule.id,
            category: rule.category,
            confidence: rule.confidence
          }
        })
        
        // Skip suggestions that failed validation
        if (validation.risk === 'RISKY' && validation.confidence < 0.6) {
          continue
        }
      }
      
      suggestions.push({
        rule,
        match: match[0],
        start: matchStart,
        end: matchEnd,
        suggestion,
        validation
      })
    }
  }
  
  return suggestions
}

/**
 * Convert context-aware suggestions to the format expected by the existing grammar engine
 */
export function convertToGrammarSuggestions(
  contextAwareSuggestions: Awaited<ReturnType<typeof processWithContextAwareStyleRules>>
) {
  return contextAwareSuggestions.map(({ rule, match, start, end, suggestion, validation }) => ({
    id: `${rule.id}-${start}`,
    type: rule.type,
    message: rule.message,
    shortMessage: rule.shortMessage,
    category: rule.category,
    confidence: validation ? validation.confidence : rule.confidence,
    start,
    end,
    text: match,
    replacement: suggestion,
    ruleId: rule.id,
    // Add validation metadata
    validated: !!validation,
    validationRisk: validation?.risk,
    validationReasons: validation?.reasons
  }))
} 