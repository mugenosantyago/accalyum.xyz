import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BankTransaction from '@/models/BankTransaction';
import { logger } from '@/lib/logger';

// Helper function to safely add/subtract BigInts represented as strings
function calculateNetBalance(transactions: any[], tokenSymbol: 'ALPH' | 'ACYUM'): string {
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

    // Fetch all relevant transactions for the user
    const userTransactions = await BankTransaction.find(
      { address: address, token: { $in: ['ALPH', 'ACYUM'] } }, // Filter by user and relevant tokens
      { token: 1, type: 1, amount: 1, _id: 0 } // Select necessary fields
    ).lean(); // Use .lean() for plain JS objects

    logger.debug(`Raw transactions fetched for ${address}:`, userTransactions);

    // Calculate net balances using BigInt in JavaScript
    const alphBalance = calculateNetBalance(userTransactions, 'ALPH');
    const acyumBalance = calculateNetBalance(userTransactions, 'ACYUM');

    logger.info(`API: Calculated net balance for ${address}: ALPH=${alphBalance}, ACYUM=${acyumBalance}`);

    // Return balances as strings
    return NextResponse.json({
      alphBalance: alphBalance,
      acyumBalance: acyumBalance,
    });

  } catch (error) {
    logger.error(`API Error fetching bank balance for ${address}:`, error);
    // Log the specific error that occurred
    if (error instanceof Error) {
      logger.error(`Error details: ${error.message}`, { stack: error.stack });
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 