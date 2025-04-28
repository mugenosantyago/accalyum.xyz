import { NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(request: Request) {
  try {
    const { from, to, amount, type, initiative } = await request.json()

    // Validate required fields
    if (!from || !to || !amount || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDb()

    // Create transaction record
    const transaction = {
      txId: "0x" + Math.random().toString(16).substring(2, 34), // In production, this would be the actual transaction ID
      from,
      to,
      amount,
      type,
      initiative,
      status: "completed",
      createdAt: new Date(),
    }

    await db.collection("transactions").insertOne(transaction)

    // If it's a donation, update the initiative's raised amount
    if (type === "donation" && initiative) {
      await db
        .collection("initiatives")
        .updateOne({ id: initiative }, { $inc: { raised: Number.parseFloat(amount) } }, { upsert: true })
    }

    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    console.error("Error recording transaction:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const address = searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address parameter is required" }, { status: 400 })
    }

    const db = await getDb()

    // Find transactions where the address is either the sender or receiver
    const transactions = await db
      .collection("transactions")
      .find({
        $or: [{ from: address }, { to: address }],
      })
      .sort({ createdAt: -1 })
      .toArray()

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
