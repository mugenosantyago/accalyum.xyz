import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, username, email, address, firstName, lastName, addressDigits, politicalParties, status } = body

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }

    // Connect to database
    const { db } = await connectToDatabase()

    // Find the user before update
    const existingUser = await db.collection("users").findOne({ _id: userId })

    if (!existingUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Check if username, email, or address is already taken by another user
    if (username !== existingUser.username || email !== existingUser.email || address !== existingUser.address) {
      const duplicateCheck = await db.collection("users").findOne({
        _id: { $ne: userId },
        $or: [
          { username: username || existingUser.username },
          { email: email || existingUser.email },
          { address: address || existingUser.address },
        ],
      })

      if (duplicateCheck) {
        if (duplicateCheck.username === username) {
          return NextResponse.json({ error: "Username already taken" }, { status: 400 })
        }
        if (duplicateCheck.email === email) {
          return NextResponse.json({ error: "Email already registered" }, { status: 400 })
        }
        if (duplicateCheck.address === address) {
          return NextResponse.json({ error: "Wallet address already registered" }, { status: 400 })
        }
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (username !== undefined) updateData.username = username
    if (email !== undefined) updateData.email = email
    if (address !== undefined) updateData.address = address
    if (firstName !== undefined) updateData.firstName = firstName
    if (lastName !== undefined) updateData.lastName = lastName
    if (addressDigits !== undefined) updateData.addressDigits = addressDigits
    if (politicalParties !== undefined) updateData.politicalParties = politicalParties

    // Handle status change
    let statusChanged = false
    if (status !== undefined && status !== existingUser.status) {
      updateData.status = status
      statusChanged = true

      if (status === "approved") {
        updateData.approvedAt = new Date()
      } else if (status === "rejected") {
        updateData.rejectedAt = new Date()
      }
    }

    // Update the user
    await db.collection("users").updateOne({ _id: userId }, { $set: updateData })

    // Send email notifications based on status change
    if (statusChanged) {
      if (status === "approved" && email) {
        // Send approval email to user
        await sendEmail({
          to: email,
          subject: "ACYUM ID Approved",
          html: `
            <h1>ACYUM ID Approved</h1>
            <p>Dear ${firstName || existingUser.firstName},</p>
            <p>Congratulations! Your ACYUM ID has been approved.</p>
            <p>You can now access all features of the ACYUM platform using your wallet address.</p>
            <p>Your ACYUM ID: ${username || existingUser.username}</p>
            <p>Thank you for joining our community!</p>
          `,
        })
      } else if (status === "rejected" && email) {
        // Send rejection email to user
        await sendEmail({
          to: email,
          subject: "ACYUM ID Registration Rejected",
          html: `
            <h1>ACYUM ID Registration Rejected</h1>
            <p>Dear ${firstName || existingUser.firstName},</p>
            <p>We regret to inform you that your ACYUM ID registration has been rejected.</p>
            <p>If you believe this is an error or would like to provide additional information, please contact our support team.</p>
          `,
        })
      }
    }

    // Send notification to admin
    await sendEmail({
      to: "accalyuhh@gmail.com", // Updated to the user's email
      subject: "User Updated: " + (username || existingUser.username),
      html: `
        <h1>User Updated</h1>
        <p>You have updated the following user:</p>
        <ul>
          <li><strong>Username:</strong> ${username || existingUser.username}</li>
          <li><strong>Email:</strong> ${email || existingUser.email}</li>
          <li><strong>Name:</strong> ${firstName || existingUser.firstName} ${lastName || existingUser.lastName}</li>
          <li><strong>Wallet Address:</strong> ${address || existingUser.address}</li>
          <li><strong>Status:</strong> ${status || existingUser.status}</li>
        </ul>
      `,
    })

    return NextResponse.json({ success: true, message: "User updated successfully" })
  } catch (error) {
    console.error("Error updating user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
