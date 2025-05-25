import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import ProposalModel from "@/models/Proposal";

export async function GET() {
  try {
    await connectToDatabase();

    // Find proposals with status 'live'
    // Sort by publishedAt descending (most recent live first), fallback to createdAt
    const liveProposals = await ProposalModel.find({ status: 'live' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .lean();

    // Convert ObjectId to string for the response
    const plainProposals = liveProposals.map(proposal => ({
      ...proposal,
      _id: proposal._id.toString(),
    }));

    return NextResponse.json({ proposals: plainProposals });

  } catch (error) {
    console.error("Error fetching live proposals:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 