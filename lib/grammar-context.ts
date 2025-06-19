/**
 * Grammar Context Analysis Utilities
 * Provides sentence boundary detection, context extraction, and position mapping
 * for context-aware grammar and style suggestions.
 */

// Common abbreviations that shouldn't trigger sentence boundaries
const COMMON_ABBREVIATIONS = new Set([
  'dr', 'mr', 'mrs', 'ms', 'prof', 'vs', 'etc', 'inc', 'ltd', 'corp',
  'st', 'ave', 'blvd', 'rd', 'apt', 'no', 'vol', 'pp', 'ch', 'sec',
  'fig', 'ref', 'eg', 'ie', 'cf', 'al', 'ed', 'eds', 'rev', 'est',
  'approx', 'min', 'max', 'avg', 'temp', 'dept', 'govt', 'assn',
  'bros', 'co', 'jr', 'sr', 'phd', 'md', 'ba', 'ma', 'bs', 'ms'
]);

export enum SentencePosition {
  START = 'start',
  MIDDLE = 'middle', 
  END = 'end',
  STANDALONE = 'standalone'
}

export interface SentenceBoundary {
  start: number;
  end: number;
  text: string;
  isComplete: boolean;
  isFragment: boolean;
}

export interface ContextMetadata {
  sentencePosition: SentencePosition;
  sentenceBoundary: SentenceBoundary;
  paragraphStart: number;
  paragraphEnd: number;
  wordsBefore: string[];
  wordsAfter: string[];
}

/**
 * Split text into sentences with proper handling of abbreviations
 * Task 1.1.1: Implement regex-based sentence splitting with proper handling of abbreviations
 */
export function splitIntoSentences(text: string): SentenceBoundary[] {
  const sentences: SentenceBoundary[] = [];
  
  // Regex to match sentence endings, but be careful with abbreviations
  const sentencePattern = /([.!?]+)(\s+|$)/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;

  while ((match = sentencePattern.exec(text)) !== null) {
    const endPunctuation = match[1];
    const endPos = match.index + endPunctuation.length;
    
    // Check if this is likely an abbreviation
    const beforePunctuation = text.substring(Math.max(0, match.index - 10), match.index);
    const abbreviationMatch = beforePunctuation.match(/\b(\w+)$/);
    
    if (abbreviationMatch) {
      const possibleAbbrev = abbreviationMatch[1].toLowerCase();
      
      // Skip if this looks like an abbreviation
      if (COMMON_ABBREVIATIONS.has(possibleAbbrev)) {
        continue;
      }
      
      // Skip if it's a single letter followed by period (likely initial)
      if (possibleAbbrev.length === 1) {
        continue;
      }
    }

    // Extract the sentence text
    const sentenceText = text.substring(lastEnd, endPos).trim();
    
    if (sentenceText.length > 0) {
      const boundary: SentenceBoundary = {
        start: lastEnd,
        end: endPos,
        text: sentenceText,
        isComplete: isCompleteSentence(sentenceText),
        isFragment: isFragment(sentenceText)
      };
      
      sentences.push(boundary);
      lastEnd = endPos;
    }
  }

  // Handle any remaining text as a potential sentence/fragment
  if (lastEnd < text.length) {
    const remainingText = text.substring(lastEnd).trim();
    if (remainingText.length > 0) {
      sentences.push({
        start: lastEnd,
        end: text.length,
        text: remainingText,
        isComplete: isCompleteSentence(remainingText),
        isFragment: isFragment(remainingText)
      });
    }
  }

  return sentences;
}

/**
 * Task 1.1.2: Add support for detecting sentence fragments vs complete sentences
 */
export function isCompleteSentence(text: string): boolean {
  const trimmed = text.trim();
  
  // Must end with sentence punctuation
  if (!/[.!?]$/.test(trimmed)) {
    return false;
  }
  
  // Must have reasonable length (more than just punctuation)
  if (trimmed.length < 3) {
    return false;
  }
  
  // Basic check for subject-verb structure
  // This is a simplified heuristic - more sophisticated checking in later tasks
  const words = trimmed.toLowerCase().split(/\s+/);
  
  // Too short to be complete
  if (words.length < 2) {
    return false;
  }
  
  // Check for common sentence starters that indicate completeness
  const firstWord = words[0];
  const commonStarters = ['the', 'this', 'that', 'these', 'those', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their'];
  const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they'];
  const properNouns = /^[A-Z][a-z]+$/;
  
  if (commonStarters.includes(firstWord) || pronouns.includes(firstWord) || properNouns.test(words[0])) {
    return true;
  }
  
  return true; // Default to complete for now - will enhance in later tasks
}

/**
 * Task 1.1.2: Detect sentence fragments
 */
export function isFragment(text: string): boolean {
  const trimmed = text.trim();
  
  // Empty or very short text
  if (trimmed.length < 3) {
    return true;
  }
  
  // Doesn't end with sentence punctuation
  if (!/[.!?]$/.test(trimmed)) {
    return true;
  }
  
  // Check for fragment indicators
  const fragmentStarters = [
    'because', 'since', 'although', 'though', 'while', 'whereas',
    'if', 'unless', 'until', 'when', 'where', 'after', 'before',
    'as', 'than', 'that', 'which', 'who', 'whom', 'whose'
  ];
  
  const firstWord = trimmed.toLowerCase().split(/\s+/)[0];
  if (fragmentStarters.includes(firstWord)) {
    return true;
  }
  
  return !isCompleteSentence(text);
}

/**
 * Task 1.1.3: Handle edge cases like ellipses, multiple punctuation marks, and dialogue
 */
export function normalizeText(text: string): string {
  return text
    // Handle ellipses - treat as sentence enders
    .replace(/\.{3,}/g, '.')
    // Handle multiple punctuation marks
    .replace(/[!?]{2,}/g, '!')
    .replace(/[.!?]{2,}/g, '.')
    // Handle dialogue - preserve quotes but normalize punctuation
    .replace(/["']([^"']*)[.!?]+["']/g, '"$1."')
    // Clean up extra whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Task 1.1.4: Create function to determine if a position is at sentence start/middle/end
 */
export function getSentencePosition(text: string, offset: number): SentencePosition {
  const sentences = splitIntoSentences(text);
  
  for (const sentence of sentences) {
    if (offset >= sentence.start && offset <= sentence.end) {
      const relativePos = offset - sentence.start;
      const sentenceLength = sentence.end - sentence.start;
      
      // Consider first 10% as start, last 10% as end
      const startThreshold = Math.max(1, sentenceLength * 0.1);
      const endThreshold = sentenceLength * 0.9;
      
      if (relativePos <= startThreshold) {
        return SentencePosition.START;
      } else if (relativePos >= endThreshold) {
        return SentencePosition.END;
      } else {
        return SentencePosition.MIDDLE;
      }
    }
  }
  
  return SentencePosition.STANDALONE;
}

/**
 * Task 1.2.1: Create function to extract N words before/after a given position
 */
export function extractWordsAroundPosition(text: string, offset: number, wordCount: number = 3): {
  before: string[];
  after: string[];
} {
  const words = text.split(/\s+/);
  let currentPos = 0;
  let wordIndex = -1;
  
  // Find which word contains the offset
  for (let i = 0; i < words.length; i++) {
    const wordStart = currentPos;
    const wordEnd = currentPos + words[i].length;
    
    if (offset >= wordStart && offset <= wordEnd) {
      wordIndex = i;
      break;
    }
    
    currentPos = wordEnd + 1; // +1 for space
  }
  
  if (wordIndex === -1) {
    return { before: [], after: [] };
  }
  
  const before = words.slice(Math.max(0, wordIndex - wordCount), wordIndex);
  const after = words.slice(wordIndex + 1, wordIndex + 1 + wordCount);
  
  return { before, after };
}

/**
 * Task 1.2.2: Implement context window extraction with configurable sizes
 */
export function extractContextWindow(text: string, offset: number, length: number, windowSize: number = 50): {
  before: string;
  after: string;
  full: string;
} {
  const start = Math.max(0, offset - windowSize);
  const end = Math.min(text.length, offset + length + windowSize);
  
  const before = text.substring(start, offset);
  const after = text.substring(offset + length, end);
  const full = text.substring(start, end);
  
  return { before, after, full };
}

/**
 * Task 1.2.3: Add paragraph boundary detection for broader context
 */
export function findParagraphBoundaries(text: string, offset: number): {
  start: number;
  end: number;
  text: string;
} {
  // Find paragraph boundaries (double newlines or significant whitespace)
  const paragraphBreaks = /\n\s*\n/g;
  const breaks: number[] = [0];
  let match: RegExpExecArray | null;
  
  while ((match = paragraphBreaks.exec(text)) !== null) {
    breaks.push(match.index + match[0].length);
  }
  breaks.push(text.length);
  
  // Find which paragraph contains the offset
  for (let i = 0; i < breaks.length - 1; i++) {
    if (offset >= breaks[i] && offset < breaks[i + 1]) {
      return {
        start: breaks[i],
        end: breaks[i + 1],
        text: text.substring(breaks[i], breaks[i + 1]).trim()
      };
    }
  }
  
  // Fallback - treat entire text as one paragraph
  return {
    start: 0,
    end: text.length,
    text: text.trim()
  };
}

/**
 * Task 1.2.4: Build context metadata structure
 */
export function buildContextMetadata(text: string, offset: number, length: number): ContextMetadata {
  const sentencePosition = getSentencePosition(text, offset);
  const sentences = splitIntoSentences(text);
  
  // Find the sentence containing this offset
  let sentenceBoundary: SentenceBoundary | null = null;
  for (const sentence of sentences) {
    if (offset >= sentence.start && offset <= sentence.end) {
      sentenceBoundary = sentence;
      break;
    }
  }
  
  // Fallback if no sentence found
  if (!sentenceBoundary) {
    sentenceBoundary = {
      start: 0,
      end: text.length,
      text: text,
      isComplete: false,
      isFragment: true
    };
  }
  
  const paragraph = findParagraphBoundaries(text, offset);
  const surroundingWords = extractWordsAroundPosition(text, offset, 3);
  
  return {
    sentencePosition,
    sentenceBoundary,
    paragraphStart: paragraph.start,
    paragraphEnd: paragraph.end,
    wordsBefore: surroundingWords.before,
    wordsAfter: surroundingWords.after
  };
}

/**
 * Task 1.3.3: Add sentence boundary caching for performance optimization
 */
const sentenceBoundaryCache = new Map<string, SentenceBoundary[]>();

export function getCachedSentenceBoundaries(text: string): SentenceBoundary[] {
  // Create a simple hash of the text for caching
  const textHash = text.length + '_' + text.substring(0, 50) + '_' + text.substring(text.length - 50);
  
  if (sentenceBoundaryCache.has(textHash)) {
    return sentenceBoundaryCache.get(textHash)!;
  }
  
  const boundaries = splitIntoSentences(text);
  
  // Keep cache size reasonable
  if (sentenceBoundaryCache.size > 100) {
    const firstKey = sentenceBoundaryCache.keys().next().value;
    if (firstKey !== undefined) {
      sentenceBoundaryCache.delete(firstKey);
    }
  }
  
  sentenceBoundaryCache.set(textHash, boundaries);
  return boundaries;
}

/**
 * Task 1.3.4: Handle multi-sentence selections and overlapping contexts
 */
export function analyzeMultiSentenceContext(text: string, startOffset: number, endOffset: number): {
  sentences: SentenceBoundary[];
  isMultiSentence: boolean;
  hasCompleteSpan: boolean;
  fragmentsIncluded: boolean;
} {
  const sentences = getCachedSentenceBoundaries(text);
  const affectedSentences: SentenceBoundary[] = [];
  
  for (const sentence of sentences) {
    // Check if sentence overlaps with the selection
    if (!(sentence.end < startOffset || sentence.start > endOffset)) {
      affectedSentences.push(sentence);
    }
  }
  
  const isMultiSentence = affectedSentences.length > 1;
  const hasCompleteSpan = affectedSentences.length > 0 && 
    startOffset <= affectedSentences[0].start && 
    endOffset >= affectedSentences[affectedSentences.length - 1].end;
  const fragmentsIncluded = affectedSentences.some(s => s.isFragment);
  
  return {
    sentences: affectedSentences,
    isMultiSentence,
    hasCompleteSpan,
    fragmentsIncluded
  };
}

/**
 * Task 1.4.1: Create function to validate if text forms complete sentences
 */
export function validateSentenceCompleteness(text: string): {
  isComplete: boolean;
  hasSubject: boolean;
  hasVerb: boolean;
  issues: string[];
} {
  const trimmed = text.trim();
  const issues: string[] = [];
  
  // Basic checks
  if (!trimmed) {
    return {
      isComplete: false,
      hasSubject: false,
      hasVerb: false,
      issues: ['Empty text']
    };
  }
  
  if (!/[.!?]$/.test(trimmed)) {
    issues.push('Missing sentence punctuation');
  }
  
  const words = trimmed.toLowerCase().split(/\s+/);
  
  // Basic subject detection
  const hasSubject = hasBasicSubject(words);
  if (!hasSubject) {
    issues.push('No clear subject found');
  }
  
  // Basic verb detection
  const hasVerb = hasBasicVerb(words);
  if (!hasVerb) {
    issues.push('No clear verb found');
  }
  
  const isComplete = issues.length === 0 || (hasSubject && hasVerb && /[.!?]$/.test(trimmed));
  
  return {
    isComplete,
    hasSubject,
    hasVerb,
    issues
  };
}

/**
 * Task 1.4.2: Implement basic grammatical completeness checking (subject-verb detection)
 */
function hasBasicSubject(words: string[]): boolean {
  if (words.length === 0) return false;
  
  // Common subject indicators
  const pronouns = ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'this', 'that', 'these', 'those'];
  const articles = ['the', 'a', 'an'];
  const possessives = ['my', 'your', 'his', 'her', 'its', 'our', 'their'];
  
  // Check first few words for subject indicators
  for (let i = 0; i < Math.min(3, words.length); i++) {
    const word = words[i];
    
    // Direct pronoun subjects
    if (pronouns.includes(word)) {
      return true;
    }
    
    // Article + noun pattern
    if (articles.includes(word) && i + 1 < words.length) {
      return true; // Assume next word is a noun
    }
    
    // Possessive + noun pattern
    if (possessives.includes(word) && i + 1 < words.length) {
      return true;
    }
    
    // Proper noun (capitalized word not at start, or at start with specific patterns)
    if (/^[A-Z][a-z]+$/.test(words[i]) && (i > 0 || words.length > 1)) {
      return true;
    }
  }
  
  return false;
}

function hasBasicVerb(words: string[]): boolean {
  // Common verbs and verb patterns
  const commonVerbs = [
    'is', 'are', 'was', 'were', 'am', 'be', 'been', 'being',
    'have', 'has', 'had', 'having',
    'do', 'does', 'did', 'doing',
    'will', 'would', 'could', 'should', 'might', 'may', 'can',
    'go', 'goes', 'went', 'going',
    'get', 'gets', 'got', 'getting',
    'make', 'makes', 'made', 'making',
    'take', 'takes', 'took', 'taking',
    'come', 'comes', 'came', 'coming',
    'see', 'sees', 'saw', 'seeing',
    'know', 'knows', 'knew', 'knowing',
    'think', 'thinks', 'thought', 'thinking',
    'want', 'wants', 'wanted', 'wanting',
    'need', 'needs', 'needed', 'needing',
    'receive', 'receives', 'received', 'receiving',
    'give', 'gives', 'gave', 'giving',
    'find', 'finds', 'found', 'finding',
    'feel', 'feels', 'felt', 'feeling',
    'work', 'works', 'worked', 'working',
    'use', 'uses', 'used', 'using',
    'show', 'shows', 'showed', 'showing',
    'tell', 'tells', 'told', 'telling',
    'ask', 'asks', 'asked', 'asking',
    'try', 'tries', 'tried', 'trying',
    'help', 'helps', 'helped', 'helping',
    'play', 'plays', 'played', 'playing',
    'move', 'moves', 'moved', 'moving',
    'live', 'lives', 'lived', 'living',
    'believe', 'believes', 'believed', 'believing',
    'hold', 'holds', 'held', 'holding',
    'bring', 'brings', 'brought', 'bringing',
    'happen', 'happens', 'happened', 'happening',
    'write', 'writes', 'wrote', 'writing',
    'provide', 'provides', 'provided', 'providing',
    'sit', 'sits', 'sat', 'sitting',
    'stand', 'stands', 'stood', 'standing',
    'lose', 'loses', 'lost', 'losing',
    'pay', 'pays', 'paid', 'paying',
    'meet', 'meets', 'met', 'meeting',
    'include', 'includes', 'included', 'including',
    'continue', 'continues', 'continued', 'continuing',
    'set', 'sets', 'setting',
    'learn', 'learns', 'learned', 'learning',
    'change', 'changes', 'changed', 'changing',
    'lead', 'leads', 'led', 'leading',
    'understand', 'understands', 'understood', 'understanding',
    'watch', 'watches', 'watched', 'watching',
    'follow', 'follows', 'followed', 'following',
    'stop', 'stops', 'stopped', 'stopping',
    'create', 'creates', 'created', 'creating',
    'speak', 'speaks', 'spoke', 'speaking',
    'read', 'reads', 'reading',
    'allow', 'allows', 'allowed', 'allowing',
    'add', 'adds', 'added', 'adding',
    'spend', 'spends', 'spent', 'spending',
    'grow', 'grows', 'grew', 'growing',
    'open', 'opens', 'opened', 'opening',
    'walk', 'walks', 'walked', 'walking',
    'win', 'wins', 'won', 'winning',
    'offer', 'offers', 'offered', 'offering',
    'remember', 'remembers', 'remembered', 'remembering',
    'love', 'loves', 'loved', 'loving',
    'consider', 'considers', 'considered', 'considering',
    'appear', 'appears', 'appeared', 'appearing',
    'buy', 'buys', 'bought', 'buying',
    'wait', 'waits', 'waited', 'waiting',
    'serve', 'serves', 'served', 'serving',
    'die', 'dies', 'died', 'dying',
    'send', 'sends', 'sent', 'sending',
    'expect', 'expects', 'expected', 'expecting',
    'build', 'builds', 'built', 'building',
    'stay', 'stays', 'stayed', 'staying',
    'fall', 'falls', 'fell', 'falling',
    'cut', 'cuts', 'cutting',
    'reach', 'reaches', 'reached', 'reaching',
    'kill', 'kills', 'killed', 'killing',
    'remain', 'remains', 'remained', 'remaining'
  ];
  
  for (const word of words) {
    if (commonVerbs.includes(word)) {
      return true;
    }
    
    // Check for -ed endings (past tense)
    if (word.endsWith('ed') && word.length > 3) {
      return true;
    }
    
    // Check for -ing endings (present participle)
    if (word.endsWith('ing') && word.length > 4) {
      return true;
    }
    
    // Check for -s endings (third person singular)
    if (word.endsWith('s') && word.length > 2 && !word.endsWith('ss')) {
      return true;
    }
  }
  
  return false;
}

/**
 * Task 1.4.3: Add validation for sentence fragments and run-on sentences
 */
export function detectSentenceIssues(text: string): {
  isFragment: boolean;
  isRunOn: boolean;
  issues: string[];
  suggestions: string[];
} {
  const trimmed = text.trim();
  const issues: string[] = [];
  const suggestions: string[] = [];
  
  // Fragment detection
  const isTextFragment = isFragment(trimmed);
  if (isTextFragment) {
    issues.push('Sentence fragment detected');
    suggestions.push('Consider adding a subject or verb to complete the thought');
  }
  
  // Run-on sentence detection (basic heuristic)
  const sentences = splitIntoSentences(trimmed);
  const isRunOn = sentences.length === 1 && sentences[0].text.split(/\s+/).length > 25;
  
  if (isRunOn) {
    issues.push('Potentially run-on sentence');
    suggestions.push('Consider breaking into shorter sentences');
  }
  
  // Check for comma splices (very basic detection)
  const commaCount = (trimmed.match(/,/g) || []).length;
  const hasConjunctions = /\b(and|but|or|so|yet|for|nor)\b/i.test(trimmed);
  
  if (commaCount > 2 && !hasConjunctions) {
    issues.push('Possible comma splice');
    suggestions.push('Consider using conjunctions or splitting sentences');
  }
  
  return {
    isFragment: isTextFragment,
    isRunOn,
    issues,
    suggestions
  };
}

/**
 * Task 1.4.4: Create sentence reconstruction validator for replacements
 */
export function validateReplacement(originalText: string, offset: number, length: number, replacement: string): {
  isValid: boolean;
  newText: string;
  issues: string[];
  affectedSentences: SentenceBoundary[];
} {
  const newText = originalText.substring(0, offset) + replacement + originalText.substring(offset + length);
  const issues: string[] = [];
  
  // Analyze the affected sentences
  const context = analyzeMultiSentenceContext(originalText, offset, offset + length);
  const newContext = analyzeMultiSentenceContext(newText, offset, offset + replacement.length);
  
  // Check if replacement breaks sentence boundaries
  if (context.sentences.length !== newContext.sentences.length) {
    issues.push('Replacement changes sentence structure');
  }
  
  // Validate each affected sentence in the new text
  for (const sentence of newContext.sentences) {
    const validation = validateSentenceCompleteness(sentence.text);
    if (!validation.isComplete) {
      issues.push(`Incomplete sentence: ${validation.issues.join(', ')}`);
    }
  }
  
  // Check for basic grammatical consistency
  const replacementWords = replacement.toLowerCase().split(/\s+/);
  const contextBefore = originalText.substring(Math.max(0, offset - 20), offset).toLowerCase();
  const contextAfter = originalText.substring(offset + length, Math.min(originalText.length, offset + length + 20)).toLowerCase();
  
  // Basic agreement checks (simplified)
  if (replacementWords.length > 0) {
    const firstWord = replacementWords[0];
    const lastWord = replacementWords[replacementWords.length - 1];
    
    // Check capitalization consistency
    if (contextBefore.endsWith('. ') && firstWord === firstWord.toLowerCase()) {
      issues.push('Replacement should be capitalized after period');
    }
    
    // Check punctuation consistency
    if (contextAfter.startsWith(' ') && lastWord.endsWith('.')) {
      issues.push('Replacement ends with period but continues in sentence');
    }
  }
  
  return {
    isValid: issues.length === 0,
    newText,
    issues,
    affectedSentences: newContext.sentences
  };
} 