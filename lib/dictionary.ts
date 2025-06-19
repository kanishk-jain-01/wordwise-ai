import fs from 'fs'
import path from 'path'

/**
 * Dictionary service: loads a large English word list once (on first import)
 * and provides quick lookup + suggestion utilities.
 *
 * NOTE: This file is intended for Node.js runtime only (API routes / server components).
 * If you need dictionary access in the Edge runtime you must provide a different implementation.
 */
class DictionaryService {
  private words: Set<string> = new Set()
  private loaded = false
  private index: Map<string, string[]> = new Map() // first-letter index

  constructor() {
    this.load()
  }

  private load() {
    if (this.loaded) return

    const filePath = path.join(process.cwd(), 'lib/dictionaries/words_alpha.txt')
    if (!fs.existsSync(filePath)) {
      console.warn('[Dictionary] Word list not found at', filePath)
      this.loaded = true
      return
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    content.split(/\r?\n/).forEach(w => {
      const word = w.trim().toLowerCase()
      if (word) {
        this.words.add(word)
        const key = word[0]
        if (!this.index.has(key)) this.index.set(key, [])
        this.index.get(key)!.push(word)
      }
    })

    this.loaded = true
  }

  isValid(word: string): boolean {
    if (!this.loaded) this.load()
    return this.words.has(word.toLowerCase())
  }

  /**
   * Very small Levenshtein implementation for suggestions (distance <=2)
   */
  suggestions(input: string, limit = 5): string[] {
    if (!this.loaded) this.load()
    const word = input.toLowerCase()
    const first = word[0]

    // Prefer candidates that share first letter and similar length
    const candidates = this.index.get(first) ?? []
    const results: {w:string; d:number}[] = []

    const consider = (list: string[]) => {
      for (const cand of list) {
        if (Math.abs(cand.length - word.length) > 2) continue // length heuristic
        const d = levenshtein(word, cand)
        if (d>0 && d<=2) results.push({w:cand,d})
      }
    }

    // 1) primary candidate list
    consider(candidates)

    // 2) If not enough suggestions, broaden search (same length diff <=1 anywhere in dict)
    if (results.length < limit) {
      for (const cand of this.words) {
        if (results.find(r=>r.w===cand)) continue
        if (Math.abs(cand.length - word.length) > 1) continue
        const d = levenshtein(word, cand)
        if (d>0 && d<=2) results.push({w:cand,d})
        if (results.length >= limit*2) break
      }
    }

    return results
      .sort((a,b)=> a.d!==b.d ? a.d-b.d : a.w.localeCompare(b.w))
      .slice(0,limit)
      .map(r=>r.w)
  }
}

// Simple Levenshtein distance
function levenshtein(a:string,b:string){
  const m=a.length,n=b.length
  const dp=new Array(m+1).fill(0).map(()=>new Array(n+1).fill(0))
  for(let i=0;i<=m;i++) dp[i][0]=i
  for(let j=0;j<=n;j++) dp[0][j]=j
  for(let i=1;i<=m;i++){
    for(let j=1;j<=n;j++){
      const cost=a[i-1]==b[j-1]?0:1
      dp[i][j]=Math.min(dp[i-1][j]+1,dp[i][j-1]+1,dp[i-1][j-1]+cost)
    }
  }
  return dp[m][n]
}

let singleton: DictionaryService | null = null
export function getDictionary(){
  if(!singleton) singleton=new DictionaryService()
  return singleton
} 