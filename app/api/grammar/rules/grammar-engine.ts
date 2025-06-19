import { grammarRules, type GrammarRule } from './grammar-rules'
import { spellingRules, type SpellingRule } from './spelling-rules'
import { styleRules, type StyleRule } from './style-rules'
import { EnhancedSpellingChecker } from './enhanced-spelling'
import { enhancedStyleProcessor } from './enhanced-style-processor'
import { contextAwareRuleSelector } from './context-aware-rule-selector'

export type Rule = GrammarRule | SpellingRule | StyleRule

export interface GrammarSuggestion {
  id: string
  type: "grammar" | "spelling" | "style"
  message: string
  shortMessage: string
  category: string
  confidence: number
  start: number
  end: number
  text: string
  replacement: string
  ruleId?: string
  // Enhanced validation metadata
  validated?: boolean
  validationRisk?: 'SAFE' | 'MODERATE' | 'RISKY'
  validationReasons?: string[]
}

export interface GrammarError {
  type: 'grammar' | 'spelling' | 'style'
  ruleId: string
  message: string
  shortMessage: string
  category: string
  confidence: number
  offset: number
  length: number
  text: string
  replacement: string
  context: string
  examples?: {
    incorrect: string
    correct: string
  }[]
  suggestions?: string[] // Multiple suggestions for enhanced spelling
}

export interface GrammarCheckResult {
  errors: GrammarError[]
  stats: {
    totalChecks: number
    grammarErrors: number
    spellingErrors: number
    styleErrors: number
    processingTime: number
    enhancedSpelling?: {
      wordsChecked: number
      ruleBasedErrors: number
      dictionaryErrors: number
    }
  }
}

export class GrammarEngine {
  private allRules: Rule[]
  private enhancedSpellingChecker: EnhancedSpellingChecker
  private useEnhancedStyleRules: boolean
  
  constructor(options: { useEnhancedStyleRules?: boolean } = {}) {
    this.useEnhancedStyleRules = options.useEnhancedStyleRules ?? true
    
    // Filter out problematic style rules if using enhanced processing
    const filteredStyleRules = this.useEnhancedStyleRules 
      ? styleRules.filter(rule => !contextAwareRuleSelector.shouldUseContextAwareRule(rule.id))
      : styleRules
    
    this.allRules = [
      ...grammarRules,
      // Remove spelling rules from here - they're handled by enhanced spelling checker
      ...filteredStyleRules
    ]
    this.enhancedSpellingChecker = new EnhancedSpellingChecker()
  }

  /**
   * Check text for grammar, spelling, and style issues
   */
  async checkText(text: string): Promise<GrammarCheckResult> {
    const startTime = Date.now()
    const errors: GrammarError[] = []
    
    // Process grammar and non-problematic style rules
    for (const rule of this.allRules) {
      const ruleErrors = this.applyRule(text, rule)
      errors.push(...ruleErrors)
    }

    // Process enhanced style rules if enabled
    if (this.useEnhancedStyleRules) {
      try {
        const enhancedStyleSuggestions = await enhancedStyleProcessor.processStyleSuggestions(text)
        
        // Convert enhanced style suggestions to GrammarError format
        const enhancedStyleErrors = enhancedStyleSuggestions.map(suggestion => ({
          type: suggestion.type as 'grammar' | 'spelling' | 'style',
          ruleId: suggestion.ruleId || 'unknown',
          message: suggestion.message,
          shortMessage: suggestion.shortMessage,
          category: suggestion.category,
          confidence: suggestion.confidence,
          offset: suggestion.start,
          length: suggestion.end - suggestion.start,
          text: suggestion.text,
          replacement: suggestion.replacement,
          context: text.substring(
            Math.max(0, suggestion.start - 30), 
            Math.min(text.length, suggestion.end + 30)
          ),
          // Include validation metadata
          suggestions: [suggestion.replacement],
          validated: (suggestion as any).validated,
          validationRisk: (suggestion as any).validationRisk,
          validationReasons: (suggestion as any).validationReasons
        }))
        
        errors.push(...enhancedStyleErrors)
      } catch (error) {
        console.warn('Enhanced style processing failed, falling back to standard rules:', error)
        // Fallback: process problematic style rules with standard logic
        const problematicStyleRules = styleRules.filter(rule => 
          contextAwareRuleSelector.shouldUseContextAwareRule(rule.id)
        )
        for (const rule of problematicStyleRules) {
          const ruleErrors = this.applyRule(text, rule)
          errors.push(...ruleErrors)
        }
      }
    }

    // Process enhanced spelling check
    const spellingResult = this.enhancedSpellingChecker.checkSpelling(text)
    errors.push(...spellingResult.errors)

    // Sort errors by position
    errors.sort((a, b) => a.offset - b.offset)

    // Remove overlapping errors (keep highest confidence)
    const filteredErrors = this.removeOverlappingErrors(errors)

    const processingTime = Date.now() - startTime

    return {
      errors: filteredErrors,
      stats: {
        totalChecks: this.allRules.length + (this.useEnhancedStyleRules ? 1 : 0),
        grammarErrors: filteredErrors.filter(e => e.type === 'grammar').length,
        spellingErrors: filteredErrors.filter(e => e.type === 'spelling').length,
        styleErrors: filteredErrors.filter(e => e.type === 'style').length,
        processingTime,
        enhancedSpelling: {
          wordsChecked: spellingResult.stats.wordsChecked,
          ruleBasedErrors: spellingResult.stats.ruleBasedErrors,
          dictionaryErrors: spellingResult.stats.dictionaryErrors
        }
      }
    }
  }

  /**
   * Apply a single rule to text
   */
  private applyRule(text: string, rule: Rule): GrammarError[] {
    const errors: GrammarError[] = []
    let match: RegExpExecArray | null

    // Reset regex lastIndex to ensure consistent results
    rule.pattern.lastIndex = 0

    while ((match = rule.pattern.exec(text)) !== null) {
      const offset = match.index
      const matchedText = match[0]
      const length = matchedText.length

      // Generate replacement text
      let replacement: string
      if (typeof rule.replacement === 'function') {
        replacement = rule.replacement(matchedText)
      } else {
        replacement = rule.replacement
      }

      // Get context (30 characters before and after)
      const contextStart = Math.max(0, offset - 30)
      const contextEnd = Math.min(text.length, offset + length + 30)
      const context = text.substring(contextStart, contextEnd)

      errors.push({
        type: rule.type,
        ruleId: rule.id,
        message: rule.message,
        shortMessage: rule.shortMessage,
        category: rule.category,
        confidence: rule.confidence,
        offset,
        length,
        text: matchedText,
        replacement,
        context,
        examples: rule.examples
      })

      // Prevent infinite loops with global regex
      if (!rule.pattern.global) {
        break
      }
    }

    return errors
  }

  /**
   * Remove overlapping errors, keeping the one with highest confidence
   */
  private removeOverlappingErrors(errors: GrammarError[]): GrammarError[] {
    const filtered: GrammarError[] = []
    
    for (const error of errors) {
      const hasOverlap = filtered.some(existing => 
        this.doErrorsOverlap(error, existing)
      )
      
      if (!hasOverlap) {
        filtered.push(error)
      } else {
        // Replace existing error if this one has higher confidence
        const overlappingIndex = filtered.findIndex(existing => 
          this.doErrorsOverlap(error, existing)
        )
        
        if (overlappingIndex !== -1 && error.confidence > filtered[overlappingIndex].confidence) {
          filtered[overlappingIndex] = error
        }
      }
    }
    
    return filtered
  }

  /**
   * Check if two errors overlap in text position
   */
  private doErrorsOverlap(error1: GrammarError, error2: GrammarError): boolean {
    const end1 = error1.offset + error1.length
    const end2 = error2.offset + error2.length
    
    return !(end1 <= error2.offset || end2 <= error1.offset)
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: string): Rule[] {
    return this.allRules.filter(rule => rule.category === category)
  }

  /**
   * Get rules by type
   */
  getRulesByType(type: 'grammar' | 'spelling' | 'style'): Rule[] {
    return this.allRules.filter(rule => rule.type === type)
  }

  /**
   * Get all available categories
   */
  getCategories(): string[] {
    const categories = new Set(this.allRules.map(rule => rule.category))
    return Array.from(categories).sort()
  }

  /**
   * Get engine statistics
   */
  getStats() {
    return {
      totalRules: this.allRules.length,
      grammarRules: this.allRules.filter(rule => rule.type === 'grammar').length,
      spellingRules: this.allRules.filter(rule => rule.type === 'spelling').length,
      styleRules: this.allRules.filter(rule => rule.type === 'style').length,
      categories: this.getCategories().length
    }
  }
} 