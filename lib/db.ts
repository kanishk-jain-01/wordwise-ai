import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export { sql }

export type User = {
  id: string
  email: string
  name: string
  password_hash: string
  created_at: string
  updated_at: string
}

export type Document = {
  id: string
  user_id: string
  title: string
  content: string
  tone: string | null
  word_count: number
  created_at: string
  updated_at: string
}

export type GrammarSuggestion = {
  id: string
  type: "grammar" | "spelling" | "style"
  message: string
  shortMessage: string
  offset: number
  length: number
  replacements: string[]
  context: {
    text: string
    offset: number
    length: number
  }
  // Enhanced metadata from the new grammar engine
  ruleId?: string
  category?: string
  confidence?: number
  examples?: {
    incorrect: string
    correct: string
  }[]
}

export type IgnoredSuggestion = {
  id: string
  document_id: string
  user_id: string
  original_text: string
  suggestion_type: "grammar" | "spelling" | "style"
  rule_id?: string
  position_start: number
  position_end: number
  context_before?: string
  context_after?: string
  ignored_at: string
}
