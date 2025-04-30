import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getDb } from "@/lib/db"; // Assuming getDb provides MongoDB access
import { logger } from '@/lib/logger';

// --- Configuration & Type Definition --- (Removed unused constants/types)

// Define User type matching the one in admin route (ideally import from central location)
interface User {
  _id?: string;
  address: string;
  username: string;
  email: string;
  isAdmin: boolean;
  createdAt: Date;
  acyumId?: string;
  hasClaimedInitialSwea?: boolean;
}

// --- API Handler --- (No longer needs SENDER_PRIVATE_KEY)
export async function POST(request: Request) {
    logger.info("POST /api/claim-swea: Eligibility check request received");

    let requestBody;
    try {
        requestBody = await request.json();
        if (!requestBody.acyumId || !requestBody.claimingAddress) {
            logger.warn("POST /api/claim-swea: Bad Request - Missing acyumId or claimingAddress");
            return NextResponse.json({ message: 'Bad Request: Missing acyumId or claimingAddress' }, { status: 400 });
        }
    } catch (e) {
        logger.warn("POST /api/claim-swea: Bad Request - Invalid JSON body");
        return NextResponse.json({ message: 'Bad Request: Invalid JSON body' }, { status: 400 });
    }

    const { acyumId, claimingAddress } = requestBody;
    logger.info(`POST /api/claim-swea: Eligibility check for Acyum ID: ${acyumId}, Address: ${claimingAddress}`);

    try {
        const db = await getDb();
        const usersCollection = db.collection<User>('users');

        // 1. Find User by Acyum ID and Address
        const user = await usersCollection.findOne({
            acyumId: acyumId,
            address: claimingAddress,
        });

        if (!user) {
            logger.warn(`POST /api/claim-swea: User not found or address mismatch for Acyum ID: ${acyumId}, Address: ${claimingAddress}`);
            return NextResponse.json({ eligible: false, message: 'User not found, or wallet address does not match the registered Acyum ID.' }, { status: 404 });
        }

        // 2. Check if Already Claimed
        if (user.hasClaimedInitialSwea) {
            logger.info(`POST /api/claim-swea: User ${claimingAddress} (Acyum ID: ${acyumId}) has already claimed.`);
            return NextResponse.json({ eligible: false, message: 'You have already claimed your initial sWEA.' }, { status: 409 }); // 409 Conflict
        }

        logger.info(`POST /api/claim-swea: User ${claimingAddress} is eligible. Updating claim status in DB...`);

        // 3. Update User Record in DB to mark as claimed *before* returning eligibility
        // This prevents race conditions where user might trigger claim twice before frontend confirms.
        const updateResult = await usersCollection.updateOne(
            { _id: user._id },
            { $set: { hasClaimedInitialSwea: true } }
        );

        if (updateResult.modifiedCount !== 1) {
            logger.error(`POST /api/claim-swea: Failed to update claim status in DB for user ${claimingAddress} (Acyum ID: ${acyumId}). Eligibility check failed.`);
            // If DB update fails, don't allow the claim to proceed.
            return NextResponse.json({ eligible: false, message: 'Server error: Could not update claim status. Please try again.' }, { status: 500 });
        }

        logger.info(`POST /api/claim-swea: Successfully updated claim status for ${claimingAddress}. User is eligible to proceed with contract call.`);
        // Return success, indicating the frontend can now trigger the contract call.
        return NextResponse.json({ eligible: true, message: 'Eligibility confirmed. You can now proceed to claim from the contract.' }, { status: 200 });

    } catch (error: any) {
        logger.error(`POST /api/claim-swea: Error processing eligibility check for ${claimingAddress}:`, error);
        return NextResponse.json({ eligible: false, message: 'Internal Server Error' }, { status: 500 });
    }
} 