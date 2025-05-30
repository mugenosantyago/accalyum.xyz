import { NextResponse } from "next/server";
import { connectToDatabase } from '@/lib/db';
import SweaClaimRequest from '@/models/SweaClaimRequest'; // Import the new model
import { logger } from '@/lib/logger';

// POST handler for submitting a new sWEA claim request
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { acyumId, requesterAddress, amount, tokenId } = data;

    // Basic validation
    if (!acyumId || !requesterAddress || !amount || !tokenId) {
      logger.warn('API: Missing required fields in sWEA claim request POST', { body: data });
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    logger.info(`API: Received sWEA claim request for Acyum ID: ${acyumId}, Address: ${requesterAddress}`);

    await connectToDatabase();

    // Optional: Add a check here to see if the address/acyumId has already claimed
    const existingRequest = await SweaClaimRequest.findOne({ requesterAddress: requesterAddress, status: { $ne: 'rejected' } }); // Consider checking by acyumId too
    if (existingRequest) {
        logger.warn(`API: Duplicate sWEA claim request from address: ${requesterAddress}`);
        return NextResponse.json({ error: "You have already submitted a claim request or claimed sWEA." }, { status: 409 });
    }

    // Create a new claim request document
    const newClaimRequest = new SweaClaimRequest({
      acyumId,
      requesterAddress,
      amount: amount.toString(), // Ensure amount is stored as string
      tokenId,
      status: 'pending', // Default status
    });

    await newClaimRequest.save();

    logger.info(`API: sWEA claim request saved for ${requesterAddress}.`);

    return NextResponse.json({ message: "sWEA claim request submitted successfully", requestId: newClaimRequest._id }, { status: 201 });

  } catch (error) {
    logger.error('API: Error submitting sWEA claim request:', error);
     // Check for duplicate key error if a unique index is added later
    if (error instanceof Error && (error as any).code === 11000) { 
      return NextResponse.json({ error: 'Duplicate claim request' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to submit sWEA claim request' }, { status: 500 });
  }
}

// GET handler for fetching sWEA claim requests (e.g., for admin)
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') || 'pending'; // Default to fetching pending requests
        // Optional: Add filtering by address or acyumId if needed for specific views

        logger.info(`API: Fetching sWEA claim requests with status: ${status}`);

        await connectToDatabase();

        // Find claim requests based on status, sorted by creation date
        const claimRequests = await SweaClaimRequest.find({ status: status }).sort({ createdAt: 1 }).lean();

        logger.info(`API: Found ${claimRequests.length} sWEA claim requests.`);

        return NextResponse.json({ claimRequests });

    } catch (error) {
        logger.error('API: Error fetching sWEA claim requests:', error);
        return NextResponse.json({ error: 'Failed to fetch sWEA claim requests' }, { status: 500 });
    }
} 