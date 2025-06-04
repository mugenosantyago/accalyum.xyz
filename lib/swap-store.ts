// VERY Basic in-memory store for swap requests - Replace with a proper DB in production!

import { connectToDatabase } from './db'; // Import the DB connection utility
import SwapRequestModel, { ISwapRequest } from '@/models/SwapRequest'; // Import the Mongoose model
import { logger } from './logger';
import { Types } from 'mongoose';

// Renamed interface to avoid conflict with Mongoose Document
export type SwapRequestData = Omit<ISwapRequest, '_id' | '__v' | 'timestamp' > & {
  _id?: Types.ObjectId | string; // Allow string or ObjectId for flexibility
  timestamp?: Date;
};

// Modified SwapRequestInputData to explicitly list expected fields for creation
// This avoids inheriting Mongoose Document methods from ISwapRequest via SwapRequestData
export interface SwapRequestInputData {
    userAddress: string;
    targetToken: 'YUM' | 'sWEA';
    amountAlph: number;
    depositAmountAttos?: string; // Optional for creation
    amountTargetToken?: string; // Optional for creation
    status?: 'PENDING_DEPOSIT' | 'PROCESSING' | 'COMPLETE' | 'FAILED'; // Optional for creation
    timestamp?: Date; // Optional for creation
    depositTxId?: string; // Optional for creation
    faucetTxId?: string; // Optional for creation
    failureReason?: string; // Optional for creation
}

export const SwapRequestStore = {
  async createRequest(requestInput: SwapRequestInputData): Promise<string> {
    await connectToDatabase();
    logger.info('Creating swap request in DB', requestInput);
    try {
      const newRequest = await SwapRequestModel.create({
        ...requestInput,
        status: requestInput.status || 'PENDING_DEPOSIT', // Default status if not provided
        timestamp: requestInput.timestamp || new Date(), // Default timestamp
      });
      logger.info(`Swap request created with ID: ${newRequest._id}`);
      return (newRequest._id as Types.ObjectId).toString();
    } catch (error) {
      logger.error('Error creating swap request in DB:', error);
      throw new Error('Failed to create swap request.'); // Re-throw or handle appropriately
    }
  },

  async getRequest(id: string): Promise<ISwapRequest | null> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) {
        logger.warn(`Invalid ObjectId format for getRequest: ${id}`);
        return null;
    }
    logger.debug(`Fetching swap request from DB with ID: ${id}`);
    try {
        const request = await SwapRequestModel.findById(id).lean(); // Use lean for plain JS object
        if (!request) {
            logger.info(`Swap request not found in DB for ID: ${id}`);
            return null;
        }
        logger.debug(`Swap request found: ${id}`, request);
        return request as ISwapRequest; // Cast necessary after lean()
    } catch (error) {
        logger.error(`Error fetching swap request ${id} from DB:`, error);
        return null; // Return null on error
    }
  },

  async updateRequest(id: string, updates: Partial<SwapRequestData>): Promise<boolean> {
    await connectToDatabase();
    if (!Types.ObjectId.isValid(id)) {
        logger.warn(`Invalid ObjectId format for updateRequest: ${id}`);
        return false;
    }
    logger.info(`Updating swap request ${id} in DB`, updates);
    try {
      const result = await SwapRequestModel.findByIdAndUpdate(id, updates, { new: true }); // {new: true} returns the updated doc
      if (!result) {
        logger.warn(`Swap request ${id} not found for update.`);
        return false;
      }
      logger.info(`Swap request ${id} updated successfully.`);
      return true;
    } catch (error) {
      logger.error(`Error updating swap request ${id} in DB:`, error);
      return false; // Return false on error
    }
  },

  async findPendingByDepositDetails(
      userAddress: string,
      depositAmountAttos: string
  ): Promise<ISwapRequest | null> {
    await connectToDatabase();
    logger.debug(`Searching for PENDING_DEPOSIT swap for user ${userAddress} with deposit ${depositAmountAttos} attos`);
    try {
        // Find a request matching user, status, and exact deposit amount
        // We might need more sophisticated matching later (e.g., time window)
        const request = await SwapRequestModel.findOne({
            userAddress: userAddress,
            status: 'PENDING_DEPOSIT',
            // Potential issue: If multiple requests exist for the same user+amount,
            // this picks the first one found. Consider adding timestamp constraints?
            // Or maybe match on amountAlph initially and then confirm depositAmountAttos?
            // For now, let's assume we match on userAddress and status first, then refine.
            // Let's simplify for now and find based on userAddress and status, then check amount in the service.
        }).sort({ timestamp: 1 }); // Get the oldest pending request for the user

        if (!request) {
            logger.debug(`No PENDING_DEPOSIT swap found for user ${userAddress}`);
            return null;
        }

        // We'll do the amount comparison in the processing service after finding potential matches.
        logger.info(`Potential PENDING_DEPOSIT swap found for user ${userAddress}: ${request._id}`);
        return request;
    } catch (error) {
        logger.error(`Error finding pending swap request for user ${userAddress} in DB:`, error);
        return null;
    }
  },

  // Helper for cleanup or inspection if needed
  async getAllRequests(): Promise<ISwapRequest[]> {
    await connectToDatabase();
    logger.debug('Fetching all swap requests from DB');
    try {
        const requests = await SwapRequestModel.find().lean();
        logger.debug(`Fetched ${requests.length} total swap requests.`);
        return requests as ISwapRequest[];
    } catch (error) {
        logger.error('Error fetching all swap requests from DB:', error);
        return [];
    }
  }
}; 