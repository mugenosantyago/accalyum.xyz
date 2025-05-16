import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/db'; // Assuming you have this utility
import SweaProposal from '@/models/SweaProposal';
import { config } from '@/lib/config'; // For admin email if needed, though sendEmail handles BCC

interface SubmitProposalRequest {
  submitterAddress?: string;
  acyumProposalId: string;
  submitterName: string;
  voteMessage: string;
  userAcyumIdentifier?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SubmitProposalRequest;
    const { submitterAddress, acyumProposalId, submitterName, voteMessage, userAcyumIdentifier } = body;

    if (!acyumProposalId || !submitterName || !voteMessage) {
      return NextResponse.json({ error: 'Missing required fields: acyumProposalId, submitterName, voteMessage are required.' }, { status: 400 });
    }
    
    logger.info('Received sWEA proposal submission:', body);

    // 1. Send email notification (to admin via BCC in sendEmail)
    const emailSubject = `New sWEA Proposal/Vote: ${acyumProposalId.substring(0, 50)}`;
    const emailHtml = `
      <h1>New sWEA Proposal/Vote Submission</h1>
      <p>A new proposal or vote has been submitted for sWEA.</p>
      <ul>
        <li><strong>Submitter Wallet Address:</strong> ${submitterAddress || 'Not provided (anonymous or error)'}</li>
        <li><strong>Submitter Name:</strong> ${submitterName}</li>
        <li><strong>ACYUM/Proposal ID:</strong> ${acyumProposalId}</li>
        <li><strong>Message/Justification:</strong></li>
      </ul>
      <p style="white-space: pre-wrap; border: 1px solid #eee; padding: 10px; background-color: #f9f9f9;">${voteMessage}</p>
      <hr>
      <p><em>This email was sent to the sWEA administration.</em></p>
    `;

    // The `sendEmail` function from `lib/email.ts` automatically BCCs "accalyuhh@gmail.com"
    // So, we can use a primary recipient that makes sense, or even the submitter's email if we collected it.
    // For now, let's send it primarily to the admin email for clarity, knowing it also gets the BCC.
    const emailResult = await sendEmail({
      to: config.alephium.adminAddress || "accalyuhh@gmail.com", // Primary recipient, BCC still applies
      subject: emailSubject,
      html: emailHtml,
      from: "sWEA Governance <noreply@acyum.com>" // Specific from address
    });

    if (!emailResult.success) {
      logger.error('Failed to send sWEA proposal email notification:', emailResult.error);
      // Continue to save to DB even if email fails, but log it.
    } else {
      logger.info('sWEA proposal email notification sent successfully.');
    }

    // 2. Store data for Admin Panel
    await connectToDatabase(); // Ensure DB connection

    const newProposal = new SweaProposal({
      submitterAddress: submitterAddress || 'anonymous',
      acyumProposalId,
      submitterName,
      voteMessage,
      userAcyumIdentifier,
      status: 'new',
      createdAt: new Date(),
    });

    await newProposal.save();
    logger.info('sWEA proposal saved to database with ID:', newProposal._id);

    return NextResponse.json({ message: 'Proposal submitted successfully. It has been sent for review and recorded.' }, { status: 201 });

  } catch (error) {
    logger.error('Error processing sWEA proposal submission:', error);
    let errorMessage = 'An unexpected error occurred.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 