import mongoose, { Schema, Document, Model, models } from 'mongoose';

// Define the interface for the SwapRequest document
export interface ISwapRequest extends Document {
  userAddress: string;
  targetToken: 'ACYUM' | 'sWEA';
  amountAlph: number; // Store the requested ALPH amount (human-readable)
  depositAmountAttos?: string; // Store the actual deposited amount in Attos (BigInt as string)
  amountTargetToken?: string; // Store calculated target amount in smallest unit (BigInt as string)
  status: 'PENDING_DEPOSIT' | 'PROCESSING' | 'COMPLETE' | 'FAILED';
  timestamp: Date;
  depositTxId?: string;
  faucetTxId?: string;
  failureReason?: string;
}

// Mongoose Schema definition
const SwapRequestSchema: Schema<ISwapRequest> = new Schema({
  userAddress: { type: String, required: true, index: true },
  targetToken: { type: String, required: true, enum: ['ACYUM', 'sWEA'] },
  amountAlph: { type: Number, required: true },
  depositAmountAttos: { type: String }, // Store BigInt as string
  amountTargetToken: { type: String }, // Store BigInt as string
  status: {
    type: String,
    required: true,
    enum: ['PENDING_DEPOSIT', 'PROCESSING', 'COMPLETE', 'FAILED'],
    default: 'PENDING_DEPOSIT',
    index: true, // Index status for faster querying of pending requests
  },
  timestamp: { type: Date, default: Date.now },
  depositTxId: { type: String, index: true }, // Index depositTxId if needed for lookups
  faucetTxId: { type: String },
  failureReason: { type: String },
});

// Create and export the Mongoose model
// Check if the model already exists to prevent recompilation issues in Next.js dev mode
const SwapRequest: Model<ISwapRequest> = models.SwapRequest || mongoose.model<ISwapRequest>('SwapRequest', SwapRequestSchema);

export default SwapRequest; 