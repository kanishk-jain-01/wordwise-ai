import { spellingRules } from './spelling-rules'
import type { GrammarError } from './grammar-engine'
import { getDictionary } from '@/lib/dictionary'
import { getEnhancedSpellingEngine } from '@/lib/enhanced-spelling-engine'

export interface EnhancedSpellingResult {
  errors: GrammarError[]
  stats: {
    wordsChecked: number
    ruleBasedErrors: number
    dictionaryErrors: number
  }
}

export class EnhancedSpellingChecker {
  private dictionary = getDictionary()
  private enhancedEngine = getEnhancedSpellingEngine()

  checkSpelling(text: string): EnhancedSpellingResult {
    const errors: GrammarError[] = []

    // Regex rule-based
    const ruleErrors = this.applyRegexRules(text)
    errors.push(...ruleErrors)

    // Enhanced dictionary check with improved suggestions
    const dictErrors = this.applyEnhancedDictionary(text, errors)
    errors.push(...dictErrors)

    return {
      errors,
      stats: {
        wordsChecked: this.countWords(text),
        ruleBasedErrors: ruleErrors.length,
        dictionaryErrors: dictErrors.length
      }
    }
  }

  private applyRegexRules(text:string): GrammarError[] {
    const result: GrammarError[] = []
    for(const rule of spellingRules){
      rule.pattern.lastIndex = 0
      let m: RegExpExecArray | null
      while((m = rule.pattern.exec(text)) !== null){
        const offset=m.index
        const len=m[0].length
        const ctxStart=Math.max(0,offset-30)
        const ctxEnd=Math.min(text.length,offset+len+30)
        result.push({
          type:'spelling',
          ruleId:rule.id,
          message:rule.message,
          shortMessage:rule.shortMessage,
          category:rule.category,
          confidence:rule.confidence,
          offset,
          length:len,
          text:m[0],
          replacement:rule.replacement,
          context:text.slice(ctxStart,ctxEnd),
          examples:rule.examples
        })
        if(!rule.pattern.global) break
      }
    }
    return result
  }

  private applyEnhancedDictionary(text: string, existing: GrammarError[]): GrammarError[] {
    const res: GrammarError[] = []
    const regex = /\b[a-zA-Z]{3,}\b/g
    let m: RegExpExecArray | null
    
    while ((m = regex.exec(text)) !== null) {
      const word = m[0]
      const offset = m.index
      
      // Skip overlaps with existing errors
      if (existing.some(e => offset >= e.offset && offset < e.offset + e.length)) continue
      
      if (!this.dictionary.isValid(word)) {
        // Extract context words for better suggestions
        const contextWords = this.extractContextWords(text, offset, word.length)
        
        // Get enhanced suggestions using multi-stage ranking
        const suggestions = this.enhancedEngine.getEnhancedSuggestions(word, {
          maxSuggestions: 3,
          contextWords,
          minConfidence: 0.3
        })
        
        const ctxStart = Math.max(0, offset - 30)
        const ctxEnd = Math.min(text.length, offset + word.length + 30)
        
        // Calculate confidence based on suggestion quality
        const confidence = this.calculateSuggestionConfidence(word, suggestions)
        
        res.push({
          type: 'spelling',
          ruleId: 'dictionary-enhanced',
          message: `"${word}" may be misspelled.`,
          shortMessage: suggestions.length > 0 ? `Try "${suggestions[0]}"` : 'Check spelling',
          category: 'dictionary',
          confidence,
          offset,
          length: word.length,
          text: word,
          replacement: suggestions[0] ?? word,
          context: text.slice(ctxStart, ctxEnd),
          // Include all suggestions for the frontend to display
          suggestions: suggestions.slice(0, 3)
        })
      }
    }
    
    return res
  }

  /**
   * Extract context words around the misspelled word for better suggestions
   */
  private extractContextWords(text: string, offset: number, wordLength: number): string[] {
    const contextWords: string[] = []
    const wordRegex = /\b[a-zA-Z]+\b/g
    
    // Look for words before and after the current word
    const beforeText = text.slice(Math.max(0, offset - 50), offset)
    const afterText = text.slice(offset + wordLength, Math.min(text.length, offset + wordLength + 50))
    
    // Extract words from before context
    let match
    const beforeMatches: string[] = []
    wordRegex.lastIndex = 0
    while ((match = wordRegex.exec(beforeText)) !== null) {
      beforeMatches.push(match[0].toLowerCase())
    }
    // Take the last 2 words before
    contextWords.push(...beforeMatches.slice(-2))
    
    // Extract words from after context
    wordRegex.lastIndex = 0
    let afterCount = 0
    while ((match = wordRegex.exec(afterText)) !== null && afterCount < 2) {
      contextWords.push(match[0].toLowerCase())
      afterCount++
    }
    
    return contextWords
  }

  /**
   * Calculate confidence score based on suggestion quality
   */
  private calculateSuggestionConfidence(originalWord: string, suggestions: string[]): number {
    if (suggestions.length === 0) return 0.3
    
    const bestSuggestion = suggestions[0]
    let confidence = 0.6 // Base confidence
    
    // Boost confidence for high-frequency words
    const commonWords = ['what', 'where', 'when', 'why', 'how', 'who', 'which', 'that', 'this']
    if (commonWords.includes(bestSuggestion.toLowerCase())) {
      confidence += 0.2
    }
    
    // Boost confidence for single character differences
    if (Math.abs(originalWord.length - bestSuggestion.length) <= 1) {
      confidence += 0.1
    }
    
    // Boost confidence if we have multiple good suggestions
    if (suggestions.length >= 2) {
      confidence += 0.1
    }
    
    return Math.min(0.95, confidence)
  }

  private countWords(text:string){
    const matches=text.match(/\b[a-zA-Z]{3,}\b/g)
    return matches?matches.length:0
  }
} 