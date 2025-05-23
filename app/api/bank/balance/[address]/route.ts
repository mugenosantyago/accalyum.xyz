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
        if (tx.type === 'deposit') {
          balance += amount;
        } else if (tx.type === 'withdraw') {
          balance -= amount;
        } else if (tx.type === 'interest_payout') {
          balance += amount;
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

    logger.info('API: Executing bank balance query...');
    
    // Fetch all relevant transactions for the user, including sWEA
    const userTransactions = await BankTransaction.find(
      { address: address, token: { $in: ['ALPH', 'ACYUM', 'sWEA'] } },
      { token: 1, type: 1, amount: 1, _id: 0 }
    ).lean();

    if (!userTransactions) {
      logger.warn(`API: No transactions found for address: ${address}`);
      return NextResponse.json({
        alphBalance: '0',
        acyumBalance: '0',
        sweaBalance: '0'
      });
    }

    logger.info(`API: Found ${userTransactions.length} transactions for ${address}`);
    logger.debug(`Raw transactions fetched for ${address}:`, userTransactions);

    // Calculate net balances for all three tokens
    const alphBalance = calculateNetBalance(userTransactions, 'ALPH');
    const acyumBalance = calculateNetBalance(userTransactions, 'ACYUM');
    const sweaBalance = calculateNetBalance(userTransactions, 'sWEA');

    logger.info(`API: Calculated net balance for ${address}: ALPH=${alphBalance}, ACYUM=${acyumBalance}, sWEA=${sweaBalance}`);

    // Return all balances as strings
    return NextResponse.json({
      alphBalance,
      acyumBalance,
      sweaBalance,
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

    // Return a more detailed error response
    return NextResponse.json({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error',
      type: error instanceof Error ? error.name : 'Unknown',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 