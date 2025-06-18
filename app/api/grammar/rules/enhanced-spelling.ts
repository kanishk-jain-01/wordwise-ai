import { spellingRules } from './spelling-rules'
import type { GrammarError } from './grammar-engine'
import { getDictionary } from '@/lib/dictionary'

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

  checkSpelling(text: string): EnhancedSpellingResult {
    const errors: GrammarError[] = []

    // Regex rule-based
    const ruleErrors = this.applyRegexRules(text)
    errors.push(...ruleErrors)

    // Dictionary check
    const dictErrors = this.applyDictionary(text, errors)
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

  private applyDictionary(text:string, existing:GrammarError[]): GrammarError[] {
    const res: GrammarError[] = []
    const regex=/\b[a-zA-Z]{3,}\b/g
    let m:RegExpExecArray|null
    while((m=regex.exec(text))!==null){
      const word=m[0]
      const offset=m.index
      // skip overlaps with existing errors
      if(existing.some(e=>offset>=e.offset && offset<e.offset+e.length)) continue
      if(!this.dictionary.isValid(word)){
        const sugg=this.dictionary.suggestions(word,3)
        const ctxStart=Math.max(0,offset-30)
        const ctxEnd=Math.min(text.length,offset+word.length+30)
        res.push({
          type:'spelling',
          ruleId:'dictionary',
          message:`${word} may be misspelled.`,
          shortMessage:sugg.length?`Try "${sugg[0]}"`:'Check spelling',
          category:'dictionary',
          confidence:0.6,
          offset,
          length:word.length,
          text:word,
          replacement:sugg[0]??word,
          context:text.slice(ctxStart,ctxEnd)
        })
      }
    }
    return res
  }

  private countWords(text:string){
    const matches=text.match(/\b[a-zA-Z]{3,}\b/g)
    return matches?matches.length:0
  }
} 