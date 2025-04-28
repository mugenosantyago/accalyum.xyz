import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Find the user before deletion
    const user = await db.collection("users").findOne({ _id: userId })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Delete the user
    await db.collection("users").deleteOne({ _id: userId })

    // Send notification to admin
    await sendEmail({
      to: "accalyuhh@gmail.com", // Updated to the user's email
      subject: "User Deleted: " + user.username,
      html: `
        <h1>User Deleted</h1>
        <p>You have deleted the following user:</p>
        <ul>
          <li><strong>Username:</strong> ${user.username}</li>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
          <li><strong>Wallet Address:</strong> ${user.address}</li>
        </ul>
      `,
    })

    return NextResponse.json({ success: true, message: "User deleted successfully" })
  } catch (error) {
    console.error("Error deleting user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
