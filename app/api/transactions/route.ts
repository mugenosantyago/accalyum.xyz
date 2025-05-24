// import { getDb } from "@/lib/db"
import { NextResponse } from "next/server"
import { connectToDatabase } from '@/lib/db'; // Import the DB connection utility
import BankTransaction from '@/models/BankTransaction'; // Import the Mongoose model
import { logger } from '@/lib/logger'; // Import logger

// Define a Transaction type (aligned with BankTransaction model)
interface Transaction {
  _id?: string; // Optional _id
  address: string; // User's Alephium address
  type: "deposit" | "withdraw" | "donation" | "interest_payout"; // Include all types from model
  token: 'ALPH' | 'ACYUM' | 'sWEA'; // Added token
  amount: string;
  txId: string;
  initiative?: string; // Optional initiative field
  // status: "pending" | "completed" | "failed"; // Status is not in BankTransaction model
  timestamp: Date;
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const address = url.searchParams.get("address")

    if (!address) {
      logger.warn('API: Missing address parameter in transactions GET request');
      return NextResponse.json({ error: "Address is required" }, { status: 400 })
    }

    logger.info(`API: Fetching transactions for address: ${address}`);

    // Connect to DB
    await connectToDatabase();

    // Fetch transactions for the user, sorted by most recent first
    const transactions = await BankTransaction.find(
      { address: address }, // Filter by the user's address
      // { from: address }, // Use 'address' field as per BankTransaction model
      // { to: address },
    )
    .sort({ timestamp: -1 })
    .lean(); // Use lean for plain JS objects

    logger.info(`API: Found ${transactions.length} transactions for ${address}`);

    // Map to the Transaction interface (if needed, but lean() should be close)
    // const formattedTransactions: Transaction[] = transactions.map(tx => ({ ...tx, _id: tx._id.toString() }));

    return NextResponse.json({ transactions })
  } catch (error) {
    logger.error("API Error fetching transactions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json()
    // Align fields with BankTransaction model
    const { address, to, amount, type, initiative, txId, token } = data;

    // Basic validation
    // Required fields based on BankTransaction model
    if (!address || !type || !token || !amount || !txId) {
      logger.warn('API: Missing required fields in transactions POST request', { body: data });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate types (optional but good practice)
    if (!['deposit', 'withdraw', 'donation', 'interest_payout'].includes(type)) {
       logger.warn('API: Invalid transaction type in POST request', { type });
       return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }
    if (!['ALPH', 'ACYUM', 'sWEA'].includes(token)) {
       logger.warn('API: Invalid token type in POST request', { token });
       return NextResponse.json({ error: 'Invalid token type' }, { status: 400 });
    }
    try {
       // Validate amount is a non-negative number representable string (basic check)
       const amountBigInt = BigInt(amount);
       if (amountBigInt < 0n) throw new Error("Amount cannot be negative");
    } catch (e) {
       logger.warn('API: Invalid amount format in POST request', { amount, error: e });
       return NextResponse.json({ error: 'Invalid amount format' }, { status: 400 });
    }

    logger.info(`API: Recording transaction for ${address} - ${type} ${amount} ${token} (${txId})`);

    // Connect to DB
    await connectToDatabase();

    // Create and save the transaction using the Mongoose model
    const newTransaction = new BankTransaction({
      address: address, // User's address
      type: type,
      token: token,
      amount: amount, // Store as string
      txId: txId,
      timestamp: new Date(),
      initiative: initiative // Include initiative for donations
    });

    await newTransaction.save();

    logger.info(`API: Transaction recorded successfully for txId: ${txId}`);

    return NextResponse.json({
      success: true,
      transaction: {
        _id: newTransaction._id.toString(), // Return the created _id
        address: newTransaction.address, // Return the created address
        type: newTransaction.type,
        token: newTransaction.token,
        amount: newTransaction.amount,
        txId: newTransaction.txId,
        timestamp: newTransaction.timestamp,
        initiative: newTransaction.initiative,
        // status: 'completed' // Status is not in model, return conceptually
      }
    }, { status: 201 }); // Use 201 Created status

  } catch (error) {
    logger.error("API Error recording transaction:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
