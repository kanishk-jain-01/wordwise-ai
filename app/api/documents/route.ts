import { type NextRequest, NextResponse } from "next/server"
import { sql } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const documents = await sql`
      SELECT * FROM documents 
      WHERE user_id = ${session.user.id}
      ORDER BY updated_at DESC
    `

    return NextResponse.json({ documents })
  } catch (error) {
    console.error("Get documents error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { title = "Untitled Document", content = "" } = await request.json()
    
    // Ensure content is in proper paragraph format for TipTap
    const properContent = content || '<p></p>'

    const [document] = await sql`
      INSERT INTO documents (user_id, title, content, word_count)
      VALUES (${session.user.id}, ${title}, ${properContent}, ${properContent.replace(/<[^>]*>/g, "").split(" ").filter(Boolean).length})
      RETURNING *
    `

    return NextResponse.json({ document })
  } catch (error) {
    console.error("Create document error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
