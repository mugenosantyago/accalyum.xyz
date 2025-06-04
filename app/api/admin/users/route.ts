import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"
import { config } from "@/lib/config"
import { User } from "@/lib/types/user"

// Define a simple User type
// interface User {
//   _id?: string;
//   address: string;
//   username: string;
//   email: string;
//   isAdmin: boolean;
//   createdAt: Date;
//   yumId?: string;
//   hasClaimedInitialSwea?: boolean;
// }

export async function GET(request: Request) {
  try {
    // Check if the request is from an admin
    const requestHeaders = new Headers(request.headers)
    const walletAddress = requestHeaders.get("x-wallet-address")

    if (!walletAddress || walletAddress.toLowerCase() !== config.alephium.adminAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Temporarily disabled for build -> Re-enabled
    const db = await getDb()
    const users = await db
      .collection<User>("users")
      .find({ yumId: { $exists: true } })
      .sort({ createdAt: -1 })
      .project({
          _id: 1,
          address: 1,
          username: 1,
          email: 1,
          createdAt: 1,
          yumId: 1,
          hasClaimedInitialSwea: 1
      })
      .toArray()

    // Mock response for build -> Removed
    // const users: User[] = []

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error fetching users:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
