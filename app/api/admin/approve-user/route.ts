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

    // Find the user
    const user = await db.collection("users").findOne({ _id: userId })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user status to approved
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          status: "approved",
          approvedAt: new Date(),
        },
      },
    )

    // Send approval email to user
    await sendEmail({
      to: user.email,
      subject: "ACYUM ID Approved",
      html: `
        <h1>ACYUM ID Approved</h1>
        <p>Dear ${user.firstName},</p>
        <p>Congratulations! Your ACYUM ID has been approved.</p>
        <p>You can now access all features of the ACYUM platform using your wallet address.</p>
        <p>Your ACYUM ID: ${user.username}</p>
        <p>Thank you for joining our community!</p>
      `,
    })

    // Send notification to admin
    await sendEmail({
      to: "accalyuhh@gmail.com", // Updated to the user's email
      subject: "User Approved: " + user.username,
      html: `
        <h1>User Approved</h1>
        <p>You have approved the following user:</p>
        <ul>
          <li><strong>Username:</strong> ${user.username}</li>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
          <li><strong>Wallet Address:</strong> ${user.address}</li>
        </ul>
      `,
    })

    return NextResponse.json({ success: true, message: "User approved successfully" })
  } catch (error) {
    console.error("Error approving user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
