import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BankTransaction, { IBankTransaction } from '@/models/BankTransaction'; // Import model and interface
import { logger } from '@/lib/logger';
import type { Types } from 'mongoose'; // Import Types for ObjectId

// Define the shape of the ledger entry returned by the API
interface LedgerEntry {
  id: string;
  type: 'deposit' | 'withdraw';
  token: 'ALPH' | 'ACYUM' | 'sWEA';
  amount: string; // Amount in smallest unit (string)
  txId: string;
  timestamp: Date;
}

export async function GET(request: Request, { params }: { params: { address: string } }) {
  const { address } = params;

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is missing' }, { status: 400 });
  }

  logger.info(`API: Fetching bank transaction ledger for address: ${address}`);

  try {
    await connectToDatabase();

    // Fetch transactions for the user, sorted by most recent first
    const transactions: IBankTransaction[] = await BankTransaction.find(
      { address: address }, 
      { _id: 1, type: 1, token: 1, amount: 1, txId: 1, timestamp: 1 } // Select necessary fields including _id
    )
    .sort({ timestamp: -1 }) // Sort by timestamp descending
    .lean(); // Use lean for plain JS objects

    // Map to the LedgerEntry format, casting _id
    const ledger: LedgerEntry[] = transactions.map(tx => ({
        id: (tx._id as Types.ObjectId).toString(), // Cast _id before calling toString
        type: tx.type,
        token: tx.token,
        amount: tx.amount,
        txId: tx.txId,
        timestamp: tx.timestamp,
    }));

    logger.info(`API: Found ${ledger.length} ledger entries for ${address}`);

    return NextResponse.json({ ledger });

  } catch (error) {
    logger.error(`API Error fetching bank ledger for ${address}:`, error);
    if (error instanceof Error) {
      logger.error(`Error details: ${error.message}`, { stack: error.stack });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 