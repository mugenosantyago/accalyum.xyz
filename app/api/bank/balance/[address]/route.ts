import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BankTransaction from '@/models/BankTransaction';
import { logger } from '@/lib/logger';

// Helper function updated to accept sWEA
function calculateNetBalance(transactions: any[], tokenSymbol: 'ALPH' | 'ACYUM' | 'sWEA'): string {
  let netBalance = 0n;
  transactions.forEach(tx => {
    if (tx.token !== tokenSymbol) return;
    try {
      const amountBigInt = BigInt(tx.amount || '0');
      if (tx.type === 'deposit') {
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
    return NextResponse.json({ error: 'Address parameter is missing' }, { status: 400 });
  }

  logger.info(`API: Fetching bank balance for address: ${address}`);

  try {
    await connectToDatabase();

    // Fetch all relevant transactions for the user, including sWEA
    const userTransactions = await BankTransaction.find(
      { address: address, token: { $in: ['ALPH', 'ACYUM', 'sWEA'] } }, // Added sWEA
      { token: 1, type: 1, amount: 1, _id: 0 }
    ).lean();

    logger.debug(`Raw transactions fetched for ${address}:`, userTransactions);

    // Calculate net balances for all three tokens
    const alphBalance = calculateNetBalance(userTransactions, 'ALPH');
    const acyumBalance = calculateNetBalance(userTransactions, 'ACYUM');
    const sweaBalance = calculateNetBalance(userTransactions, 'sWEA'); // Calculate sWEA balance

    logger.info(`API: Calculated net balance for ${address}: ALPH=${alphBalance}, ACYUM=${acyumBalance}, sWEA=${sweaBalance}`);

    // Return all balances as strings
    return NextResponse.json({
      alphBalance: alphBalance,
      acyumBalance: acyumBalance,
      sweaBalance: sweaBalance, // Add sWEA balance to response
    });

  } catch (error) {
    logger.error(`API Error fetching bank balance for ${address}:`, error);
    if (error instanceof Error) {
      logger.error(`Error details: ${error.message}`, { stack: error.stack });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 