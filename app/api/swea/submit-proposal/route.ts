import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { connectToDatabase } from '@/lib/db'; // Assuming you have this utility
import SweaProposal from '@/models/SweaProposal';
import { config } from '@/lib/config'; // For admin email if needed, though sendEmail handles BCC

interface SubmitProposalRequestBody {
  submitterAddress: string;
  yumProposalId: string;
  submitterName: string;
  voteMessage: string;
  userYumIdentifier?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SubmitProposalRequestBody = await request.json();
    const { submitterAddress, yumProposalId, submitterName, voteMessage, userYumIdentifier } = body;

    if (!yumProposalId || !submitterName || !voteMessage) {
      return NextResponse.json({ error: 'Missing required fields: yumProposalId, submitterName, voteMessage are required.' }, { status: 400 });
    }
    
    logger.info(`New sWEA Proposal/Vote submission from ${submitterAddress} for Proposal ID: ${yumProposalId}`);

    // 1. Send email notification (to admin via BCC in sendEmail)
    const emailSubject = `New sWEA Proposal/Vote: ${yumProposalId.substring(0, 50)}`;
    const emailHtml = `
      <p>A new sWEA Proposal/Vote has been submitted:</p>
      <ul>
        <li><strong>Submitter Address:</strong> ${submitterAddress}</li>
        <li><strong>YUM/Proposal ID:</strong> ${yumProposalId}</li>
        <li><strong>Submitter Name:</strong> ${submitterName}</li>
        <li><strong>Message/Justification:</strong> ${voteMessage}</li>
        ${userYumIdentifier ? `<li><strong>User YUM Identifier:</strong> ${userYumIdentifier}</li>` : ''}
      </ul>
      <p>Please review this submission in the admin dashboard.</p>
    `;

    // The `sendEmail` function from `lib/email.ts` automatically BCCs "accalyuhh@gmail.com"
    // So, we can use a primary recipient that makes sense, or even the submitter's email if we collected it.
    // For now, let's send it primarily to the admin email for clarity, knowing it also gets the BCC.
    const emailResult = await sendEmail({
      to: config.alephium.adminAddress,
      subject: emailSubject,
      html: emailHtml,
      from: "sWEA Governance <noreply@yum.com>" // Specific from address
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
      yumProposalId,
      submitterName,
      voteMessage,
      userYumIdentifier,
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