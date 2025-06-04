// import { getDb } from "@/lib/db"
import { NextResponse } from "next/server"
import { config } from "@/lib/config"

// Define a User type
interface User {
  _id?: string;
  address: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  addressDigits: string;
  politicalParties: string[];
  createdAt: Date;
}

export async function GET(request: Request) {
  try {
    // Check if the request is from an admin
    const requestHeaders = new Headers(request.headers)
    const walletAddress = requestHeaders.get("x-wallet-address")

    if (!walletAddress || walletAddress.toLowerCase() !== config.alephium.adminAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Temporarily disabled for build
    // const db = await getDb()
    // const pendingUsers = await db
    //   .collection("users")
    //   .find({ yumId: { $exists: false } })
    //   .sort({ createdAt: -1 })
    //   .toArray()

    // Mock response for build
    const pendingUsers: User[] = []

    return NextResponse.json({ pendingUsers })
  } catch (error) {
    console.error("Error fetching pending approvals:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
