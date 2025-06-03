import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, reason } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Find the user
    const user = await db.collection("users").findOne({ _id: userId })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update user status to rejected
    await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          status: "rejected",
          rejectionReason: reason || "No reason provided",
          rejectedAt: new Date(),
        },
      },
    )

    // Send rejection email to user
    await sendEmail({
      to: user.email,
      subject: "YUM ID Registration Rejected",
      html: `
        <h1>YUM ID Registration Rejected</h1>
        <p>Dear ${user.firstName},</p>
        <p>We regret to inform you that your YUM ID registration has been rejected.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p>If you believe this is an error or would like to provide additional information, please contact our support team.</p>
      `,
    })

    // Send notification to admin
    await sendEmail({
      to: "accalyuhh@gmail.com", // Updated to the user's email
      subject: "User Rejected: " + user.username,
      html: `
        <h1>User Rejected</h1>
        <p>You have rejected the following user:</p>
        <ul>
          <li><strong>Username:</strong> ${user.username}</li>
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Name:</strong> ${user.firstName} ${user.lastName}</li>
          <li><strong>Wallet Address:</strong> ${user.address}</li>
        </ul>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : "<p>No reason provided.</p>"}
      `,
    })

    return NextResponse.json({ success: true, message: "User rejected successfully" })
  } catch (error) {
    console.error("Error rejecting user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
