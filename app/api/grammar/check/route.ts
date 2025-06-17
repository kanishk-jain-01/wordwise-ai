import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import type { GrammarSuggestion } from "@/lib/db"

export const runtime = "edge"

// Helper function to generate UUID (Edge Runtime compatible)
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Helper function to create hash (Edge Runtime compatible)
async function createHash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Enhanced grammar checking function
async function checkGrammar(text: string): Promise<GrammarSuggestion[]> {
  const suggestions: GrammarSuggestion[] = []

  // Split text into sentences for analysis
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)
  let currentOffset = 0

  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (!trimmed) continue

    // Grammar Rules
    const grammarRules = [
      // Subject-verb disagreement
      {
        pattern: /\b(there|here)\s+is\s+\w+\s+\w+s\b/gi,
        type: "grammar" as const,
        message: 'Subject-verb disagreement. Use "there are" with plural nouns.',
        shortMessage: 'Use "there are"',
        replacement: (match: string) => match.replace(/\b(there|here)\s+is\b/gi, "$1 are"),
      },
      // Its vs It's
      {
        pattern: /\bits\s+(?=\w+ing|\w+ed|\w+s\b)/gi,
        type: "grammar" as const,
        message: 'Use "it\'s" (contraction) instead of "its" (possessive) here.',
        shortMessage: 'Use "it\'s"',
        replacement: () => "it's",
      },
      // Your vs You're
      {
        pattern: /\byour\s+(?=going|coming|being|doing)/gi,
        type: "grammar" as const,
        message: 'Use "you\'re" (you are) instead of "your" (possessive).',
        shortMessage: 'Use "you\'re"',
        replacement: () => "you're",
      },
      // Then vs Than
      {
        pattern: /\bthen\s+(?=better|worse|more|less|bigger|smaller)/gi,
        type: "grammar" as const,
        message: 'Use "than" for comparisons.',
        shortMessage: 'Use "than"',
        replacement: () => "than",
      },
    ]

    // Style Rules
    const styleRules = [
      // Passive voice detection
      {
        pattern: /\b(was|were|is|are|been|being)\s+\w+ed\b/gi,
        type: "style" as const,
        message: "Consider using active voice for clearer writing.",
        shortMessage: "Consider active voice",
        replacement: (match: string) => match, // No automatic replacement for passive voice
      },
      // Redundant phrases
      {
        pattern: /\b(very unique|more unique|most unique)\b/gi,
        type: "style" as const,
        message: '"Unique" means one of a kind and cannot be modified.',
        shortMessage: 'Use "unique"',
        replacement: () => "unique",
      },
      // Wordy phrases
      {
        pattern: /\bin order to\b/gi,
        type: "style" as const,
        message: 'Consider using "to" instead of "in order to".',
        shortMessage: 'Use "to"',
        replacement: () => "to",
      },
    ]

    // Spelling Rules (common mistakes)
    const spellingRules = [
      {
        pattern: /\b(recieve|recieved|recieving)\b/gi,
        type: "spelling" as const,
        message: 'Spelling error: "i" before "e" except after "c".',
        shortMessage: "Spelling error",
        replacement: (match: string) => match.replace(/recieve/gi, "receive"),
      },
      {
        pattern: /\b(seperate|seperated|seperating)\b/gi,
        type: "spelling" as const,
        message: "Spelling error.",
        shortMessage: "Spelling error",
        replacement: (match: string) => match.replace(/seperate/gi, "separate"),
      },
      {
        pattern: /\b(definately|definatly)\b/gi,
        type: "spelling" as const,
        message: "Spelling error.",
        shortMessage: "Spelling error",
        replacement: () => "definitely",
      },
    ]

    // Apply all rules
    const allRules = [...grammarRules, ...styleRules, ...spellingRules]

    for (const rule of allRules) {
      let match
      const regex = new RegExp(rule.pattern.source, rule.pattern.flags)

      while ((match = regex.exec(trimmed)) !== null) {
        const matchOffset = currentOffset + match.index
        const replacement = typeof rule.replacement === "function" ? rule.replacement(match[0]) : rule.replacement

        suggestions.push({
          id: generateId(),
          type: rule.type,
          message: rule.message,
          shortMessage: rule.shortMessage,
          offset: matchOffset,
          length: match[0].length,
          replacements: replacement ? [replacement] : [],
          context: {
            text: trimmed,
            offset: match.index,
            length: match[0].length,
          },
        })
      }
    }

    currentOffset += sentence.length + 1
  }

  return suggestions
}

export async function POST(request: NextRequest) {
  try {
    const { text, documentId } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Create hash for caching
    const textHash = await createHash(text)
    const cacheKey = `grammar:${documentId}:${textHash}`

    // Check cache first
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ suggestions: cached })
      }
    } catch (cacheError) {
      console.warn("Cache read failed:", cacheError)
    }

    // Perform grammar check
    const suggestions = await checkGrammar(text)

    // Cache results for 1 hour
    try {
      await redis.setex(cacheKey, 3600, suggestions)
    } catch (cacheError) {
      console.warn("Cache write failed:", cacheError)
    }

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error("Grammar check error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
