import mongoose, { Schema, Document, Model, models, Types } from 'mongoose';
import { Proposal } from '@/lib/types/proposal';

// Define the interface for the Proposal document including Mongoose Document methods
export interface ProposalDocument extends Omit<Proposal, '_id'>, Document {
  _id: Types.ObjectId; // Use Mongoose's ObjectId for the document
}

// Mongoose Schema definition
const ProposalSchema: Schema<ProposalDocument> = new Schema({
  title: { type: String, required: true },
  content: { type: String, required: true },
  status: {
    type: String,
    required: true,
    enum: ['draft', 'live', 'archived'],
    default: 'draft',
    index: true, // Index status for faster querying
  },
  authorAddress: { type: String, required: true, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }, // Add updatedAt
  publishedAt: { type: Date }, // Add publishedAt
});

// Add a pre-save hook to update `updatedAt` and `publishedAt`
ProposalSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (this.isModified('status') && this.status === 'live' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

// Create and export the Mongoose model
// Check if the model already exists to prevent recompilation issues in Next.js dev mode
const ProposalModel: Model<ProposalDocument> = models.Proposal || mongoose.model<ProposalDocument>('Proposal', ProposalSchema);

export default ProposalModel; 