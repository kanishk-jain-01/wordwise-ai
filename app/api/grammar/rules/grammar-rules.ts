export interface GrammarRule {
  id: string
  pattern: RegExp
  type: "grammar"
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

export const grammarRules: GrammarRule[] = [
  // Subject-Verb Agreement
  {
    id: "there-is-plural",
    pattern: /\b(there|here)\s+is\s+(\w+\s+)*\w*s\b/gi,
    type: "grammar",
    message: 'Subject-verb disagreement. Use "there are" with plural nouns.',
    shortMessage: 'Use "there are"',
    category: "subject-verb",
    confidence: 0.9,
    replacement: (match: string) => match.replace(/\b(there|here)\s+is\b/gi, "$1 are"),
    examples: [
      { incorrect: "There is many issues", correct: "There are many issues" },
      { incorrect: "Here is the documents", correct: "Here are the documents" }
    ]
  },
  {
    id: "collective-noun-singular",
    pattern: /\b(team|group|family|company|staff|crew|band|committee)\s+are\b/gi,
    type: "grammar",
    message: "Collective nouns typically take singular verbs in American English.",
    shortMessage: 'Use "is"',
    category: "subject-verb",
    confidence: 0.8,
    replacement: (match: string) => match.replace(/\s+are\b/gi, " is")
  },
  {
    id: "each-singular",
    pattern: /\beach\s+of\s+\w+\s+are\b/gi,
    type: "grammar",
    message: '"Each" takes a singular verb.',
    shortMessage: 'Use "is"',
    category: "subject-verb",
    confidence: 0.95,
    replacement: (match: string) => match.replace(/\s+are\b/gi, " is")
  },

  // Pronoun Errors
  {
    id: "me-and-subject",
    pattern: /\b(me\s+and\s+\w+|me\s+and\s+I)\s+(went|did|are|were|will|have|had)/gi,
    type: "grammar",
    message: 'Use "I" instead of "me" when it\'s the subject of the sentence.',
    shortMessage: 'Use "I and..."',
    category: "pronoun",
    confidence: 0.9,
    replacement: (match: string) => match.replace(/\bme\s+and\s+/gi, "I and ")
  },
  {
    id: "between-you-and-i",
    pattern: /\bbetween\s+you\s+and\s+I\b/gi,
    type: "grammar",
    message: 'Use "between you and me" - prepositions take object pronouns.',
    shortMessage: 'Use "between you and me"',
    category: "pronoun",
    confidence: 0.95,
    replacement: () => "between you and me"
  },

  // Its vs It's
  {
    id: "its-contraction",
    pattern: /\bits\s+(?=going|coming|being|doing|really|very|quite|always|never)/gi,
    type: "grammar",
    message: 'Use "it\'s" (contraction) when you mean "it is" or "it has".',
    shortMessage: 'Use "it\'s"',
    category: "contraction",
    confidence: 0.85,
    replacement: () => "it's"
  },
  {
    id: "its-possessive",
    pattern: /\bit's\s+(?=own|color|size|shape|weight|length|width|height|name|purpose)/gi,
    type: "grammar",
    message: 'Use "its" (possessive) when showing ownership.',
    shortMessage: 'Use "its"',
    category: "possessive",
    confidence: 0.85,
    replacement: () => "its"
  },

  // Your vs You're
  {
    id: "your-contraction",
    pattern: /\byour\s+(?=going|coming|being|doing|really|very|quite|always|never|not|welcome)/gi,
    type: "grammar",
    message: 'Use "you\'re" when you mean "you are".',
    shortMessage: 'Use "you\'re"',
    category: "contraction",
    confidence: 0.9,
    replacement: () => "you're"
  },
  {
    id: "youre-possessive",
    pattern: /\byou're\s+(?=house|car|book|phone|computer|family|friend|job|work|idea)/gi,
    type: "grammar",
    message: 'Use "your" when showing ownership.',
    shortMessage: 'Use "your"',
    category: "possessive",
    confidence: 0.9,
    replacement: () => "your"
  },

  // Then vs Than
  {
    id: "then-comparison",
    pattern: /\bthen\s+(?=better|worse|more|less|bigger|smaller|faster|slower|higher|lower)/gi,
    type: "grammar",
    message: 'Use "than" for comparisons.',
    shortMessage: 'Use "than"',
    category: "comparison",
    confidence: 0.95,
    replacement: () => "than"
  },

  // Article Errors
  {
    id: "an-consonant",
    pattern: /\ban\s+(?=university|user|unique|uniform|union|unit|usual|utility)/gi,
    type: "grammar",
    message: 'Use "a" before words that sound like they start with a consonant.',
    shortMessage: 'Use "a"',
    category: "article",
    confidence: 0.9,
    replacement: () => "a"
  },
  {
    id: "a-vowel-sound",
    pattern: /\ba\s+(?=hour|honor|honest|heir|herb)/gi,
    type: "grammar",
    message: 'Use "an" before words that sound like they start with a vowel.',
    shortMessage: 'Use "an"',
    category: "article",
    confidence: 0.95,
    replacement: () => "an"
  },

  // Verb Form Errors
  {
    id: "could-of",
    pattern: /\b(could|would|should|might|must)\s+of\b/gi,
    type: "grammar",
    message: 'Use "have" instead of "of" after modal verbs.',
    shortMessage: 'Use "have"',
    category: "verb-form",
    confidence: 0.95,
    replacement: (match: string) => match.replace(/\s+of\b/gi, " have")
  },
  {
    id: "i-seen",
    pattern: /\bI\s+seen\b/gi,
    type: "grammar",
    message: 'Use "I saw" or "I have seen".',
    shortMessage: 'Use "I saw"',
    category: "verb-form",
    confidence: 0.9,
    replacement: () => "I saw"
  },

  // Preposition Errors
  {
    id: "different-than",
    pattern: /\bdifferent\s+than\b/gi,
    type: "grammar",
    message: 'Use "different from" in formal writing.',
    shortMessage: 'Use "different from"',
    category: "preposition",
    confidence: 0.8,
    replacement: () => "different from"
  },
  {
    id: "try-and",
    pattern: /\btry\s+and\b/gi,
    type: "grammar",
    message: 'Use "try to" instead of "try and".',
    shortMessage: 'Use "try to"',
    category: "preposition",
    confidence: 0.85,
    replacement: () => "try to"
  },

  // Double Negatives
  {
    id: "dont-have-no",
    pattern: /\bdon't\s+have\s+no\b/gi,
    type: "grammar",
    message: 'Avoid double negatives. Use "don\'t have any".',
    shortMessage: 'Use "don\'t have any"',
    category: "double-negative",
    confidence: 0.95,
    replacement: () => "don't have any"
  },
  {
    id: "cant-hardly",
    pattern: /\bcan't\s+hardly\b/gi,
    type: "grammar",
    message: 'Avoid double negatives. Use "can hardly".',
    shortMessage: 'Use "can hardly"',
    category: "double-negative",
    confidence: 0.95,
    replacement: () => "can hardly"
  },

  // Comma Errors
  {
    id: "comma-splice",
    pattern: /\b\w+,\s+I\s+(went|did|am|was|will|have|had)/gi,
    type: "grammar",
    message: "Possible comma splice. Consider using a semicolon or period.",
    shortMessage: "Check comma usage",
    category: "punctuation",
    confidence: 0.7,
    replacement: (match: string) => match.replace(/,\s+/, "; ")
  }
] 