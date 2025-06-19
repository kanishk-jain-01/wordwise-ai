/**
 * Enhanced Spelling Engine with Multi-Stage Ranking
 * 
 * Features:
 * - Frequency-weighted suggestions
 * - Keyboard distance awareness
 * - Phonetic similarity matching
 * - Context-aware n-gram analysis
 * - Confidence scoring and filtering
 */

import { getDictionary } from './dictionary'

// QWERTY keyboard layout for distance calculations
const QWERTY_LAYOUT = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
]

// Common English word frequencies (top 10k most frequent words)
// This is a simplified version - in production, use a comprehensive frequency corpus
const WORD_FREQUENCIES: Record<string, number> = {
  // Ultra high frequency (10000+)
  'the': 10000, 'be': 9500, 'to': 9000, 'of': 8500, 'and': 8000,
  'a': 7500, 'in': 7000, 'that': 6500, 'have': 6000, 'i': 5500,
  'it': 5000, 'for': 4800, 'not': 4600, 'on': 4400, 'with': 4200,
  'he': 4000, 'as': 3800, 'you': 3600, 'do': 3400, 'at': 3200,
  
  // Very high frequency (1000-3000)
  'this': 3000, 'but': 2800, 'his': 2600, 'by': 2400, 'from': 2200,
  'they': 2000, 'we': 1900, 'say': 1800, 'her': 1700, 'she': 1600,
  'or': 1500, 'an': 1400, 'will': 1300, 'my': 1200, 'one': 1100,
  'all': 1000, 'would': 950, 'there': 900, 'their': 850, 'what': 800,
  
  // High frequency (100-800)
  'so': 750, 'up': 700, 'out': 650, 'if': 600, 'about': 550,
  'who': 500, 'get': 450, 'which': 400, 'go': 350, 'me': 300,
  'when': 280, 'make': 260, 'can': 240, 'like': 220, 'time': 200,
  'no': 190, 'just': 180, 'him': 170, 'know': 160, 'take': 150,
  'people': 140, 'into': 130, 'year': 120, 'your': 110, 'good': 100,
  
  // Common words that often get misspelled
  'because': 90, 'through': 85, 'could': 80, 'should': 75, 'while': 70,
  'where': 65, 'here': 60, 'how': 55, 'why': 50, 'way': 45,
  'come': 40, 'some': 38, 'work': 36, 'want': 34, 'thought': 32,
  'right': 30, 'write': 28, 'might': 26, 'night': 24, 'light': 22,
  'water': 20, 'after': 18, 'before': 16, 'other': 14, 'another': 12
}

// Common n-grams for context awareness
const COMMON_BIGRAMS: Record<string, string[]> = {
  'what': ['is', 'are', 'was', 'were', 'do', 'does', 'did', 'about', 'if', 'when'],
  'how': ['are', 'is', 'do', 'does', 'can', 'could', 'would', 'to', 'about', 'much'],
  'where': ['is', 'are', 'was', 'were', 'do', 'does', 'did', 'to', 'can'],
  'when': ['is', 'are', 'was', 'were', 'do', 'does', 'did', 'to', 'can'],
  'why': ['is', 'are', 'was', 'were', 'do', 'does', 'did', 'not', 'would'],
  'who': ['is', 'are', 'was', 'were', 'do', 'does', 'did', 'can', 'would']
}

interface SuggestionCandidate {
  word: string
  editDistance: number
  frequencyScore: number
  keyboardScore: number
  phoneticScore: number
  contextScore: number
  finalScore: number
  confidence: number
}

interface EnhancedSuggestionOptions {
  maxSuggestions?: number
  includePhonetic?: boolean
  contextWords?: string[]
  minConfidence?: number
}

export class EnhancedSpellingEngine {
  private dictionary = getDictionary()
  private keyboardDistanceCache = new Map<string, number>()

  /**
   * Generate enhanced spelling suggestions with multi-stage ranking
   */
  getEnhancedSuggestions(
    word: string, 
    options: EnhancedSuggestionOptions = {}
  ): string[] {
    const {
      maxSuggestions = 5,
      includePhonetic = true,
      contextWords = [],
      minConfidence = 0.3
    } = options

    const normalizedWord = word.toLowerCase()
    
    // Stage 1: Generate candidate suggestions
    const candidates = this.generateCandidates(normalizedWord)
    
    // Stage 2: Score each candidate across multiple dimensions
    const scoredCandidates = candidates.map(candidate => 
      this.scoreSuggestion(normalizedWord, candidate, contextWords, includePhonetic)
    )
    
    // Stage 3: Filter by confidence and sort by final score
    const filteredCandidates = scoredCandidates
      .filter(candidate => candidate.confidence >= minConfidence)
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, maxSuggestions)
    
    return filteredCandidates.map(candidate => candidate.word)
  }

  /**
   * Generate initial candidate suggestions using multiple strategies
   */
  private generateCandidates(word: string): string[] {
    const candidates = new Set<string>()
    
    // Strategy 1: Dictionary suggestions (existing Levenshtein)
    const dictSuggestions = this.dictionary.suggestions(word, 10)
    dictSuggestions.forEach(suggestion => candidates.add(suggestion))
    
    // Strategy 2: Common substitutions for frequent typos
    const substitutions = this.generateSubstitutions(word)
    substitutions.forEach(suggestion => candidates.add(suggestion))
    
    // Strategy 3: Keyboard-aware variations
    const keyboardVariations = this.generateKeyboardVariations(word)
    keyboardVariations.forEach(suggestion => candidates.add(suggestion))
    
    return Array.from(candidates).filter(candidate => 
      this.dictionary.isValid(candidate) && candidate !== word
    )
  }

  /**
   * Score a suggestion candidate across multiple dimensions
   */
  private scoreSuggestion(
    originalWord: string,
    candidate: string,
    contextWords: string[],
    includePhonetic: boolean
  ): SuggestionCandidate {
    const editDistance = this.calculateEditDistance(originalWord, candidate)
    const frequencyScore = this.calculateFrequencyScore(candidate)
    const keyboardScore = this.calculateKeyboardScore(originalWord, candidate)
    const phoneticScore = includePhonetic ? this.calculatePhoneticScore(originalWord, candidate) : 0
    const contextScore = this.calculateContextScore(candidate, contextWords)
    
    // Weighted combination of scores
    const finalScore = (
      (1 / (editDistance + 1)) * 0.3 +  // Lower edit distance = higher score
      frequencyScore * 0.25 +           // Word frequency
      keyboardScore * 0.2 +             // Keyboard proximity
      phoneticScore * 0.15 +            // Phonetic similarity
      contextScore * 0.1                // Context relevance
    )
    
    // Calculate confidence based on multiple factors
    const confidence = Math.min(1.0, finalScore * (editDistance <= 1 ? 1.2 : 0.8))
    
    return {
      word: candidate,
      editDistance,
      frequencyScore,
      keyboardScore,
      phoneticScore,
      contextScore,
      finalScore,
      confidence
    }
  }

  /**
   * Calculate edit distance with weighted operations
   */
  private calculateEditDistance(word1: string, word2: string): number {
    const m = word1.length
    const n = word2.length
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))
    
    // Initialize base cases
    for (let i = 0; i <= m; i++) dp[i][0] = i
    for (let j = 0; j <= n; j++) dp[0][j] = j
    
    // Fill the dp table with weighted costs
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (word1[i - 1] === word2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1]
        } else {
          const substitutionCost = this.getSubstitutionCost(word1[i - 1], word2[j - 1])
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1.2,      // Deletion (slightly more expensive)
            dp[i][j - 1] + 1.2,      // Insertion (slightly more expensive)
            dp[i - 1][j - 1] + substitutionCost  // Substitution (variable cost)
          )
        }
      }
    }
    
    return dp[m][n]
  }

  /**
   * Calculate substitution cost based on keyboard proximity
   */
  private getSubstitutionCost(char1: string, char2: string): number {
    const keyboardDistance = this.getKeyboardDistance(char1, char2)
    // Adjacent keys have lower substitution cost
    return keyboardDistance <= 1 ? 0.8 : 1.0
  }

  /**
   * Calculate frequency-based score
   */
  private calculateFrequencyScore(word: string): number {
    const frequency = WORD_FREQUENCIES[word.toLowerCase()] || 1
    // Normalize to 0-1 range with logarithmic scaling
    return Math.min(1.0, Math.log10(frequency + 1) / 4)
  }

  /**
   * Calculate keyboard proximity score
   */
  private calculateKeyboardScore(originalWord: string, candidate: string): number {
    if (originalWord.length !== candidate.length) {
      return 0.5 // Neutral score for length differences
    }
    
    let totalDistance = 0
    let differences = 0
    
    for (let i = 0; i < Math.min(originalWord.length, candidate.length); i++) {
      if (originalWord[i] !== candidate[i]) {
        totalDistance += this.getKeyboardDistance(originalWord[i], candidate[i])
        differences++
      }
    }
    
    if (differences === 0) return 1.0
    
    const avgDistance = totalDistance / differences
    // Convert distance to score (closer = higher score)
    return Math.max(0, 1 - (avgDistance / 5))
  }

  /**
   * Get keyboard distance between two characters
   */
  private getKeyboardDistance(char1: string, char2: string): number {
    const key = `${char1}-${char2}`
    if (this.keyboardDistanceCache.has(key)) {
      return this.keyboardDistanceCache.get(key)!
    }
    
    const pos1 = this.getKeyPosition(char1.toLowerCase())
    const pos2 = this.getKeyPosition(char2.toLowerCase())
    
    if (!pos1 || !pos2) {
      this.keyboardDistanceCache.set(key, 10)
      return 10 // High distance for non-keyboard chars
    }
    
    const distance = Math.abs(pos1.row - pos2.row) + Math.abs(pos1.col - pos2.col)
    this.keyboardDistanceCache.set(key, distance)
    return distance
  }

  /**
   * Get position of a key on QWERTY layout
   */
  private getKeyPosition(char: string): { row: number; col: number } | null {
    for (let row = 0; row < QWERTY_LAYOUT.length; row++) {
      const col = QWERTY_LAYOUT[row].indexOf(char)
      if (col !== -1) {
        return { row, col }
      }
    }
    return null
  }

  /**
   * Calculate phonetic similarity score using simplified Soundex-like algorithm
   */
  private calculatePhoneticScore(word1: string, word2: string): number {
    const phonetic1 = this.getPhoneticCode(word1)
    const phonetic2 = this.getPhoneticCode(word2)
    
    if (phonetic1 === phonetic2) return 1.0
    
    // Calculate similarity based on common phonetic patterns
    let matches = 0
    const minLength = Math.min(phonetic1.length, phonetic2.length)
    
    for (let i = 0; i < minLength; i++) {
      if (phonetic1[i] === phonetic2[i]) matches++
    }
    
    return matches / Math.max(phonetic1.length, phonetic2.length)
  }

  /**
   * Generate simplified phonetic code
   */
  private getPhoneticCode(word: string): string {
    return word.toLowerCase()
      .replace(/[aeiou]/g, '') // Remove vowels
      .replace(/[ck]/g, 'k')   // C and K sound the same
      .replace(/[sz]/g, 's')   // S and Z often confused
      .replace(/[pb]/g, 'p')   // P and B can sound similar
      .replace(/[td]/g, 't')   // T and D can sound similar
      .replace(/(.)\1+/g, '$1') // Remove duplicate consonants
  }

  /**
   * Calculate context relevance score based on n-grams
   */
  private calculateContextScore(candidate: string, contextWords: string[]): number {
    if (contextWords.length === 0) return 0.5 // Neutral score
    
    let maxScore = 0
    
    for (const contextWord of contextWords) {
      const bigramTargets = COMMON_BIGRAMS[candidate.toLowerCase()]
      if (bigramTargets && bigramTargets.includes(contextWord.toLowerCase())) {
        maxScore = Math.max(maxScore, 1.0)
      }
    }
    
    return maxScore
  }

  /**
   * Generate common character substitutions
   */
  private generateSubstitutions(word: string): string[] {
    const substitutions: string[] = []
    const commonSubs = [
      ['a', 'e'], ['e', 'a'], ['i', 'e'], ['e', 'i'], ['o', 'a'], ['a', 'o'],
      ['c', 'k'], ['k', 'c'], ['s', 'z'], ['z', 's'], ['f', 'ph'], ['ph', 'f']
    ]
    
    for (const [from, to] of commonSubs) {
      if (word.includes(from)) {
        const substituted = word.replace(new RegExp(from, 'g'), to)
        if (substituted !== word) {
          substitutions.push(substituted)
        }
      }
    }
    
    return substitutions
  }

  /**
   * Generate keyboard-aware character variations
   */
  private generateKeyboardVariations(word: string): string[] {
    const variations: string[] = []
    
    // Try adjacent key substitutions for each character
    for (let i = 0; i < word.length; i++) {
      const char = word[i].toLowerCase()
      const pos = this.getKeyPosition(char)
      
      if (pos) {
        // Check adjacent keys
        const adjacentPositions = [
          { row: pos.row - 1, col: pos.col },
          { row: pos.row + 1, col: pos.col },
          { row: pos.row, col: pos.col - 1 },
          { row: pos.row, col: pos.col + 1 }
        ]
        
        for (const adjPos of adjacentPositions) {
          if (adjPos.row >= 0 && adjPos.row < QWERTY_LAYOUT.length &&
              adjPos.col >= 0 && adjPos.col < QWERTY_LAYOUT[adjPos.row].length) {
            const adjacentChar = QWERTY_LAYOUT[adjPos.row][adjPos.col]
            const variation = word.substring(0, i) + adjacentChar + word.substring(i + 1)
            variations.push(variation)
          }
        }
      }
    }
    
    return variations
  }
}

// Export singleton instance
let enhancedSpellingEngine: EnhancedSpellingEngine | null = null

export function getEnhancedSpellingEngine(): EnhancedSpellingEngine {
  if (!enhancedSpellingEngine) {
    enhancedSpellingEngine = new EnhancedSpellingEngine()
  }
  return enhancedSpellingEngine
} 