import { MongoClient } from "mongodb"
import { config } from "./config"
import { logger } from "./logger"
import mongoose from "mongoose"

// Import models to ensure they are registered
import '@/models/BankTransaction'

// Connection URI
const uri = process.env.MONGODB_URI || config.database.mongoUri
const dbName = process.env.MONGODB_DB || config.database.mongoDb

if (!uri) {
  logger.error("MongoDB URI is not configured. Please add MONGODB_URI to your environment variables.")
  throw new Error("MongoDB URI is not configured")
}

// Create a new MongoClient
const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
})

let clientPromise: Promise<MongoClient>

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
  try {
    const client = await clientPromise
    return client.db(dbName)
  } catch (error) {
    logger.error("Error getting database instance:", error)
    throw error
  }
}

// Enhanced connectToDatabase function with better error handling
export async function connectToDatabase() {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB already connected')
      return { client: await clientPromise, db: mongoose.connection.db }
    }

    // Configure mongoose
    mongoose.set('strictQuery', true)
    
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...')
    await mongoose.connect(uri, {
      dbName,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
      maxPoolSize: 10,
    })

    // Verify models are registered
    const registeredModels = Object.keys(mongoose.models)
    logger.info(`Registered models after connection: ${registeredModels.join(', ')}`)

    if (!mongoose.models.BankTransaction) {
      logger.error('BankTransaction model not registered after connection')
      throw new Error('BankTransaction model not registered')
    }

    logger.info('MongoDB connected successfully')
    return { client: await clientPromise, db: mongoose.connection.db }
  } catch (error) {
    logger.error('MongoDB connection error:', error)
    
    // Log detailed error information
    if (error instanceof Error) {
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      })
    }

    // Check for specific error types
    if (error instanceof mongoose.Error) {
      logger.error('Mongoose error:', {
        name: error.name,
        message: error.message
      })
    }

    throw error // Re-throw the error to be handled by the caller
  }
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
