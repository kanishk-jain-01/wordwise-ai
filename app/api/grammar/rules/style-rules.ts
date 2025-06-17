export interface StyleRule {
  id: string
  pattern: RegExp
  type: "style"
  message: string
  shortMessage: string
  category: string
  confidence: number
  replacement: string | ((match: string) => string)
  examples?: {
    incorrect: string
    correct: string
  }[]
}

export const styleRules: StyleRule[] = [
  // Passive Voice Detection
  {
    id: "passive-voice-was",
    pattern: /\b(was|were)\s+(\w+ed|given|taken|made|done|seen|heard|found|told|asked|shown)\b/gi,
    type: "style",
    message: "Consider using active voice for clearer, more direct writing.",
    shortMessage: "Consider active voice",
    category: "voice",
    confidence: 0.7,
    replacement: (match: string) => `[Consider rephrasing: ${match}]`,
    examples: [
      { incorrect: "The report was written by John", correct: "John wrote the report" },
      { incorrect: "Mistakes were made", correct: "We made mistakes" }
    ]
  },
  {
    id: "passive-voice-being",
    pattern: /\b(is|are|am|was|were)\s+being\s+(\w+ed|given|taken|made|done|seen|heard|found|told|asked|shown)\b/gi,
    type: "style",
    message: "Consider using active voice for clearer, more direct writing.",
    shortMessage: "Consider active voice",
    category: "voice",
    confidence: 0.8,
    replacement: (match: string) => `[Consider rephrasing: ${match}]`
  },

  // Redundant Phrases
  {
    id: "advance-planning",
    pattern: /\badvance\s+planning\b/gi,
    type: "style",
    message: 'Redundant phrase. "Planning" already implies advance preparation.',
    shortMessage: 'Use "planning"',
    category: "redundancy",
    confidence: 0.9,
    replacement: "planning"
  },
  {
    id: "brief-summary",
    pattern: /\bbrief\s+summary\b/gi,
    type: "style",
    message: 'Redundant phrase. A summary is inherently brief.',
    shortMessage: 'Use "summary"',
    category: "redundancy",
    confidence: 0.9,
    replacement: "summary"
  },
  {
    id: "close-proximity",
    pattern: /\bclose\s+proximity\b/gi,
    type: "style",
    message: 'Redundant phrase. "Proximity" means closeness.',
    shortMessage: 'Use "proximity" or "close"',
    category: "redundancy",
    confidence: 0.9,
    replacement: "proximity"
  },
  {
    id: "end-result",
    pattern: /\bend\s+result\b/gi,
    type: "style",
    message: 'Redundant phrase. Use "result" or "outcome".',
    shortMessage: 'Use "result"',
    category: "redundancy",
    confidence: 0.9,
    replacement: "result"
  },
  {
    id: "final-outcome",
    pattern: /\bfinal\s+outcome\b/gi,
    type: "style",
    message: 'Redundant phrase. An outcome is the final result.',
    shortMessage: 'Use "outcome"',
    category: "redundancy",
    confidence: 0.9,
    replacement: "outcome"
  },

  // Wordy Phrases
  {
    id: "at-this-point-in-time",
    pattern: /\bat\s+this\s+point\s+in\s+time\b/gi,
    type: "style",
    message: 'Wordy phrase. Use "now" or "currently".',
    shortMessage: 'Use "now"',
    category: "wordiness",
    confidence: 0.9,
    replacement: "now"
  },
  {
    id: "due-to-the-fact-that",
    pattern: /\bdue\s+to\s+the\s+fact\s+that\b/gi,
    type: "style",
    message: 'Wordy phrase. Use "because".',
    shortMessage: 'Use "because"',
    category: "wordiness",
    confidence: 0.95,
    replacement: "because"
  },
  {
    id: "in-order-to",
    pattern: /\bin\s+order\s+to\b/gi,
    type: "style",
    message: 'Often unnecessary. Usually "to" is sufficient.',
    shortMessage: 'Consider "to"',
    category: "wordiness",
    confidence: 0.8,
    replacement: "to"
  },
  {
    id: "for-the-purpose-of",
    pattern: /\bfor\s+the\s+purpose\s+of\b/gi,
    type: "style",
    message: 'Wordy phrase. Use "to" or "for".',
    shortMessage: 'Use "to"',
    category: "wordiness",
    confidence: 0.9,
    replacement: "to"
  },
  {
    id: "in-the-event-that",
    pattern: /\bin\s+the\s+event\s+that\b/gi,
    type: "style",
    message: 'Wordy phrase. Use "if".',
    shortMessage: 'Use "if"',
    category: "wordiness",
    confidence: 0.95,
    replacement: "if"
  },
  {
    id: "with-regard-to",
    pattern: /\bwith\s+regard\s+to\b/gi,
    type: "style",
    message: 'Wordy phrase. Use "about" or "regarding".',
    shortMessage: 'Use "about"',
    category: "wordiness",
    confidence: 0.9,
    replacement: "about"
  },

  // Weak Qualifiers
  {
    id: "very-unique",
    pattern: /\bvery\s+unique\b/gi,
    type: "style",
    message: '"Unique" means one of a kind and cannot be qualified.',
    shortMessage: 'Use "unique"',
    category: "qualifier",
    confidence: 0.95,
    replacement: "unique"
  },
  {
    id: "quite-perfect",
    pattern: /\b(quite|very|rather)\s+perfect\b/gi,
    type: "style",
    message: '"Perfect" is absolute and cannot be qualified.',
    shortMessage: 'Use "perfect"',
    category: "qualifier",
    confidence: 0.9,
    replacement: "perfect"
  },
  {
    id: "absolutely-essential",
    pattern: /\babsolutely\s+essential\b/gi,
    type: "style",
    message: '"Essential" is already absolute.',
    shortMessage: 'Use "essential"',
    category: "qualifier",
    confidence: 0.9,
    replacement: "essential"
  },

  // Filler Words
  {
    id: "basically",
    pattern: /\bbasically,?\s+/gi,
    type: "style",
    message: '"Basically" is often unnecessary filler.',
    shortMessage: "Remove filler word",
    category: "filler",
    confidence: 0.8,
    replacement: ""
  },
  {
    id: "literally-figurative",
    pattern: /\bliterally\s+(?=amazing|incredible|dying|exploded|flew|melted)/gi,
    type: "style",
    message: 'Avoid using "literally" for emphasis when not literally true.',
    shortMessage: 'Remove "literally"',
    category: "filler",
    confidence: 0.85,
    replacement: ""
  },

  // Clichés
  {
    id: "think-outside-box",
    pattern: /\bthink\s+outside\s+the\s+box\b/gi,
    type: "style",
    message: "Cliché phrase. Consider more specific language.",
    shortMessage: "Avoid cliché",
    category: "cliche",
    confidence: 0.8,
    replacement: "think creatively"
  },
  {
    id: "low-hanging-fruit",
    pattern: /\blow.hanging\s+fruit\b/gi,
    type: "style",
    message: "Cliché phrase. Consider more specific language.",
    shortMessage: "Avoid cliché",
    category: "cliche",
    confidence: 0.8,
    replacement: "easy opportunities"
  },
  {
    id: "paradigm-shift",
    pattern: /\bparadigm\s+shift\b/gi,
    type: "style",
    message: "Overused business jargon. Consider more specific language.",
    shortMessage: "Avoid jargon",
    category: "cliche",
    confidence: 0.7,
    replacement: "fundamental change"
  },

  // Nominalizations (turning verbs into nouns)
  {
    id: "make-decision",
    pattern: /\bmake\s+a\s+decision\b/gi,
    type: "style",
    message: 'More concise: use "decide".',
    shortMessage: 'Use "decide"',
    category: "nominalization",
    confidence: 0.8,
    replacement: "decide"
  },
  {
    id: "give-consideration",
    pattern: /\bgive\s+consideration\s+to\b/gi,
    type: "style",
    message: 'More concise: use "consider".',
    shortMessage: 'Use "consider"',
    category: "nominalization",
    confidence: 0.9,
    replacement: "consider"
  },
  {
    id: "conduct-analysis",
    pattern: /\bconduct\s+an?\s+analysis\b/gi,
    type: "style",
    message: 'More concise: use "analyze".',
    shortMessage: 'Use "analyze"',
    category: "nominalization",
    confidence: 0.9,
    replacement: "analyze"
  },

  // Weak Sentence Starters
  {
    id: "there-are-many",
    pattern: /\bthere\s+are\s+many\b/gi,
    type: "style",
    message: "Weak sentence starter. Consider more direct phrasing.",
    shortMessage: "Strengthen opening",
    category: "weak-opening",
    confidence: 0.7,
    replacement: "Many"
  },
  {
    id: "it-is-important",
    pattern: /\bit\s+is\s+important\s+to\s+note\s+that\b/gi,
    type: "style",
    message: "Wordy phrase. State the important point directly.",
    shortMessage: "Be more direct",
    category: "weak-opening",
    confidence: 0.8,
    replacement: ""
  },

  // Vague Language
  {
    id: "stuff-things",
    pattern: /\b(stuff|things)\s+(?=that|which|like|such)/gi,
    type: "style",
    message: "Vague language. Be more specific.",
    shortMessage: "Be more specific",
    category: "vague",
    confidence: 0.8,
    replacement: "[be more specific]"
  },
  {
    id: "a-lot-of",
    pattern: /\ba\s+lot\s+of\b/gi,
    type: "style",
    message: 'Consider more precise quantifiers like "many," "several," or "numerous."',
    shortMessage: "Be more precise",
    category: "vague",
    confidence: 0.7,
    replacement: "many"
  },

  // Sentence Length and Complexity
  {
    id: "very-long-sentence",
    pattern: /\b\w+(?:\s+\w+){40,}\./g,
    type: "style",
    message: "Very long sentence. Consider breaking into shorter sentences.",
    shortMessage: "Consider shorter sentences",
    category: "sentence-length",
    confidence: 0.6,
    replacement: (match: string) => `[Consider breaking up: ${match.substring(0, 50)}...]`
  },

  // Overuse of Adverbs
  {
    id: "very-adverb",
    pattern: /\bvery\s+(quickly|slowly|carefully|easily|clearly|obviously|definitely|certainly|probably|possibly)\b/gi,
    type: "style",
    message: 'Consider stronger verbs or adjectives instead of "very + adverb".',
    shortMessage: "Strengthen language",
    category: "adverb-overuse",
    confidence: 0.7,
    replacement: (match: string) => match.replace(/very\s+/, "")
  }
] 