import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger';
import BankTransaction from '@/models/BankTransaction';

// Helper function to calculate net balance
function calculateNetBalance(transactions: any[], token: string): string {
  try {
    let balance = 0n;
    for (const tx of transactions) {
      if (tx.token === token) {
        const amount = BigInt(tx.amount);
        if (tx.type === 'deposit' || tx.type === 'interest_payout') {
          balance += amount;
        } else if (tx.type === 'withdraw') {
          balance -= amount;
        }
      }
    }
    return balance.toString();
  } catch (error) {
    logger.error(`Error calculating balance for token ${token}:`, error);
    throw new Error(`Failed to calculate balance for token ${token}`);
  }
}

export async function GET(request: Request, { params }: { params: { address: string } }) {
  const { address } = params;

  if (!address) {
    logger.warn('API: Missing address parameter in bank balance request');
    return NextResponse.json({ error: 'Address parameter is missing' }, { status: 400 });
  }

  logger.info(`API: Fetching bank balance for address: ${address}`);

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

    logger.info('API: Executing bank balance query...');
    
    // Fetch all relevant transactions for the user, including sWEA
    const userTransactions = await BankTransaction.find(
      { address: address, token: { $in: ['ALPH', 'YUM', 'sWEA'] } },
      { token: 1, type: 1, amount: 1, _id: 0 }
    ).lean().catch((queryError) => {
      logger.error('API: Error executing transaction query:', queryError);
      throw queryError;
    });

    if (!userTransactions || userTransactions.length === 0) {
      logger.warn(`API: No transactions found for address: ${address}`);
      return NextResponse.json({
        alphBalance: '0',
        acyumBalance: '0',
        sweaBalance: '0'
      });
    }

    logger.info(`API: Found ${userTransactions.length} transactions for ${address}`);

    // Calculate net balances for all three tokens
    const alphBalance = calculateNetBalance(userTransactions, 'ALPH');
    const acyumBalance = calculateNetBalance(userTransactions, 'YUM');
    const sweaBalance = calculateNetBalance(userTransactions, 'sWEA');

    logger.info(`API: Calculated net balance for ${address}: ALPH=${alphBalance}, YUM=${acyumBalance}, sWEA=${sweaBalance}`);

    // Return all balances as strings
    return NextResponse.json({
      alphBalance,
      acyumBalance,
      sweaBalance,
    });

  } catch (error) {
    logger.error(`API Error fetching bank balance for ${address}:`, error);
    
    // Comprehensive error logging
    const errorDetails = {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'UnknownError',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    };

    logger.error('Detailed Error:', errorDetails);

    // Return a more informative error response
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: errorDetails.message,
      type: errorDetails.name,
      timestamp: errorDetails.timestamp
    }, { status: 500 });
  }
} 