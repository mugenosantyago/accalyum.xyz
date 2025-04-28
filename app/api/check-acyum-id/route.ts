// import { getDb } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const username = url.searchParams.get("username")

    if (!username) {
      return NextResponse.json({ exists: false })
    }

    // Temporarily disabled for build
    // const db = await getDb()
    // const existingUser = await db.collection("users").findOne({ username: username })

    // Mock response for build
    const existingUser = null

    return NextResponse.json({ exists: !!existingUser })
  } catch (error) {
    console.error("Error checking username:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
