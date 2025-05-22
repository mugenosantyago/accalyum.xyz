import mongoose, { Schema, Model, models, Types } from 'mongoose';

// Interface for BankTransaction document
export interface IBankTransaction {
  _id?: Types.ObjectId;
  address: string; // User's Alephium address
  type: 'deposit' | 'withdraw' | 'interest_payout';
  token: 'ALPH' | 'ACYUM' | 'sWEA';
  // Store amount as string to handle large numbers accurately
  // This will represent the amount in the smallest unit (attoALPH or ACYUM smallest unit)
  amount: string;
  txId: string; // Transaction ID from Alephium
  timestamp: Date; // Timestamp of when the record was created
}

// Mongoose Schema definition
const BankTransactionSchema: Schema<IBankTransaction> = new Schema({
  address: { 
    type: String, 
    required: true, 
    index: true 
  },
  type: { 
    type: String, 
    required: true, 
    enum: ['deposit', 'withdraw', 'interest_payout'],
    index: true 
  },
  token: { 
    type: String, 
    required: true, 
    enum: ['ALPH', 'ACYUM', 'sWEA'],
    index: true 
  },
  amount: { 
    type: String, 
    required: true,
    validate: {
      validator: function(v: string) {
        return /^\d+$/.test(v) // Ensure amount is a string of digits
      },
      message: props => `${props.value} is not a valid amount!`
    }
  },
  txId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true 
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields
});

// Create compound indexes for common queries
BankTransactionSchema.index({ address: 1, token: 1 });
BankTransactionSchema.index({ address: 1, timestamp: -1 });
BankTransactionSchema.index({ txId: 1 }, { unique: true });

// Create and export the Mongoose model
// Check if the model already exists to prevent recompilation issues in Next.js dev mode
const BankTransaction: Model<IBankTransaction> = models.BankTransaction || mongoose.model<IBankTransaction>('BankTransaction', BankTransactionSchema);

export default BankTransaction; 