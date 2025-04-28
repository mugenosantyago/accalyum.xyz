import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Wallet address is required" }, { status: 400 })
    }

    const db = await getDb()
    const user = await db.collection("users").findOne({ address })

    if (!user) {
      return NextResponse.json({ exists: false })
    }

    if (user.acyumId) {
      return NextResponse.json({
        exists: true,
        status: "approved",
        acyumId: user.acyumId,
        username: user.username,
      })
    } else {
      return NextResponse.json({
        exists: true,
        status: "pending",
      })
    }
  } catch (error) {
    console.error("Error checking ACYUM ID:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
