import { type NextRequest, NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import crypto from "crypto"

// Enhanced tone analysis function
async function analyzeTone(text: string): Promise<string> {
  const words = text.toLowerCase().split(/\s+/)
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0)

  // Tone indicators
  const toneIndicators = {
    positive: [
      "excellent",
      "amazing",
      "wonderful",
      "fantastic",
      "great",
      "good",
      "love",
      "like",
      "happy",
      "excited",
      "thrilled",
      "delighted",
      "pleased",
      "satisfied",
      "awesome",
      "brilliant",
      "outstanding",
      "superb",
      "magnificent",
      "marvelous",
      "terrific",
    ],
    negative: [
      "terrible",
      "awful",
      "horrible",
      "bad",
      "hate",
      "dislike",
      "sad",
      "angry",
      "frustrated",
      "disappointed",
      "annoyed",
      "upset",
      "worried",
      "concerned",
      "dreadful",
      "appalling",
      "disgusting",
      "revolting",
      "pathetic",
      "useless",
    ],
    formal: [
      "therefore",
      "furthermore",
      "consequently",
      "moreover",
      "nevertheless",
      "however",
      "thus",
      "hence",
      "accordingly",
      "subsequently",
      "notwithstanding",
      "pursuant",
      "aforementioned",
      "heretofore",
      "whereas",
      "whereby",
    ],
    informal: [
      "hey",
      "hi",
      "yeah",
      "yep",
      "nope",
      "gonna",
      "wanna",
      "gotta",
      "kinda",
      "sorta",
      "dunno",
      "ain't",
      "y'all",
      "folks",
      "guys",
      "stuff",
      "things",
    ],
    confident: [
      "definitely",
      "certainly",
      "absolutely",
      "undoubtedly",
      "clearly",
      "obviously",
      "surely",
      "indeed",
      "precisely",
      "exactly",
      "guaranteed",
      "assured",
      "confident",
    ],
    uncertain: [
      "maybe",
      "perhaps",
      "possibly",
      "might",
      "could",
      "probably",
      "seems",
      "appears",
      "suggests",
      "indicates",
      "presumably",
      "allegedly",
      "supposedly",
    ],
    friendly: [
      "thanks",
      "thank you",
      "please",
      "welcome",
      "appreciate",
      "glad",
      "nice",
      "kind",
      "helpful",
      "wonderful",
      "pleasure",
      "delighted",
      "honored",
    ],
    aggressive: [
      "must",
      "should",
      "need to",
      "have to",
      "required",
      "mandatory",
      "demand",
      "insist",
      "force",
      "compel",
      "urgent",
      "critical",
      "essential",
    ],
  }

  // Count tone indicators
  const toneScores: Record<string, number> = {}

  Object.entries(toneIndicators).forEach(([tone, indicators]) => {
    toneScores[tone] = 0
    indicators.forEach((indicator) => {
      const regex = new RegExp(`\\b${indicator.replace(/'/g, "\\'")}\\b`, "gi")
      const matches = text.match(regex)
      if (matches) {
        toneScores[tone] += matches.length
      }
    })
  })

  // Analyze sentence structure for additional tone clues
  let exclamationCount = 0
  let questionCount = 0
  let avgSentenceLength = 0

  sentences.forEach((sentence) => {
    if (sentence.includes("!")) exclamationCount++
    if (sentence.includes("?")) questionCount++
    avgSentenceLength += sentence.trim().split(/\s+/).length
  })

  avgSentenceLength = sentences.length > 0 ? avgSentenceLength / sentences.length : 0

  // Adjust scores based on punctuation and structure
  if (exclamationCount > sentences.length * 0.3) {
    toneScores.excited = (toneScores.excited || 0) + exclamationCount
  }

  if (questionCount > sentences.length * 0.2) {
    toneScores.inquisitive = (toneScores.inquisitive || 0) + questionCount
  }

  if (avgSentenceLength > 20) {
    toneScores.formal += 2
  } else if (avgSentenceLength < 10) {
    toneScores.informal += 2
  }

  // Determine dominant tone
  const maxScore = Math.max(...Object.values(toneScores))
  if (maxScore === 0) return "neutral"

  const dominantTone = Object.entries(toneScores).find(([_, score]) => score === maxScore)?.[0]

  // Map to user-friendly tone names
  const toneMapping: Record<string, string> = {
    positive: "positive",
    negative: "negative",
    formal: "formal",
    informal: "casual",
    confident: "confident",
    uncertain: "tentative",
    friendly: "friendly",
    aggressive: "assertive",
    excited: "enthusiastic",
    inquisitive: "curious",
  }

  return toneMapping[dominantTone || "neutral"] || "neutral"
}

export async function POST(request: NextRequest) {
  try {
    const { text, documentId } = await request.json()

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    // Create hash for caching
    const textHash = crypto.createHash("md5").update(text).digest("hex")
    const cacheKey = `tone:${documentId}:${textHash}`

    // Check cache first
    try {
      const cached = await redis.get(cacheKey)
      if (cached) {
        return NextResponse.json({ tone: cached })
      }
    } catch (cacheError) {
      console.warn("Cache read failed:", cacheError)
    }

    // Perform tone analysis
    const tone = await analyzeTone(text)

    // Cache results for 1 hour
    try {
      await redis.setex(cacheKey, 3600, tone)
    } catch (cacheError) {
      console.warn("Cache write failed:", cacheError)
    }

    return NextResponse.json({ tone })
  } catch (error) {
    console.error("Tone analysis error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
