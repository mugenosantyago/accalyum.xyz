import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/db"
import { sendEmail } from "@/lib/email"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, email, address, firstName, lastName, addressDigits, politicalParties } = body

    // Validate required fields
    if (!username || !email || !address || !firstName || !lastName) {
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

    // Create new user with approved status (since it's created by admin)
    const newUser = {
      username,
      email,
      address,
      firstName,
      lastName,
      addressDigits: addressDigits || "",
      politicalParties: politicalParties || [],
      status: "approved", // Admin-created users are automatically approved
      createdAt: new Date(),
      approvedAt: new Date(),
    }

    const result = await db.collection("users").insertOne(newUser)

    // Send welcome email to user
    await sendEmail({
      to: email,
      subject: "Welcome to ACYUM",
      html: `
        <h1>Welcome to ACYUM</h1>
        <p>Dear ${firstName},</p>
        <p>An ACYUM ID has been created for you by an administrator.</p>
        <p>Your ACYUM ID: ${username}</p>
        <p>You can now access all features of the ACYUM platform using your wallet address.</p>
        <p>Thank you for joining our community!</p>
      `,
    })

    // Send notification to admin
    await sendEmail({
      to: "accalyuhh@gmail.com", // Updated to the user's email
      subject: "New User Created: " + username,
      html: `
        <h1>New User Created</h1>
        <p>You have created the following user:</p>
        <ul>
          <li><strong>Username:</strong> ${username}</li>
          <li><strong>Email:</strong> ${email}</li>
          <li><strong>Name:</strong> ${firstName} ${lastName}</li>
          <li><strong>Wallet Address:</strong> ${address}</li>
          <li><strong>Address Digits:</strong> ${addressDigits || "Not provided"}</li>
          <li><strong>Political Parties:</strong> ${
            politicalParties && politicalParties.length > 0 ? politicalParties.join(", ") : "None selected"
          }</li>
        </ul>
      `,
    })

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      userId: result.insertedId,
    })
  } catch (error) {
    console.error("Error creating user:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 },
    )
  }
}
