import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose, { Types } from 'mongoose';
import { logger } from '@/lib/logger';
import BankTransaction, { IBankTransaction } from '@/models/BankTransaction'; // Import model and interface

// Define a simple interface for ledger entries for clarity in this file
interface LedgerEntry {
  id: string; // Use _id from MongoDB
  type: 'deposit' | 'withdraw' | 'interest_payout' | 'donation'; // Include 'donation'
  token: 'ALPH' | 'YUM' | 'sWEA';
  amount: string; // Amount in smallest unit (string)
  txId: string;
  timestamp: Date;
}

interface BankTransaction {
  _id: string;
  address: string;
  type: 'deposit' | 'withdraw' | 'donation' | 'interest_payout';
  token: 'ALPH' | 'YUM' | 'sWEA'; // Updated to include sWEA
  amount: string;
  txId: string;
  timestamp: string;
  initiative?: string; // Optional for donations
}

export async function GET(request: Request, { params }: { params: { address: string } }) {
  const { address } = params;

  if (!address) {
    logger.warn('API: Missing address parameter in bank ledger request');
    return NextResponse.json({ error: 'Address parameter is missing' }, { status: 400 });
  }

  logger.info(`API: Fetching bank transaction ledger for address: ${address}`);

  try {
    // Enhanced connection check with more detailed logging
    const connectionState = mongoose.connection.readyState;
    logger.info(`MongoDB Connection State: ${connectionState}`);

    if (connectionState !== 1) {
      logger.warn('API: MongoDB not connected, attempting to reconnect...');
      try {
        await connectToDatabase();
      } catch (connectionError) {
        logger.error('API: Failed to reconnect to MongoDB:', connectionError);
        return NextResponse.json({ 
          error: 'Database Connection Failed', 
          details: connectionError instanceof Error ? connectionError.message : 'Unknown connection error'
        }, { status: 500 });
      }
    }

    // Verify the BankTransaction model is registered
    if (!mongoose.models.BankTransaction) {
      logger.error('API: BankTransaction model not registered');
      return NextResponse.json({ 
        error: 'Database Model Error', 
        details: 'BankTransaction model not initialized' 
      }, { status: 500 });
    }

    logger.info('API: Executing bank ledger query...');

    // Fetch transactions for the user, sorted by most recent first
    const transactions: IBankTransaction[] = await BankTransaction.find(
      { address: address }, 
      { _id: 1, type: 1, token: 1, amount: 1, txId: 1, timestamp: 1 } // Select necessary fields including _id
    )
    .sort({ timestamp: -1 }) // Sort by timestamp descending
    .lean()
    .catch((queryError) => {
      logger.error('API: Error executing transaction query:', queryError);
      throw queryError;
    });

    if (!transactions || transactions.length === 0) {
      logger.warn(`API: No transactions found for address: ${address}`);
      return NextResponse.json({ ledger: [] });
    }

    logger.info(`API: Found ${transactions.length} transactions for ${address}`);

    // Map to the LedgerEntry format, casting _id
    const ledger: LedgerEntry[] = transactions.map(tx => {
      try {
        if (!tx._id) {
          throw new Error('Transaction missing _id');
        }
        
        return {
          id: (tx._id as Types.ObjectId).toString(), // Cast _id before calling toString
          type: tx.type,
          token: tx.token,
          amount: tx.amount,
          txId: tx.txId,
          timestamp: tx.timestamp,
        };
      } catch (error) {
        logger.error(`Error processing transaction ${tx._id}:`, error);
        throw new Error(`Failed to process transaction ${tx._id}`);
      }
    });

    logger.info(`API: Successfully processed ${ledger.length} ledger entries for ${address}`);

    return NextResponse.json({ ledger });

  } catch (error) {
    logger.error(`API Error fetching bank ledger for ${address}:`, error);
    
    // Comprehensive error logging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    logger.error('Detailed Error:', errorDetails);

    // Return a more detailed error response
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: errorDetails.message,
      type: errorDetails.name,
      timestamp: errorDetails.timestamp
    }, { status: 500 });
  }
} 