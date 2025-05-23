import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose, { Types } from 'mongoose';
import { logger } from '@/lib/logger';
import BankTransaction, { IBankTransaction } from '@/models/BankTransaction'; // Import model and interface

// Define the shape of the ledger entry returned by the API
interface LedgerEntry {
  id: string;
  type: 'deposit' | 'withdraw' | 'interest_payout'; // Updated to match BankTransaction type
  token: 'ALPH' | 'ACYUM' | 'sWEA';
  amount: string; // Amount in smallest unit (string)
  txId: string;
  timestamp: Date;
}

export async function GET(request: Request, { params }: { params: { address: string } }) {
  const { address } = params;

  if (!address) {
    logger.warn('API: Missing address parameter in bank ledger request');
    return NextResponse.json({ error: 'Address parameter is missing' }, { status: 400 });
  }

  logger.info(`API: Fetching bank transaction ledger for address: ${address}`);

  try {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      logger.info('API: MongoDB not connected, attempting to connect...');
      const { db } = await connectToDatabase();
      
      if (!db) {
        throw new Error('Database connection failed - no database instance returned');
      }
      
      logger.info('API: MongoDB connection established');
    }

    // Verify the BankTransaction model is registered
    if (!mongoose.models.BankTransaction) {
      logger.error('API: BankTransaction model not registered');
      throw new Error('Database model not properly initialized');
    }

    logger.info('API: Executing bank ledger query...');

    // Fetch transactions for the user, sorted by most recent first
    const transactions: IBankTransaction[] = await BankTransaction.find(
      { address: address }, 
      { _id: 1, type: 1, token: 1, amount: 1, txId: 1, timestamp: 1 } // Select necessary fields including _id
    )
    .sort({ timestamp: -1 }) // Sort by timestamp descending
    .lean(); // Use lean for plain JS objects

    if (!transactions) {
      logger.warn(`API: No transactions found for address: ${address}`);
      return NextResponse.json({ ledger: [] });
    }

    logger.info(`API: Found ${transactions.length} transactions for ${address}`);
    logger.debug(`Raw transactions fetched for ${address}:`, transactions);

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
    
    // Log detailed error information
    if (error instanceof Error) {
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    // Check for specific error types
    if (error instanceof mongoose.Error) {
      logger.error('Mongoose error:', {
        name: error.name,
        message: error.message
      });
    }

    // Return a more detailed error response
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'Unknown',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 