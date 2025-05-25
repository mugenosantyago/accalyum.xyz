import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { config } from "@/lib/config";
import ProposalModel, { ProposalDocument } from "@/models/Proposal";
import { Types } from 'mongoose';

export async function POST(request: Request) {
  try {
    // Admin authentication check
    const requestHeaders = new Headers(request.headers);
    const walletAddress = requestHeaders.get("x-wallet-address");

    if (!walletAddress || walletAddress.toLowerCase() !== config.alephium.adminAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json({ error: "Missing required fields: title and content" }, { status: 400 });
    }

    await connectToDatabase();

    const newProposal = await ProposalModel.create({
      title,
      content,
      authorAddress: walletAddress, // Assign the admin's address as author
      status: 'draft', // Newly created proposals start as drafts
    });

    return NextResponse.json({ success: true, message: "Proposal created successfully", proposalId: newProposal._id.toString() });

  } catch (error) {
    console.error("Error creating proposal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    // Admin authentication check
    const requestHeaders = new Headers(request.headers);
    const walletAddress = requestHeaders.get("x-wallet-address");

    if (!walletAddress || walletAddress.toLowerCase() !== config.alephium.adminAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const proposals = await ProposalModel.find().sort({ createdAt: -1 }).lean(); // Fetch all proposals, sort by creation date, and return plain objects

    // Convert ObjectId to string for the response
    const plainProposals = proposals.map(proposal => ({
      ...proposal,
      _id: proposal._id.toString(),
      // Ensure Date objects are serialized correctly if needed, though .lean() usually handles this for basic types
    }));

    return NextResponse.json({ proposals: plainProposals });

  } catch (error) {
    console.error("Error fetching proposals:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    // Admin authentication check
    const requestHeaders = new Headers(request.headers);
    const walletAddress = requestHeaders.get("x-wallet-address");

    if (!walletAddress || walletAddress.toLowerCase() !== config.alephium.adminAddress.toLowerCase()) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, content, status } = body;

    if (!id) {
      return NextResponse.json({ error: "Proposal ID is required" }, { status: 400 });
    }

    if (!Types.ObjectId.isValid(id)) {
        return NextResponse.json({ error: "Invalid Proposal ID format" }, { status: 400 });
    }

    await connectToDatabase();

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (status !== undefined) updateData.status = status;

    // If status is set to 'live' and publishedAt is not already set, set publishedAt
    // This logic is also in the schema's pre-save hook, but good to have here too.
    if (status === 'live' && !updateData.publishedAt) {
       const existingProposal = await ProposalModel.findById(id);
       if (existingProposal && !existingProposal.publishedAt) {
           updateData.publishedAt = new Date();
       }
    }

    const updatedProposal = await ProposalModel.findByIdAndUpdate(id, { $set: updateData }, { new: true }).lean();

    if (!updatedProposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

     // Convert ObjectId to string for the response
    const plainUpdatedProposal = {
      ...updatedProposal,
      _id: updatedProposal._id.toString(),
    };

    return NextResponse.json({ success: true, message: "Proposal updated successfully", proposal: plainUpdatedProposal });

  } catch (error) {
    console.error("Error updating proposal:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

// TODO: Implement PUT for admin proposals 