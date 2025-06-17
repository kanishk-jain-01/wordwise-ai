import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  // Add any middleware logic here if needed
  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
}
