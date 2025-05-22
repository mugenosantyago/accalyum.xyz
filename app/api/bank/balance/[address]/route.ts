import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BankTransaction from '@/models/BankTransaction';
import { logger } from '@/lib/logger';
import mongoose from 'mongoose';

// Helper function updated to accept sWEA
function calculateNetBalance(transactions: any[], tokenSymbol: 'ALPH' | 'ACYUM' | 'sWEA'): string {
  let netBalance = 0n;
  transactions.forEach(tx => {
    if (tx.token !== tokenSymbol) return;
    try {
      const amountBigInt = BigInt(tx.amount || '0');
      if (tx.type === 'deposit' || tx.type === 'interest_payout') {
        netBalance += amountBigInt;
      } else if (tx.type === 'withdraw') {
        netBalance -= amountBigInt;
      }
    } catch (e) {
      logger.error('Error processing transaction amount for balance calculation:', e, { tx });
    }
  });
  return netBalance.toString();
}

export async function GET(request: Request, { params }: { params: { address: string } }) {
  const { address } = params;

  if (!address) {
    logger.warn('API: Missing address parameter in bank balance request');
    return NextResponse.json({ error: 'Address parameter is missing' }, { status: 400 });
  }

  logger.info(`API: Fetching bank balance for address: ${address}`);

  try {
    // Check MongoDB connection state
    if (mongoose.connection.readyState !== 1) {
      logger.info('API: MongoDB not connected, attempting to connect...');
      await connectToDatabase();
      logger.info('API: MongoDB connection established');
    }

    // Verify the BankTransaction model is registered
    if (!mongoose.models.BankTransaction) {
      logger.error('API: BankTransaction model not registered');
      throw new Error('Database model not properly initialized');
    }

    // Fetch all relevant transactions for the user, including sWEA
    const userTransactions = await BankTransaction.find(
      { address: address, token: { $in: ['ALPH', 'ACYUM', 'sWEA'] } },
      { token: 1, type: 1, amount: 1, _id: 0 }
    ).lean();

    logger.debug(`Raw transactions fetched for ${address}:`, userTransactions);

    // Calculate net balances for all three tokens
    const alphBalance = calculateNetBalance(userTransactions, 'ALPH');
    const acyumBalance = calculateNetBalance(userTransactions, 'ACYUM');
    const sweaBalance = calculateNetBalance(userTransactions, 'sWEA');

    logger.info(`API: Calculated net balance for ${address}: ALPH=${alphBalance}, ACYUM=${acyumBalance}, sWEA=${sweaBalance}`);

    // Return all balances as strings
    return NextResponse.json({
      alphBalance: alphBalance,
      acyumBalance: acyumBalance,
      sweaBalance: sweaBalance,
    });

  } catch (error) {
    logger.error(`API Error fetching bank balance for ${address}:`, error);
    
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

    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 