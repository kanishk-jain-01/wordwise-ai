import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title, content, tone } = await request.json()
    const { id: documentId } = await params

    const wordCount = content
      ? content
          .replace(/<[^>]*>/g, "")
          .split(" ")
          .filter(Boolean).length
      : 0

    const [document] = await sql`
      UPDATE documents 
      SET title = ${title}, content = ${content}, tone = ${tone}, word_count = ${wordCount}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${documentId} AND user_id = ${session.user.id}
      RETURNING *
    `

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Update document error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: documentId } = await params

    const result = await sql`
      DELETE FROM documents 
      WHERE id = ${documentId} AND user_id = ${session.user.id}
      RETURNING id
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete document error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
