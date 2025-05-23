import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.info('Testing MongoDB connection...')
    
    // Attempt to connect
    const { db } = await connectToDatabase()
    
    if (!db) {
      throw new Error('Database connection failed - no database instance returned')
    }
    
    // Test the connection with a simple operation
    await db.admin().ping()
    
    logger.info('MongoDB connection test successful')
    
    return NextResponse.json({
      status: 'success',
      message: 'MongoDB connection successful',
      dbName: db.databaseName,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('MongoDB connection test failed:', error)
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 