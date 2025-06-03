import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db'; // Use the utility from lib/db.ts
import BankTransaction from '@/models/BankTransaction'; // Import the Mongoose model
import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { address, type, token, amount, txId } = body;

    // Basic validation
    if (!address || !type || !token || !amount || !txId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!['deposit', 'withdraw'].includes(type)) {
      return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 });
    }
    if (!['ALPH', 'YUM', 'sWEA'].includes(token)) {
      return NextResponse.json({ error: 'Invalid token type' }, { status: 400 });
    }
    // Validate amount is a non-negative number representable string (basic check)
    try {
      const amountBigInt = BigInt(amount);
      if (amountBigInt < 0n) throw new Error("Amount cannot be negative");
    } catch (e) {
      return NextResponse.json({ error: 'Invalid amount format' }, { status: 400 });
    }

    logger.info(`API: Recording bank transaction for ${address} - ${type} ${amount} ${token} (${txId})`);

    // Connect to DB using the utility function
    await connectToDatabase(); 

    // Create and save the transaction using the Mongoose model
    const newTransaction = new BankTransaction({
      address,
      type,
      token,
      amount, // Store as string as defined in schema
      txId,
      timestamp: new Date(),
    });

    await newTransaction.save();

    logger.info(`API: Bank transaction recorded successfully for txId: ${txId}`);
    return NextResponse.json({ message: 'Transaction recorded successfully' }, { status: 201 });

  } catch (error) {
    logger.error('API Error recording bank transaction:', error);
    // Handle potential duplicate txId error (unique constraint)
    if (error instanceof Error && 'code' in error && error.code === 11000) {
        return NextResponse.json({ error: 'Transaction with this txId already recorded' }, { status: 409 }); // Conflict
    }
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 