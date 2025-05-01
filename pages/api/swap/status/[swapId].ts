import { NextApiRequest, NextApiResponse } from 'next';
import { SwapRequestStore } from '@/lib/swap-store';
import { z } from 'zod';
import { logger } from '@/lib/logger';

const statusSchema = z.object({
  swapId: z.string().min(1, "Swap ID is required"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    // Extract swapId from query parameters
    const { swapId } = req.query;

    // Validate the swapId
    const validation = statusSchema.safeParse({ swapId });
    if (!validation.success) {
      logger.warn('Invalid swap status request', { errors: validation.error.errors, query: req.query });
      return res.status(400).json({ message: "Invalid swap ID", errors: validation.error.format() });
    }

    const validatedSwapId = validation.data.swapId;

    // Fetch the swap request status
    const request = await SwapRequestStore.getRequest(validatedSwapId);

    if (!request) {
      logger.info(`Swap status requested for non-existent ID: ${validatedSwapId}`);
      return res.status(404).json({ message: `Swap request not found for ID: ${validatedSwapId}` });
    }

    logger.info(`Swap status retrieved for ID: ${validatedSwapId}`, { status: request.status });

    // Return the relevant status information
    // Avoid returning sensitive info if any were stored
    return res.status(200).json({
      swapId: request.id,
      status: request.status,
      targetToken: request.targetToken,
      amountAlph: request.amountAlph,
      amountTargetToken: request.amountTargetToken,
      faucetTxId: request.faucetTxId,
      failureReason: request.failureReason,
      timestamp: request.timestamp,
    });

  } catch (error) {
    logger.error(`Error fetching swap status for ID: ${req.query.swapId}`, error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ message });
  }
} 