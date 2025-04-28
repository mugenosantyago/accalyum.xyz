import { MongoClient } from "mongodb"
import { config } from "./config"

// Connection URI
const uri = process.env.MONGODB_URI || config.database.mongoUri
const dbName = process.env.MONGODB_DB || config.database.mongoDb

// Create a new MongoClient
const client = new MongoClient(uri)
let clientPromise: Promise<MongoClient>

if (!uri) {
  throw new Error("Please add your MongoDB URI to .env.local")
}

if (process.env.NODE_ENV === "development") {
  // In development mode, use a global variable so that the value
  // is preserved across module reloads caused by HMR (Hot Module Replacement).
  const globalWithMongo = global as typeof globalThis & {
    _mongoClientPromise?: Promise<MongoClient>
  }

  if (!globalWithMongo._mongoClientPromise) {
    globalWithMongo._mongoClientPromise = client.connect()
  }
  clientPromise = globalWithMongo._mongoClientPromise
} else {
  // In production mode, it's best to not use a global variable.
  clientPromise = client.connect()
}

export default clientPromise

export async function getDb() {
  const client = await clientPromise
  return client.db(dbName)
}

// Add the connectToDatabase function that was missing
export async function connectToDatabase() {
  const client = await clientPromise
  const db = client.db(dbName)
  return { client, db }
}

// User types
export interface User {
  _id?: string
  address: string
  username: string
  email: string
  isAdmin: boolean
  createdAt: Date
  acyumId?: string
}

// Initiative types
export interface Initiative {
  _id?: string
  name: string
  description: string
  treasuryAddress: string
  imageUrl: string
  goal: number
  raised: number
  createdAt: Date
}

// Transaction types
export interface Transaction {
  _id?: string
  txId: string
  from: string
  to: string
  amount: string
  type: "deposit" | "withdraw" | "donation"
  initiative?: string
  status: "pending" | "completed" | "failed"
  createdAt: Date
}
