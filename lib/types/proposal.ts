// lib/types/proposal.ts

// Define the interface for a Proposal document
export interface Proposal {
  _id?: any; // Use 'any' or specific ObjectId type if using MongoDB's native ObjectId
  title: string;
  content: string;
  status: 'draft' | 'live' | 'archived';
  authorAddress: string; // Wallet address of the admin who created it
  createdAt?: Date;
  updatedAt?: Date;
  publishedAt?: Date; // Timestamp when status was set to 'live'
} 