import mongoose, { Schema, Document, models, Model } from 'mongoose';

export interface ISweaProposal extends Document {
  submitterAddress: string;
  acyumProposalId: string; // ID related to the proposal/vote itself
  submitterName: string;
  voteMessage: string;
  status: 'new' | 'reviewed' | 'actioned' | 'rejected'; // Example statuses
  createdAt: Date;
  reviewedAt?: Date;
  adminNotes?: string;
}

const SweaProposalSchema: Schema<ISweaProposal> = new Schema({
  submitterAddress: { type: String, required: true, index: true },
  acyumProposalId: { type: String, required: true, index: true },
  submitterName: { type: String, required: true },
  voteMessage: { type: String, required: true },
  status: { type: String, enum: ['new', 'reviewed', 'actioned', 'rejected'], default: 'new' },
  createdAt: { type: Date, default: Date.now },
  reviewedAt: { type: Date },
  adminNotes: { type: String },
});

// Ensure the model is not recompiled in dev mode
const SweaProposal: Model<ISweaProposal> = models.SweaProposal || mongoose.model<ISweaProposal>('SweaProposal', SweaProposalSchema);

export default SweaProposal; 