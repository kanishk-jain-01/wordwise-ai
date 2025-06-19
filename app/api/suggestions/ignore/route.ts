import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { sql } from "@/lib/db"
import type { IgnoredSuggestion } from "@/lib/db"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      documentId,
      originalText,
      suggestionType,
      ruleId,
      positionStart,
      positionEnd,
      contextBefore,
      contextAfter,
    } = body

    // Validate required fields
    if (!documentId || !originalText || !suggestionType || positionStart === undefined || positionEnd === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get user ID from email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const userId = userResult[0].id

    // Verify user owns the document
    const documentResult = await sql`
      SELECT id FROM documents WHERE id = ${documentId} AND user_id = ${userId}
    `
    if (documentResult.length === 0) {
      return NextResponse.json({ error: "Document not found or access denied" }, { status: 404 })
    }

    // Insert ignored suggestion (ON CONFLICT DO NOTHING to handle duplicates)
    const result = await sql`
      INSERT INTO ignored_suggestions (
        document_id, 
        user_id, 
        original_text, 
        suggestion_type, 
        rule_id, 
        position_start, 
        position_end, 
        context_before, 
        context_after
      )
      VALUES (
        ${documentId}, 
        ${userId}, 
        ${originalText}, 
        ${suggestionType}, 
        ${ruleId || null}, 
        ${positionStart}, 
        ${positionEnd}, 
        ${contextBefore || null}, 
        ${contextAfter || null}
      )
      ON CONFLICT (document_id, original_text, suggestion_type, position_start) 
      DO NOTHING
      RETURNING *
    `

    return NextResponse.json({ 
      success: true, 
      ignored: result.length > 0 ? result[0] : null,
      alreadyIgnored: result.length === 0 
    })

  } catch (error) {
    console.error("Error ignoring suggestion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const documentId = searchParams.get("documentId")

    if (!documentId) {
      return NextResponse.json({ error: "Document ID required" }, { status: 400 })
    }

    // Get user ID from email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const userId = userResult[0].id

    // Get all ignored suggestions for this document
    const ignoredSuggestions = await sql`
      SELECT * FROM ignored_suggestions 
      WHERE document_id = ${documentId} AND user_id = ${userId}
      ORDER BY ignored_at DESC
    `

    return NextResponse.json({ ignoredSuggestions })

  } catch (error) {
    console.error("Error fetching ignored suggestions:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { ignoredSuggestionId } = body

    if (!ignoredSuggestionId) {
      return NextResponse.json({ error: "Ignored suggestion ID required" }, { status: 400 })
    }

    // Get user ID from email
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${session.user.email}
    `
    if (userResult.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    const userId = userResult[0].id

    // Delete the ignored suggestion (only if user owns it)
    const result = await sql`
      DELETE FROM ignored_suggestions 
      WHERE id = ${ignoredSuggestionId} AND user_id = ${userId}
      RETURNING *
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Ignored suggestion not found or access denied" }, { status: 404 })
    }

    return NextResponse.json({ success: true, deleted: result[0] })

  } catch (error) {
    console.error("Error deleting ignored suggestion:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 