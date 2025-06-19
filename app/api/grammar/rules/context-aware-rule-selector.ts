import { StyleRule } from './style-rules'
import { ContextAwareStyleRule, processWithContextAwareStyleRules } from './context-aware-style-rules'
import { GrammarSuggestion } from './grammar-engine'
import { buildContextMetadata } from '../../../../lib/grammar-context'
import { validateSuggestion } from '../../../../lib/grammar-validation'

/**
 * Rule selector that intelligently chooses between old and new style rules
 * This allows for gradual migration while ensuring problematic rules are fixed
 */
export class ContextAwareRuleSelector {
  // Rules that are problematic and should use context-aware versions
  private problematicRuleIds = [
    'there-are-many',
    'a-lot-of',
    'it-is-important',
    'basically',
    // Also include the contextual versions
    'there-are-many-contextual',
    'a-lot-of-contextual',
    'it-is-important-contextual',
    'basically-contextual'
  ]

  // Rules that are safe to use as-is
  private safeRuleIds = [
    'make-decision',
    'give-consideration',
    'conduct-analysis',
    'very-unique',
    'quite-perfect'
  ]

  /**
   * Determine if a rule should use context-aware processing
   */
  shouldUseContextAwareRule(ruleId: string): boolean {
    return this.problematicRuleIds.includes(ruleId)
  }

  /**
   * Process a specific rule with context awareness if needed
   */
  async processRule(
    rule: StyleRule,
    text: string,
    matchStart: number,
    matchEnd: number
  ): Promise<GrammarSuggestion | null> {
    
    if (this.shouldUseContextAwareRule(rule.id)) {
      // Use context-aware processing for problematic rules
      return this.processWithContextAwareness(rule, text, matchStart, matchEnd)
    } else {
      // Use standard processing for safe rules
      return this.processWithStandardLogic(rule, text, matchStart, matchEnd)
    }
  }

  /**
   * Process rule with context awareness
   */
  private async processWithContextAwareness(
    rule: StyleRule,
    text: string,
    matchStart: number,
    matchEnd: number
  ): Promise<GrammarSuggestion | null> {
    
    // Build context for this match
    const context = buildContextMetadata(text, matchStart, matchEnd)
    const matchText = text.substring(matchStart, matchEnd)

    // Apply context-aware logic based on rule type
    let suggestion: string | null = null

    switch (rule.id) {
      case 'there-are-many':
        suggestion = await this.processThereAreManyRule(matchText, context, text, matchStart, matchEnd)
        break
      
      case 'a-lot-of':
        suggestion = await this.processALotOfRule(matchText, context, text, matchStart, matchEnd)
        break
      
      case 'it-is-important':
        suggestion = await this.processItIsImportantRule(matchText, context, text, matchStart, matchEnd)
        break
      
      case 'basically':
        suggestion = await this.processBasicallyRule(matchText, context, text, matchStart, matchEnd)
        break
      
      default:
        // Fallback to standard processing
        suggestion = typeof rule.replacement === 'string' ? rule.replacement : rule.replacement(matchText)
    }

    if (suggestion === null) {
      return null
    }

    // Validate the suggestion
    const validation = await validateSuggestion({
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

    // Skip risky suggestions with low confidence
    if (validation.risk === 'RISKY' && validation.confidence < 0.6) {
      return null
    }

    return {
      id: `${rule.id}-${matchStart}`,
      type: rule.type,
      message: rule.message,
      shortMessage: rule.shortMessage,
      category: rule.category,
      confidence: validation.confidence,
      start: matchStart,
      end: matchEnd,
      text: matchText,
      replacement: suggestion,
      ruleId: rule.id
    }
  }

  /**
   * Process rule with standard logic (for safe rules)
   */
  private async processWithStandardLogic(
    rule: StyleRule,
    text: string,
    matchStart: number,
    matchEnd: number
  ): Promise<GrammarSuggestion | null> {
    
    const matchText = text.substring(matchStart, matchEnd)
    const suggestion = typeof rule.replacement === 'string' 
      ? rule.replacement 
      : rule.replacement(matchText)

    return {
      id: `${rule.id}-${matchStart}`,
      type: rule.type,
      message: rule.message,
      shortMessage: rule.shortMessage,
      category: rule.category,
      confidence: rule.confidence,
      start: matchStart,
      end: matchEnd,
      text: matchText,
      replacement: suggestion,
      ruleId: rule.id
    }
  }

  /**
   * Context-aware processing for "there are many" rule
   */
  private async processThereAreManyRule(
    matchText: string,
    context: any,
    fullText: string,
    matchStart: number,
    matchEnd: number
  ): Promise<string | null> {
    
    // Only suggest "Many" if it's at the start of a sentence AND the sentence would remain complete
    if (context.sentencePosition === 'start') {
      // Check if replacing would create a complete sentence
      const beforeMatch = fullText.substring(0, matchStart)
      const afterMatch = fullText.substring(matchEnd)
      const potentialSentence = beforeMatch + "Many" + afterMatch
      
      // Find the sentence boundaries
      const sentences = fullText.split(/[.!?]+/)
      const currentSentenceIndex = sentences.findIndex(s => 
        s.toLowerCase().includes(matchText.toLowerCase())
      )
      
      if (currentSentenceIndex >= 0) {
        const originalSentence = sentences[currentSentenceIndex]
        const newSentenceText = originalSentence.replace(/there\s+are\s+many/gi, "Many")
        
        // Use a simple heuristic: sentence should have a verb after "Many"
        const wordsAfterMany = newSentenceText.replace(/^Many\s+/i, '').split(/\s+/)
        const hasVerbAfter = wordsAfterMany.some(word => 
          ['are', 'is', 'were', 'was', 'have', 'has', 'do', 'does', 'will', 'would', 'can', 'could'].includes(word.toLowerCase())
        )
        
        if (hasVerbAfter) {
          return "Many"
        }
      }
    }
    
    return null // Don't suggest if it would create a fragment
  }

  /**
   * Context-aware processing for "a lot of" rule
   */
  private async processALotOfRule(
    matchText: string,
    context: any,
    fullText: string,
    matchStart: number,
    matchEnd: number
  ): Promise<string | null> {
    
    // Look at the word that follows "a lot of"
    const afterMatch = fullText.substring(matchEnd).trim()
    const nextWord = afterMatch.split(/\s+/)[0]?.toLowerCase()
    
    if (!nextWord) return null
    
    // Uncountable nouns that should use "much"
    const uncountableNouns = [
      'feedback', 'information', 'advice', 'research', 'work', 'time', 'money',
      'water', 'food', 'music', 'traffic', 'furniture', 'equipment', 'software',
      'data', 'content', 'progress', 'experience', 'knowledge', 'support',
      'help', 'news', 'homework', 'housework', 'paperwork'
    ]
    
    // Check if the next word is uncountable
    if (uncountableNouns.includes(nextWord)) {
      return "much"
    }
    
    // For plural countable nouns, suggest "many"
    if (nextWord.endsWith('s') || nextWord.endsWith('es')) {
      return "many"
    }
    
    // For singular nouns that are commonly used in plural, suggest "many"
    const commonPluralizable = [
      'issue', 'problem', 'question', 'idea', 'option', 'choice', 'opportunity',
      'challenge', 'benefit', 'advantage', 'feature', 'improvement', 'change',
      'person', 'people', 'user', 'customer', 'client', 'student', 'employee'
    ]
    
    if (commonPluralizable.includes(nextWord)) {
      return "many"
    }
    
    // Default to "much" for safety when uncertain
    return "much"
  }

  /**
   * Context-aware processing for "it is important" rule
   */
  private async processItIsImportantRule(
    matchText: string,
    context: any,
    fullText: string,
    matchStart: number,
    matchEnd: number
  ): Promise<string | null> {
    
    // Only remove if it's at the start of a sentence and what follows makes sense
    if (context.sentencePosition === 'start') {
      const afterMatch = fullText.substring(matchEnd).trim()
      
      // Check if removing the phrase would leave a complete sentence
      if (afterMatch && afterMatch.length > 10) {
        // Make sure the remaining text starts with a word (not punctuation)
        if (/^[a-zA-Z]/.test(afterMatch)) {
          return "" // Remove the phrase
        }
      }
    }
    
    return null // Don't suggest removal if it would break the sentence
  }

  /**
   * Context-aware processing for "basically" rule
   */
  private async processBasicallyRule(
    matchText: string,
    context: any,
    fullText: string,
    matchStart: number,
    matchEnd: number
  ): Promise<string | null> {
    
    // This is generally safe to remove, but preserve punctuation
    const hasComma = matchText.includes(',')
    
    if (context.sentencePosition === 'start') {
      return "" // Remove at start of sentence
    } else if (hasComma) {
      return ", " // Preserve comma if it was there
    } else {
      return " " // Preserve space
    }
  }

  /**
   * Get all problematic rule IDs
   */
  getProblematicRuleIds(): string[] {
    return [...this.problematicRuleIds]
  }

  /**
   * Get all safe rule IDs
   */
  getSafeRuleIds(): string[] {
    return [...this.safeRuleIds]
  }

  /**
   * Add a rule to the problematic list
   */
  addProblematicRule(ruleId: string): void {
    if (!this.problematicRuleIds.includes(ruleId)) {
      this.problematicRuleIds.push(ruleId)
    }
  }

  /**
   * Add a rule to the safe list
   */
  addSafeRule(ruleId: string): void {
    if (!this.safeRuleIds.includes(ruleId)) {
      this.safeRuleIds.push(ruleId)
    }
  }
}

// Export singleton instance
export const contextAwareRuleSelector = new ContextAwareRuleSelector() 