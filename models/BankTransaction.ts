import mongoose, { Schema, Document, models, Model } from 'mongoose';

// Interface for the document (TypeScript type)
export interface IBankTransaction extends Document {
  address: string; // User's Alephium address
  type: 'deposit' | 'withdraw';
  token: 'ALPH' | 'ACYUM' | 'sWEA';
  // Store amount as string to handle large numbers accurately
  // This will represent the amount in the smallest unit (attoALPH or ACYUM smallest unit)
  amount: string; 
  txId: string; // Transaction ID from Alephium
  timestamp: Date; // Timestamp of when the record was created
}

// Mongoose Schema definition
const BankTransactionSchema: Schema<IBankTransaction> = new Schema({
  address: { type: String, required: true, index: true }, // Index for faster querying by address
  type: { type: String, required: true, enum: ['deposit', 'withdraw'] },
  token: { type: String, required: true, enum: ['ALPH', 'ACYUM', 'sWEA'] },
  amount: { type: String, required: true }, 
  txId: { type: String, required: true, unique: true }, // Ensure transaction IDs are unique
  timestamp: { type: Date, default: Date.now },
});

// Create and export the Mongoose model
// Check if the model already exists to prevent recompilation issues in Next.js dev mode
const BankTransaction: Model<IBankTransaction> = models.BankTransaction || mongoose.model<IBankTransaction>('BankTransaction', BankTransactionSchema);

export default BankTransaction; 