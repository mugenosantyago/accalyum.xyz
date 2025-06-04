import mongoose, { Document, Schema } from 'mongoose';

// Define the interface for a Swea Claim Request document
export interface ISweaClaimRequest extends Document {
  yumId: string;
  requesterAddress: string;
  amount: string; // Store amount as string to handle large numbers
  tokenId: string; // Token ID of sWEA
  status: 'pending' | 'approved' | 'rejected'; // Status of the claim request
  createdAt: Date;
  updatedAt: Date;
}

// Define the Mongoose schema for Swea Claim Request
const SweaClaimRequestSchema: Schema = new Schema({
  yumId: { type: String, required: true },
  requesterAddress: { type: String, required: true },
  amount: { type: String, required: true },
  tokenId: { type: String, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create and export the Mongoose model
const SweaClaimRequest = mongoose.models.SweaClaimRequest || mongoose.model<ISweaClaimRequest>('SweaClaimRequest', SweaClaimRequestSchema);

export default SweaClaimRequest; 