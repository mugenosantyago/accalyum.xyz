import { NextApiRequest, NextApiResponse } from 'next';
import { SwapRequestStore } from '@/lib/swap-store';
import { config } from '@/lib/config'; // Correct import
import { z } from 'zod';
import { logger } from '@/lib/logger';

const initiateSwapSchema = z.object({
  targetToken: z.enum(['ACYUM', 'sWEA']),
  amountAlph: z.number().positive("ALPH amount must be positive"),
  userAddress: z.string().min(1, "User address is required"),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const validation = initiateSwapSchema.safeParse(req.body);
    if (!validation.success) {
      logger.warn('Invalid swap initiation request', { errors: validation.error.errors, body: req.body });
      return res.status(400).json({ message: "Invalid request body", errors: validation.error.format() });
    }

    const { targetToken, amountAlph, userAddress } = validation.data;
    const { depositContractAddress } = config.alephium; // Access via config object

    if (!depositContractAddress) {
      logger.error('Deposit contract address is not configured in environment variables.');
      return res.status(500).json({ message: 'Server configuration error: Deposit address missing.' });
    }

    // Create the swap request record
    const swapId = await SwapRequestStore.createRequest({
      userAddress,
      targetToken,
      amountAlph,
      status: 'PENDING_DEPOSIT',
      timestamp: Date.now(),
    });

    logger.info(`Swap initiated: ${swapId}`, { userAddress, targetToken, amountAlph });

    // Return deposit instructions
    return res.status(200).json({
      message: 'Swap initiated. Please deposit the ALPH amount.',
      depositAddress: depositContractAddress,
      expectedAmountAlph: amountAlph,
      swapId: swapId,
    });

  } catch (error) {
    logger.error('Error initiating swap:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return res.status(500).json({ message });
  }
} 