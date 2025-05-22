import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import mongoose from 'mongoose';
import { logger } from '@/lib/logger';

export async function GET() {
  try {
    // Check MongoDB connection state
    logger.info('Testing MongoDB connection...');
    logger.info(`Current connection state: ${mongoose.connection.readyState}`);
    
    if (mongoose.connection.readyState !== 1) {
      logger.info('MongoDB not connected, attempting to connect...');
      await connectToDatabase();
      logger.info('MongoDB connection established');
    }

    // Check if models are registered
    logger.info('Checking registered models...');
    const registeredModels = Object.keys(mongoose.models);
    logger.info(`Registered models: ${registeredModels.join(', ')}`);

    // Try to create a test document
    if (mongoose.models.BankTransaction) {
      logger.info('Testing BankTransaction model...');
      const testDoc = new mongoose.models.BankTransaction({
        address: 'test_address',
        type: 'deposit',
        token: 'ALPH',
        amount: '1000000000000000000',
        txId: `test_${Date.now()}`,
        timestamp: new Date()
      });

      await testDoc.save();
      logger.info('Test document created successfully');
      await mongoose.models.BankTransaction.deleteOne({ txId: testDoc.txId });
      logger.info('Test document cleaned up');
    }

    return NextResponse.json({
      status: 'success',
      connectionState: mongoose.connection.readyState,
      registeredModels,
      message: 'MongoDB connection and model registration test completed successfully'
    });

  } catch (error) {
    logger.error('MongoDB connection test failed:', error);
    
    // Log detailed error information
    if (error instanceof Error) {
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }

    // Check for specific error types
    if (error instanceof mongoose.Error) {
      logger.error('Mongoose error:', {
        name: error.name,
        message: error.message
      });
    }

    return NextResponse.json({ 
      status: 'error',
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
} 