/**
 * Grammar Suggestion Validation Pipeline
 * Provides pre-flight validation, risk assessment, and quality control
 * for grammar and style suggestions before they reach the user.
 */

import {
  validateReplacement,
  buildContextMetadata,
  SentencePosition,
  type ContextMetadata
} from './grammar-context';

export enum SuggestionRisk {
  SAFE = 'safe',
  MODERATE = 'moderate', 
  RISKY = 'risky'
}

export interface ValidationResult {
  isValid: boolean;
  risk: SuggestionRisk;
  confidence: number;
  issues: string[];
  suggestions: string[];
  contextQuality: number;
}

export interface SuggestionContext {
  originalText: string;
  offset: number;
  length: number;
  replacement: string;
  ruleId: string;
  ruleType: 'grammar' | 'spelling' | 'style';
  originalConfidence: number;
}

export interface SuggestionValidation {
  risk: 'SAFE' | 'MODERATE' | 'RISKY';
  confidence: number;
  reasons: string[];
  isValid: boolean;
}

export interface ValidateSuggestionInput {
  originalText: string;
  matchStart: number;
  matchEnd: number;
  replacement: string;
  rule: {
    id: string;
    category: string;
    confidence: number;
  };
}

// Cache for validation results to improve performance
const validationCache = new Map<string, ValidationResult>();

/**
 * Simplified validation function for enhanced style rules
 * Converts the complex validation system to a simpler interface
 */
export async function validateSuggestion(input: ValidateSuggestionInput): Promise<SuggestionValidation> {
  const context: SuggestionContext = {
    originalText: input.originalText,
    offset: input.matchStart,
    length: input.matchEnd - input.matchStart,
    replacement: input.replacement,
    ruleId: input.rule.id,
    ruleType: 'style', // Most enhanced rules are style rules
    originalConfidence: input.rule.confidence
  };
  
  const result = validateSuggestionInContext(context);
  
  return {
    risk: result.risk.toUpperCase() as 'SAFE' | 'MODERATE' | 'RISKY',
    confidence: result.confidence,
    reasons: result.issues,
    isValid: result.isValid
  };
}

/**
 * Task 2.1.1: Create function to test replacement text in original context
 */
export function validateSuggestionInContext(context: SuggestionContext): ValidationResult {
  const cacheKey = generateCacheKey(context);
  
  // Check cache first
  if (validationCache.has(cacheKey)) {
    return validationCache.get(cacheKey)!;
  }
  
  const result = performValidation(context);
  
  // Cache the result
  if (validationCache.size > 200) {
    // Clean up old entries
    const firstKey = validationCache.keys().next().value;
    if (firstKey !== undefined) {
      validationCache.delete(firstKey);
    }
  }
  validationCache.set(cacheKey, result);
  
  return result;
}

/**
 * Core validation logic
 */
function performValidation(context: SuggestionContext): ValidationResult {
  const { originalText, offset, length, replacement, originalConfidence } = context;
  
  // Step 1: Basic replacement validation
  const replacementValidation = validateReplacement(originalText, offset, length, replacement);
  
  // Step 2: Context quality assessment
  const contextMetadata = buildContextMetadata(originalText, offset, length);
  const contextQuality = assessContextQuality(contextMetadata, originalText, offset, length);
  
  // Step 3: Risk assessment
  const risk = assessSuggestionRisk(context, contextMetadata, replacementValidation);
  
  // Step 4: Confidence adjustment
  const adjustedConfidence = adjustConfidenceBasedOnContext(
    originalConfidence,
    contextQuality,
    risk,
    replacementValidation
  );
  
  // Step 5: Generate issues and suggestions
  const issues: string[] = [...replacementValidation.issues];
  const suggestions: string[] = [];
  
  // Add context-specific issues
  if (contextQuality < 0.5) {
    issues.push('Low context quality - suggestion may be unreliable');
  }
  
  if (contextMetadata.sentencePosition === SentencePosition.START && !replacement.match(/^[A-Z]/)) {
    issues.push('Replacement should be capitalized at sentence start');
  }
  
  // Generate improvement suggestions
  if (risk === SuggestionRisk.RISKY) {
    suggestions.push('Consider manual review of this suggestion');
  }
  
  if (!replacementValidation.isValid) {
    suggestions.push('Suggestion may break sentence structure');
  }
  
  return {
    isValid: replacementValidation.isValid && risk !== SuggestionRisk.RISKY,
    risk,
    confidence: adjustedConfidence,
    issues,
    suggestions,
    contextQuality
  };
}

/**
 * Task 2.1.2: Implement basic grammatical agreement checking
 */
export function checkGrammaticalAgreement(
  originalText: string,
  offset: number,
  length: number,
  replacement: string
): {
  hasAgreementIssues: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const contextBefore = originalText.substring(Math.max(0, offset - 20), offset).toLowerCase();
  const contextAfter = originalText.substring(offset + length, Math.min(originalText.length, offset + length + 20)).toLowerCase();
  
  // Subject-verb agreement checks
  const replacementWords = replacement.toLowerCase().split(/\s+/);
  const beforeWords = contextBefore.split(/\s+/);
  const afterWords = contextAfter.split(/\s+/);
  
  // Check for singular/plural agreement
  if (replacementWords.length > 0) {
    const lastReplacementWord = replacementWords[replacementWords.length - 1];
    const firstAfterWord = afterWords[0];
    
    // Basic verb agreement check
    if (isVerb(firstAfterWord)) {
      if (isSingularNoun(lastReplacementWord) && isPluralVerb(firstAfterWord)) {
        issues.push('Singular noun with plural verb');
      } else if (isPluralNoun(lastReplacementWord) && isSingularVerb(firstAfterWord)) {
        issues.push('Plural noun with singular verb');
      }
    }
  }
  
  // Article agreement (a/an)
  if (beforeWords.length > 0) {
    const lastBeforeWord = beforeWords[beforeWords.length - 1];
    if (lastBeforeWord === 'a' && replacementWords[0] && startsWithVowelSound(replacementWords[0])) {
      issues.push('Use "an" before vowel sound');
    } else if (lastBeforeWord === 'an' && replacementWords[0] && !startsWithVowelSound(replacementWords[0])) {
      issues.push('Use "a" before consonant sound');
    }
  }
  
  return {
    hasAgreementIssues: issues.length > 0,
    issues
  };
}

/**
 * Task 2.1.3: Add validation for common grammatical patterns
 */
export function validateGrammaticalPatterns(
  originalText: string,
  offset: number,
  length: number,
  replacement: string
): string[] {
  const issues: string[] = [];
  const newText = originalText.substring(0, offset) + replacement + originalText.substring(offset + length);
  
  // Pattern 1: Double negatives
  if (/\b(don't|won't|can't|shouldn't)\s+.*\b(no|nothing|never|nobody)\b/i.test(newText)) {
    issues.push('Possible double negative');
  }
  
  // Pattern 2: Incomplete comparisons
  if (/\b(more|less|better|worse)\s+than\s*$/i.test(replacement)) {
    issues.push('Incomplete comparison');
  }
  
  // Pattern 3: Dangling modifiers
  if (replacement.startsWith('ing ') && !/\b(I|you|he|she|it|we|they|the|a|an)\b/i.test(originalText.substring(offset + length, offset + length + 20))) {
    issues.push('Possible dangling modifier');
  }
  
  return issues;
}

/**
 * Task 2.1.4: Create whitelist/blacklist system for known good/bad replacements
 */
const KNOWN_GOOD_REPLACEMENTS = new Map<string, string[]>([
  ['there-are-many', ['Many', 'Several', 'Numerous']],
  ['a-lot-of', ['many', 'much', 'numerous', 'several']],
  ['due-to-the-fact-that', ['because', 'since']],
  ['in-order-to', ['to']],
  ['at-this-point-in-time', ['now', 'currently']]
]);

const KNOWN_BAD_REPLACEMENTS = new Map<string, string[]>([
  ['there-are-many', ['Many issues', 'There many']], // Incomplete replacements
  ['a-lot-of', ['many feedback', 'much issues']], // Wrong agreement
  ['basically', ['']] // Empty replacement in wrong context
]);

export function checkReplacementWhitelist(ruleId: string, replacement: string): {
  isKnownGood: boolean;
  isKnownBad: boolean;
  suggestion?: string;
} {
  const goodReplacements = KNOWN_GOOD_REPLACEMENTS.get(ruleId) || [];
  const badReplacements = KNOWN_BAD_REPLACEMENTS.get(ruleId) || [];
  
  const isKnownGood = goodReplacements.includes(replacement);
  const isKnownBad = badReplacements.includes(replacement);
  
  let suggestion: string | undefined;
  if (isKnownBad && goodReplacements.length > 0) {
    suggestion = `Consider: ${goodReplacements[0]}`;
  }
  
  return { isKnownGood, isKnownBad, suggestion };
}

/**
 * Task 2.3.1: Implement context quality scoring algorithm
 */
function assessContextQuality(
  metadata: ContextMetadata,
  originalText: string,
  offset: number,
  length: number
): number {
  let quality = 1.0;
  
  // Reduce quality for fragments
  if (metadata.sentenceBoundary.isFragment) {
    quality *= 0.6;
  }
  
  // Reduce quality for incomplete sentences
  if (!metadata.sentenceBoundary.isComplete) {
    quality *= 0.7;
  }
  
  // Reduce quality if at document boundaries
  if (offset < 10 || offset + length > originalText.length - 10) {
    quality *= 0.8;
  }
  
  // Reduce quality if insufficient context words
  if (metadata.wordsBefore.length < 2 || metadata.wordsAfter.length < 2) {
    quality *= 0.7;
  }
  
  // Boost quality for clear sentence positions
  if (metadata.sentencePosition === SentencePosition.START || metadata.sentencePosition === SentencePosition.MIDDLE) {
    quality *= 1.1;
  }
  
  return Math.max(0.1, Math.min(1.0, quality));
}

/**
 * Task 2.4.1: Create risk assessment logic
 */
function assessSuggestionRisk(
  context: SuggestionContext,
  metadata: ContextMetadata,
  replacementValidation: any
): SuggestionRisk {
  // High risk conditions
  if (!replacementValidation.isValid) {
    return SuggestionRisk.RISKY;
  }
  
  if (metadata.sentenceBoundary.isFragment && context.ruleType === 'style') {
    return SuggestionRisk.RISKY;
  }
  
  if (context.replacement === '' && metadata.sentencePosition === SentencePosition.START) {
    return SuggestionRisk.RISKY;
  }
  
  // Moderate risk conditions
  if (metadata.sentencePosition === SentencePosition.START && context.ruleType === 'style') {
    return SuggestionRisk.MODERATE;
  }
  
  if (context.originalConfidence < 0.7) {
    return SuggestionRisk.MODERATE;
  }
  
  // Default to safe
  return SuggestionRisk.SAFE;
}

/**
 * Task 2.3.2: Create confidence adjustment system
 */
function adjustConfidenceBasedOnContext(
  originalConfidence: number,
  contextQuality: number,
  risk: SuggestionRisk,
  replacementValidation: any
): number {
  let adjustedConfidence = originalConfidence * contextQuality;
  
  // Risk-based adjustments
  switch (risk) {
    case SuggestionRisk.RISKY:
      adjustedConfidence *= 0.3;
      break;
    case SuggestionRisk.MODERATE:
      adjustedConfidence *= 0.7;
      break;
    case SuggestionRisk.SAFE:
      adjustedConfidence *= 1.1;
      break;
  }
  
  // Validation-based adjustments
  if (!replacementValidation.isValid) {
    adjustedConfidence *= 0.2;
  }
  
  return Math.max(0.1, Math.min(1.0, adjustedConfidence));
}

/**
 * Helper functions for grammatical analysis
 */
function isVerb(word: string): boolean {
  const commonVerbs = ['is', 'are', 'was', 'were', 'have', 'has', 'had', 'do', 'does', 'did'];
  return commonVerbs.includes(word) || word.endsWith('s') || word.endsWith('ed') || word.endsWith('ing');
}

function isSingularNoun(word: string): boolean {
  return !word.endsWith('s') || word.endsWith('ss') || word.endsWith('us');
}

function isPluralNoun(word: string): boolean {
  return word.endsWith('s') && !word.endsWith('ss') && !word.endsWith('us');
}

function isSingularVerb(word: string): boolean {
  return word === 'is' || word === 'was' || word === 'has' || word === 'does' || (word.endsWith('s') && !word.endsWith('ss'));
}

function isPluralVerb(word: string): boolean {
  return word === 'are' || word === 'were' || word === 'have' || word === 'do';
}

function startsWithVowelSound(word: string): boolean {
  const vowelSounds = /^[aeiouAEIOU]/;
  const specialCases = ['hour', 'honest', 'honor', 'heir']; // Silent h
  const consonantSounds = ['university', 'european', 'one']; // U/O with consonant sound
  
  if (specialCases.some(special => word.toLowerCase().startsWith(special))) {
    return true;
  }
  
  if (consonantSounds.some(special => word.toLowerCase().startsWith(special))) {
    return false;
  }
  
  return vowelSounds.test(word);
}

/**
 * Task 2.5.2: Generate cache key for validation results
 */
function generateCacheKey(context: SuggestionContext): string {
  const ruleId = context.ruleId || 'unknown';
  const offset = context.offset || 0;
  const length = context.length || 0;
  const replacement = context.replacement || '';
  const originalTextLength = context.originalText?.length || 0;
  
  return `${ruleId}_${offset}_${length}_${replacement}_${originalTextLength}`;
}

/**
 * Task 2.2.1: Build function to reconstruct full sentences with replacements
 */
export function reconstructSentenceWithReplacement(
  originalText: string,
  offset: number,
  length: number,
  replacement: string
): {
  newText: string;
  affectedSentences: string[];
  flowMaintained: boolean;
  punctuationConsistent: boolean;
} {
  const newText = originalText.substring(0, offset) + replacement + originalText.substring(offset + length);
  
  // Get affected sentences
  const contextMetadata = buildContextMetadata(originalText, offset, length);
  const newContextMetadata = buildContextMetadata(newText, offset, replacement.length);
  
  const affectedSentences = [
    contextMetadata.sentenceBoundary.text,
    newContextMetadata.sentenceBoundary.text
  ];
  
  // Check if flow is maintained
  const flowMaintained = checkSentenceFlow(originalText, newText, offset, length, replacement);
  
  // Check punctuation consistency
  const punctuationConsistent = checkPunctuationConsistency(originalText, newText, offset, length, replacement);
  
  return {
    newText,
    affectedSentences,
    flowMaintained,
    punctuationConsistent
  };
}

/**
 * Task 2.2.2: Implement sentence flow validation
 */
function checkSentenceFlow(
  originalText: string,
  newText: string,
  offset: number,
  length: number,
  replacement: string
): boolean {
  // Check if the replacement maintains logical flow
  const beforeContext = originalText.substring(Math.max(0, offset - 50), offset);
  const afterContext = originalText.substring(offset + length, Math.min(originalText.length, offset + length + 50));
  
  // Basic flow checks
  const originalPhrase = originalText.substring(offset, offset + length);
  
  // Check for logical connectors
  const hasLogicalConnection = checkLogicalConnection(beforeContext, replacement, afterContext);
  
  // Check for meaning preservation
  const meaningPreserved = checkMeaningPreservation(originalPhrase, replacement);
  
  return hasLogicalConnection && meaningPreserved;
}

/**
 * Task 2.2.3: Add punctuation and capitalization consistency checking
 */
function checkPunctuationConsistency(
  originalText: string,
  newText: string,
  offset: number,
  length: number,
  replacement: string
): boolean {
  const issues: string[] = [];
  
  // Check capitalization at sentence start
  const contextBefore = originalText.substring(Math.max(0, offset - 5), offset);
  if (contextBefore.match(/[.!?]\s*$/)) {
    // At sentence start - replacement should be capitalized
    if (replacement.length > 0 && replacement[0] !== replacement[0].toUpperCase()) {
      return false;
    }
  }
  
  // Check punctuation at sentence end
  const contextAfter = originalText.substring(offset + length, Math.min(originalText.length, offset + length + 5));
  if (contextAfter.match(/^\s*[.!?]/)) {
    // At sentence end - replacement shouldn't end with punctuation
    if (replacement.match(/[.!?]$/)) {
      return false;
    }
  }
  
  // Check for double punctuation
  const newTextSection = newText.substring(Math.max(0, offset - 5), Math.min(newText.length, offset + replacement.length + 5));
  if (newTextSection.match(/[.!?]{2,}/) || newTextSection.match(/,,/)) {
    return false;
  }
  
  return true;
}

/**
 * Task 2.2.4: Create before/after comparison system
 */
export function compareBeforeAfter(
  originalText: string,
  offset: number,
  length: number,
  replacement: string
): {
  readabilityImproved: boolean;
  clarityScore: number;
  lengthChange: number;
  complexityChange: number;
  issues: string[];
} {
  const originalPhrase = originalText.substring(offset, offset + length);
  
  // Calculate metrics
  const lengthChange = replacement.length - length;
  const complexityChange = calculateComplexityChange(originalPhrase, replacement);
  const clarityScore = calculateClarityScore(originalPhrase, replacement);
  
  const issues: string[] = [];
  
  // Check for improvements
  const readabilityImproved = clarityScore > 0.6 && complexityChange <= 0;
  
  if (lengthChange > originalPhrase.length * 2) {
    issues.push('Replacement significantly longer than original');
  }
  
  if (complexityChange > 0.5) {
    issues.push('Replacement increases complexity');
  }
  
  return {
    readabilityImproved,
    clarityScore,
    lengthChange,
    complexityChange,
    issues
  };
}

/**
 * Helper functions for flow and meaning analysis
 */
function checkLogicalConnection(before: string, replacement: string, after: string): boolean {
  // Simple heuristic - check if replacement fits grammatically
  const combinedText = before + replacement + after;
  
  // Check for obvious grammatical breaks
  if (combinedText.match(/\b(a|an)\s+(are|were)\b/i)) return false;
  if (combinedText.match(/\b(is|was)\s+are\b/i)) return false;
  
  return true;
}

function checkMeaningPreservation(original: string, replacement: string): boolean {
  // Basic semantic similarity check
  if (replacement === '') return original.trim() === '';
  
  // Check if replacement is completely unrelated
  const originalWords = original.toLowerCase().split(/\s+/);
  const replacementWords = replacement.toLowerCase().split(/\s+/);
  
  // If replacement is much shorter, it should preserve key words
  if (replacementWords.length < originalWords.length / 2) {
    const hasKeyWords = originalWords.some(word => 
      replacementWords.some(replWord => 
        word.includes(replWord) || replWord.includes(word)
      )
    );
    return hasKeyWords || original.length < 10; // Allow short phrase replacements
  }
  
  return true;
}

function calculateComplexityChange(original: string, replacement: string): number {
  const originalComplexity = calculateTextComplexity(original);
  const replacementComplexity = calculateTextComplexity(replacement);
  
  return replacementComplexity - originalComplexity;
}

function calculateTextComplexity(text: string): number {
  const words = text.split(/\s+/);
  const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
  const syllableCount = words.reduce((sum, word) => sum + estimateSyllables(word), 0);
  
  return (avgWordLength * 0.5) + (syllableCount / words.length * 0.5);
}

function calculateClarityScore(original: string, replacement: string): number {
  // Simple clarity heuristic
  const originalWords = original.split(/\s+/).length;
  const replacementWords = replacement.split(/\s+/).length;
  
  // Shorter is often clearer
  let score = originalWords > replacementWords ? 0.8 : 0.6;
  
  // Common clarity improvements
  if (original.includes('there are') && replacement.startsWith('Many')) score += 0.2;
  if (original.includes('a lot of') && (replacement.includes('many') || replacement.includes('much'))) score += 0.2;
  if (original.includes('due to the fact that') && replacement.includes('because')) score += 0.3;
  
  return Math.min(1.0, score);
}

function estimateSyllables(word: string): number {
  const vowels = word.match(/[aeiouy]+/gi);
  return vowels ? Math.max(1, vowels.length) : 1;
}

/**
 * Task 2.5: Validation result caching and performance optimization
 */
export function clearValidationCache(): void {
  validationCache.clear();
}

export function getValidationCacheStats(): {
  size: number;
  hitRate: number;
} {
  // Simple stats - in production, you'd track hits/misses
  return {
    size: validationCache.size,
    hitRate: 0.85 // Placeholder - would track actual hit rate
  };
}

/**
 * Public API for filtering suggestions based on validation
 */
export function filterSuggestionsByValidation(
  suggestions: Array<SuggestionContext>,
  minConfidence: number = 0.5,
  allowedRisks: SuggestionRisk[] = [SuggestionRisk.SAFE, SuggestionRisk.MODERATE]
): Array<SuggestionContext & { validation: ValidationResult }> {
  return suggestions
    .map(suggestion => ({
      ...suggestion,
      validation: validateSuggestionInContext(suggestion)
    }))
    .filter(item => 
      item.validation.isValid &&
      item.validation.confidence >= minConfidence &&
      allowedRisks.includes(item.validation.risk)
    );
}

/**
 * Simplified filtering function for GrammarSuggestion format
 */
export async function filterGrammarSuggestionsByValidation(
  suggestions: any[],
  _originalText: string
): Promise<any[]> {
  // For now, just return the suggestions as-is since they're already validated
  // in the enhanced style processor pipeline
  return suggestions.filter(suggestion => {
    // Basic filtering - remove suggestions with very low confidence
    if (suggestion.confidence && suggestion.confidence < 0.3) {
      return false;
    }
    
    // Remove suggestions marked as very risky with low confidence
    if ((suggestion as any).validationRisk === 'RISKY' && suggestion.confidence < 0.7) {
      return false;
    }
    
    return true;
  });
} 