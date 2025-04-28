import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { config } from "@/lib/config"

export async function GET(request: Request) {
  try {
    // Check if the request is from an admin
    const requestHeaders = new Headers(request.headers)
    const walletAddress = requestHeaders.get("x-wallet-address")

    if (!walletAddress || walletAddress.toLowerCase() !== config.alephium.adminAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDb()
    const users = await db
      .collection("users")
      .find({ acyumId: { $exists: true } })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
