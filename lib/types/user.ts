// lib/types/user.ts

// Define the shared User interface based on database structure
export interface User {
  _id?: any; // Use 'any' or specific ObjectId type if using MongoDB's native ObjectId
  address: string;
  username: string;
  email: string;
  isAdmin?: boolean; // Optional based on usage
  createdAt?: Date; // Optional based on usage
  acyumId?: string;
  hasClaimedInitialSwea?: boolean;
  // Add other fields from your 'users' collection as needed
} 