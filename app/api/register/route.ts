import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, address, firstName, lastName, addressDigits, politicalParties } = body

    // Validate required fields
    if (!username || !email || !address || !firstName || !lastName || !addressDigits || !politicalParties) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Connect to database
    const { db } = await connectToDatabase()

    // Check if user already exists
    const existingUser = await db.collection("users").findOne({
      $or: [{ username }, { email }, { address }],
    })

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json({ error: "Username already taken" }, { status: 400 })
      }
      if (existingUser.email === email) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 })
      }
      if (existingUser.address === address) {
        return NextResponse.json({ error: "Wallet address already registered" }, { status: 400 })
      }
    }

    // Create new user with pending status
    const newUser = {
      username,
      email,
      address,
      firstName,
      lastName,
      addressDigits,
      politicalParties,
      status: "pending", // Default status is pending
      createdAt: new Date(),
    }

    await db.collection("users").insertOne(newUser)

    // Send notification email to admin
    await sendEmail({
      to: "accalyuhh@gmail.com", // Updated to the user's email
      subject: "New ACYUM ID Registration Pending Approval",
      html: `
        <h1>New ACYUM ID Registration</h1>
        <p>A new user has registered and is pending approval:</p>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Name:</strong> ${firstName} ${lastName}</li>
          <li><strong>Wallet Address:</strong> ${address}</li>
          <li><strong>Address Digits:</strong> ${addressDigits}</li>
          <li><strong>Political Parties:</strong> ${politicalParties.join(", ")}</li>
        </ul>
        <p>Please review and approve or reject this registration.</p>
      `,
    })

    // Send confirmation email to user
    await sendEmail({
      to: email,
      subject: "ACYUM ID Registration Received",
      html: `
        <h1>ACYUM ID Registration Received</h1>
        <p>Dear ${firstName},</p>
        <p>Thank you for registering for an ACYUM ID. Your registration is pending approval by our administrators.</p>
        <p>You will receive another email once your registration has been reviewed.</p>
        <p>Registration Details:</p>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Wallet Address:</strong> ${address}</li>
        </ul>
        <p>If you have any questions, please contact support.</p>
      `,
    })

    return NextResponse.json({ status: "pending", message: "Registration pending approval" })
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
