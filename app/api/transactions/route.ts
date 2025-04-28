// import { getDb } from "@/lib/db"
import { NextResponse } from "next/server"

// Define a Transaction type
interface Transaction {
  txId: string;
  from: string;
  to: string;
  amount: string;
  type: "deposit" | "withdraw" | "donation";
  initiative?: string;
  status: "pending" | "completed" | "failed";
  createdAt: Date;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const address = url.searchParams.get("address")

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    // Temporarily disabled for build
    // const db = await getDb()
    // const transactions = await db
    //   .collection("transactions")
    //   .find({
    //     $or: [{ from: address }, { to: address }],
    //   })
    //   .sort({ createdAt: -1 })
    //   .toArray()

    // Mock response for build
    const transactions: Transaction[] = []

    return NextResponse.json({ transactions })
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    const { from, to, amount, type, initiative } = data

    if (!from || !to || !amount || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Temporarily disabled for build
    // const db = await getDb()
    // const result = await db.collection("transactions").insertOne({
    //   txId: Math.random().toString(36).substring(2, 15),
    //   from,
    //   to,
    //   amount,
    //   type,
    //   initiative,
    //   status: "completed",
    //   createdAt: new Date(),
    // })

    // Mock response for build
    const txId = Math.random().toString(36).substring(2, 15)

    return NextResponse.json({
      success: true,
      transaction: {
        txId,
        from,
        to,
        amount,
        type,
        initiative,
        status: "completed"
      }
    })
  } catch (error) {
    console.error("Error recording transaction:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
