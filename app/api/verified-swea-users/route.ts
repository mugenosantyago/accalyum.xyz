import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db'; // Import getDb
import { User } from '@/lib/types/user'; // Import the shared User type
import { logger } from '@/lib/logger'; // Optional: for logging
// We likely don't need explicit connection management here if Mongoose uses the global promise
// from lib/db.ts. If User.find fails, we might need to revisit this.

const ADMIN_API_KEY = process.env.ADMIN_API_KEY; // Ensure this is set in your environment variables

export async function GET(request: Request) {
  logger.info("GET /api/verified-swea-users: Request received");

  // 1. Check Authorization Header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn("GET /api/verified-swea-users: Unauthorized - Missing or invalid Authorization header");
    return NextResponse.json({ message: 'Unauthorized: Missing API Key' }, { status: 401 });
  }

  const apiKey = authHeader.split(' ')[1];

  if (!ADMIN_API_KEY || apiKey !== ADMIN_API_KEY) {
    logger.warn("GET /api/verified-swea-users: Unauthorized - Invalid API Key provided");
    return NextResponse.json({ message: 'Unauthorized: Invalid API Key' }, { status: 401 });
  }

  logger.info("GET /api/verified-swea-users: API Key validated successfully");

  try {
    // Get DB instance
    const db = await getDb();
    const usersCollection = db.collection<User>('users');

    // 3. Query Users with Assigned acyumId and walletAddress using MongoDB driver syntax
    const query = {
      acyumId: { $exists: true, $ne: null, $ne: "" },
      address: { $exists: true, $ne: null, $ne: "" } // Check 'address' field
    };

    // Chain the projection method
    const verifiedUsers = await usersCollection.find(query)
      .project({ address: 1, _id: 0 }) // Project only the 'address' field
      .toArray();

    // 4. Extract Wallet Addresses
    const walletAddresses = verifiedUsers
                                .map(user => user.address) // Directly map the address
                                .filter((addr): addr is string => !!addr); // Filter out any potential null/undefined if necessary

    logger.info(`GET /api/verified-swea-users: Found ${walletAddresses.length} verified users with wallet addresses.`);

    // 5. Return Addresses
    return NextResponse.json({ walletAddresses }, { status: 200 });

  } catch (error) {
    logger.error("GET /api/verified-swea-users: Error fetching verified users:", error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
} 