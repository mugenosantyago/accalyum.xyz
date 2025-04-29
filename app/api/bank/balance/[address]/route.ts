import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import BankTransaction from '@/models/BankTransaction';
import { logger } from '@/lib/logger';

// Helper function to safely add BigInts represented as strings
function addBigIntStrings(str1: string | undefined | null, str2: string | undefined | null): string {
  try {
    const num1 = BigInt(str1 || '0');
    const num2 = BigInt(str2 || '0');
    return (num1 + num2).toString();
  } catch (e) {
    logger.error('Error adding BigInt strings:', e, { str1, str2 });
    return '0'; // Return '0' on error
  }
}

export async function GET(request: Request, { params }: { params: { address: string } }) {
  const { address } = params;

  if (!address) {
    return NextResponse.json({ error: 'Address parameter is missing' }, { status: 400 });
  }

  logger.info(`API: Fetching bank balance for address: ${address}`);

  try {
    await connectToDatabase();

    // Aggregation pipeline to calculate net balances
    const aggregationResult = await BankTransaction.aggregate([
      {
        $match: { address: address } // Filter by user address
      },
      {
        $group: {
          _id: { token: '$token', type: '$type' }, // Group by token and type
          totalAmount: { $sum: { $toLong: '$amount' } } // Sum amounts (convert string to long/BigInt compatible)
        }
      },
      {
        $group: {
          _id: '$_id.token', // Group by token only now
          deposits: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'deposit'] }, '$totalAmount', 0n] // BigInt literal 0n
            }
          },
          withdrawals: {
            $sum: {
              $cond: [{ $eq: ['$_id.type', 'withdraw'] }, '$totalAmount', 0n] // BigInt literal 0n
            }
          }
        }
      },
      {
        $project: {
          _id: 0, // Exclude default _id
          token: '$_id',
          netBalance: { $subtract: ['$deposits', '$withdrawals'] }
        }
      }
    ]);

    logger.debug(`Aggregation result for ${address}:`, aggregationResult);

    // Process the aggregation results
    let alphBalance = 0n;
    let acyumBalance = 0n;

    aggregationResult.forEach(result => {
      if (result.token === 'ALPH') {
        alphBalance = BigInt(result.netBalance?.toString() ?? '0'); // Convert result safely
      } else if (result.token === 'ACYUM') {
        acyumBalance = BigInt(result.netBalance?.toString() ?? '0'); // Convert result safely
      }
    });

    logger.info(`API: Calculated net balance for ${address}: ALPH=${alphBalance}, ACYUM=${acyumBalance}`);

    // Return balances as strings
    return NextResponse.json({
      alphBalance: alphBalance.toString(),
      acyumBalance: acyumBalance.toString(),
    });

  } catch (error) {
    logger.error(`API Error fetching bank balance for ${address}:`, error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 