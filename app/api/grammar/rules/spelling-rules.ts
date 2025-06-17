export interface SpellingRule {
  id: string
  pattern: RegExp
  type: "spelling"
  message: string
  shortMessage: string
  category: string
  confidence: number
  replacement: string
  examples?: {
    incorrect: string
    correct: string
  }[]
}

export const spellingRules: SpellingRule[] = [
  // Common Misspellings - High Frequency
  {
    id: "recieve",
    pattern: /\brecieve\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "receive".',
    shortMessage: 'Spell as "receive"',
    category: "ie-ei",
    confidence: 0.95,
    replacement: "receive",
    examples: [{ incorrect: "I will recieve the package", correct: "I will receive the package" }]
  },
  {
    id: "seperate",
    pattern: /\bseperate\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "separate".',
    shortMessage: 'Spell as "separate"',
    category: "vowel-confusion",
    confidence: 0.95,
    replacement: "separate",
    examples: [{ incorrect: "Keep them seperate", correct: "Keep them separate" }]
  },
  {
    id: "definately",
    pattern: /\bdefinately\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "definitely".',
    shortMessage: 'Spell as "definitely"',
    category: "vowel-confusion",
    confidence: 0.95,
    replacement: "definitely",
    examples: [{ incorrect: "I will definately go", correct: "I will definitely go" }]
  },

  // IE/EI Confusion
  {
    id: "beleive",
    pattern: /\bbeleive\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "believe".',
    shortMessage: 'Spell as "believe"',
    category: "ie-ei",
    confidence: 0.95,
    replacement: "believe"
  },
  {
    id: "acheive",
    pattern: /\bacheive\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "achieve".',
    shortMessage: 'Spell as "achieve"',
    category: "ie-ei",
    confidence: 0.95,
    replacement: "achieve"
  },
  {
    id: "releive",
    pattern: /\breleive\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "relieve".',
    shortMessage: 'Spell as "relieve"',
    category: "ie-ei",
    confidence: 0.95,
    replacement: "relieve"
  },
  {
    id: "wierd",
    pattern: /\bwierd\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "weird".',
    shortMessage: 'Spell as "weird"',
    category: "ie-ei",
    confidence: 0.95,
    replacement: "weird"
  },

  // Double Letter Confusion
  {
    id: "accomodate",
    pattern: /\baccomodate\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "accommodate".',
    shortMessage: 'Spell as "accommodate"',
    category: "double-letter",
    confidence: 0.95,
    replacement: "accommodate"
  },
  {
    id: "occured",
    pattern: /\boccured\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "occurred".',
    shortMessage: 'Spell as "occurred"',
    category: "double-letter",
    confidence: 0.95,
    replacement: "occurred"
  },
  {
    id: "begining",
    pattern: /\bbegining\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "beginning".',
    shortMessage: 'Spell as "beginning"',
    category: "double-letter",
    confidence: 0.95,
    replacement: "beginning"
  },
  {
    id: "comming",
    pattern: /\bcomming\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "coming".',
    shortMessage: 'Spell as "coming"',
    category: "double-letter",
    confidence: 0.95,
    replacement: "coming"
  },
  {
    id: "runing",
    pattern: /\bruning\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "running".',
    shortMessage: 'Spell as "running"',
    category: "double-letter",
    confidence: 0.95,
    replacement: "running"
  },

  // Silent Letters
  {
    id: "goverment",
    pattern: /\bgoverment\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "government".',
    shortMessage: 'Spell as "government"',
    category: "silent-letter",
    confidence: 0.95,
    replacement: "government"
  },
  {
    id: "enviroment",
    pattern: /\benviroment\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "environment".',
    shortMessage: 'Spell as "environment"',
    category: "silent-letter",
    confidence: 0.95,
    replacement: "environment"
  },
  {
    id: "parlament",
    pattern: /\bparlament\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "parliament".',
    shortMessage: 'Spell as "parliament"',
    category: "silent-letter",
    confidence: 0.95,
    replacement: "parliament"
  },

  // Vowel Confusion
  {
    id: "calender",
    pattern: /\bcalender\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "calendar".',
    shortMessage: 'Spell as "calendar"',
    category: "vowel-confusion",
    confidence: 0.95,
    replacement: "calendar"
  },
  {
    id: "cemetary",
    pattern: /\bcemetary\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "cemetery".',
    shortMessage: 'Spell as "cemetery"',
    category: "vowel-confusion",
    confidence: 0.95,
    replacement: "cemetery"
  },
  {
    id: "independant",
    pattern: /\bindependant\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "independent".',
    shortMessage: 'Spell as "independent"',
    category: "vowel-confusion",
    confidence: 0.95,
    replacement: "independent"
  },
  {
    id: "maintainance",
    pattern: /\bmaintainance\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "maintenance".',
    shortMessage: 'Spell as "maintenance"',
    category: "vowel-confusion",
    confidence: 0.95,
    replacement: "maintenance"
  },

  // Consonant Confusion
  {
    id: "alot",
    pattern: /\balot\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "a lot" (two words).',
    shortMessage: 'Spell as "a lot"',
    category: "word-spacing",
    confidence: 0.95,
    replacement: "a lot"
  },
  {
    id: "allright",
    pattern: /\ballright\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "all right" (two words).',
    shortMessage: 'Spell as "all right"',
    category: "word-spacing",
    confidence: 0.9,
    replacement: "all right"
  },
  {
    id: "noone",
    pattern: /\bnoone\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "no one" (two words).',
    shortMessage: 'Spell as "no one"',
    category: "word-spacing",
    confidence: 0.95,
    replacement: "no one"
  },

  // Suffix Confusion
  {
    id: "arguement",
    pattern: /\barguement\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "argument".',
    shortMessage: 'Spell as "argument"',
    category: "suffix",
    confidence: 0.95,
    replacement: "argument"
  },
  {
    id: "judgement",
    pattern: /\bjudgement\b/gi,
    type: "spelling",
    message: 'In American English, "judgment" is preferred.',
    shortMessage: 'Use "judgment"',
    category: "suffix",
    confidence: 0.8,
    replacement: "judgment"
  },
  {
    id: "acknowledgement",
    pattern: /\backnowledgement\b/gi,
    type: "spelling",
    message: 'In American English, "acknowledgment" is preferred.',
    shortMessage: 'Use "acknowledgment"',
    category: "suffix",
    confidence: 0.8,
    replacement: "acknowledgment"
  },

  // Commonly Confused Words
  {
    id: "loose-lose",
    pattern: /\bloose\s+(?=weight|money|time|interest|hope|control)/gi,
    type: "spelling",
    message: 'Use "lose" when something is lost or defeated.',
    shortMessage: 'Use "lose"',
    category: "confused-words",
    confidence: 0.9,
    replacement: "lose"
  },
  {
    id: "affect-effect",
    pattern: /\baffect\s+(?=is|was|will|has|had|on)/gi,
    type: "spelling",
    message: 'Use "effect" as a noun meaning result or consequence.',
    shortMessage: 'Use "effect"',
    category: "confused-words",
    confidence: 0.8,
    replacement: "effect"
  },
  {
    id: "accept-except",
    pattern: /\baccept\s+(?=for|that|when|if)/gi,
    type: "spelling",
    message: 'Use "except" when excluding something.',
    shortMessage: 'Use "except"',
    category: "confused-words",
    confidence: 0.85,
    replacement: "except"
  },

  // Frequently Misspelled Words
  {
    id: "necesary",
    pattern: /\bnecesary\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "necessary".',
    shortMessage: 'Spell as "necessary"',
    category: "common-misspelling",
    confidence: 0.95,
    replacement: "necessary"
  },
  {
    id: "embarass",
    pattern: /\bembaras{1,2}\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "embarrass".',
    shortMessage: 'Spell as "embarrass"',
    category: "common-misspelling",
    confidence: 0.95,
    replacement: "embarrass"
  },
  {
    id: "recomend",
    pattern: /\brecomend\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "recommend".',
    shortMessage: 'Spell as "recommend"',
    category: "common-misspelling",
    confidence: 0.95,
    replacement: "recommend"
  },
  {
    id: "occassion",
    pattern: /\boccassion\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "occasion".',
    shortMessage: 'Spell as "occasion"',
    category: "common-misspelling",
    confidence: 0.95,
    replacement: "occasion"
  },
  {
    id: "privilege",
    pattern: /\bprivilege\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "privilege".',
    shortMessage: 'Spell as "privilege"',
    category: "common-misspelling",
    confidence: 0.95,
    replacement: "privilege"
  },

  // Business/Professional Terms
  {
    id: "buisness",
    pattern: /\bbuisness\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "business".',
    shortMessage: 'Spell as "business"',
    category: "professional",
    confidence: 0.95,
    replacement: "business"
  },
  {
    id: "managment",
    pattern: /\bmanagment\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "management".',
    shortMessage: 'Spell as "management"',
    category: "professional",
    confidence: 0.95,
    replacement: "management"
  },
  {
    id: "experiance",
    pattern: /\bexperiance\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "experience".',
    shortMessage: 'Spell as "experience"',
    category: "professional",
    confidence: 0.95,
    replacement: "experience"
  },
  {
    id: "responsable",
    pattern: /\bresponsable\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "responsible".',
    shortMessage: 'Spell as "responsible"',
    category: "professional",
    confidence: 0.95,
    replacement: "responsible"
  },

  // Technology Terms
  {
    id: "recieve-data",
    pattern: /\brecieve\s+(?=data|information|message|signal)/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "receive".',
    shortMessage: 'Spell as "receive"',
    category: "technology",
    confidence: 0.95,
    replacement: "receive"
  },
  {
    id: "developement",
    pattern: /\bdevelopement\b/gi,
    type: "spelling",
    message: 'Incorrect spelling. The correct spelling is "development".',
    shortMessage: 'Spell as "development"',
    category: "technology",
    confidence: 0.95,
    replacement: "development"
  }
] 