import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    logger.info('Testing MongoDB connection...')
    
    // Check current connection state
    logger.info(`Current MongoDB connection state: ${mongoose.connection.readyState}`)
    
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
      connectionState: mongoose.connection.readyState,
      dbName: db.databaseName,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    logger.error('MongoDB connection test failed:', error)
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      connectionState: mongoose.connection.readyState,
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 