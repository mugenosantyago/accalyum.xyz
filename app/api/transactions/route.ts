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
  token: 'ALPH' | 'YUM' | 'sWEA'; // Added token
  amount: string;
  txId: string;
  initiative?: string; // Optional initiative field
  // status: "pending" | "completed" | "failed"; // Status is not in BankTransaction model
  timestamp: Date;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');

    if (!address) {
      return NextResponse.json({ error: 'Missing address parameter' }, { status: 400 });
    }

    logger.info(`API: Fetching transactions for address: ${address}`);

    await connectToDatabase();

    // Find transactions for the given address, sorted by timestamp descending
    const transactions = await BankTransaction.find({ address: address }).sort({ timestamp: -1 }).lean();

    // Note: .lean() is used for performance when you don't need Mongoose document methods

    logger.info(`API: Found ${transactions.length} transactions for ${address}`);

    return NextResponse.json({ transactions });
  } catch (error) {
    logger.error('API: Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
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
    if (!['ALPH', 'YUM', 'sWEA'].includes(token)) {
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

    return NextResponse.json({ message: "Transaction recorded successfully", transactionId: newTransaction._id }, { status: 201 });

  } catch (error) {
    logger.error('API: Error recording transaction:', error);
    // Check for duplicate key error (e.g., duplicate txId)
    if (error instanceof Error && (error as any).code === 11000) { // MongoDB duplicate key error code
      return NextResponse.json({ error: 'Duplicate transaction ID' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to record transaction' }, { status: 500 });
  }
}
