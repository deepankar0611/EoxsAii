import mongoose from 'mongoose';
import config from '../config';

// MongoDB connection options optimized for serverless
const options = {
  maxPoolSize: 3, // Reduced for serverless
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000, // Added timeout
  bufferCommands: false, // Disable mongoose buffering
  bufferMaxEntries: 0, // Disable mongoose buffering
};

let isConnected = false;

// Connect to MongoDB
export async function connectToDatabase() {
  // Check if already connected
  if (mongoose.connections[0].readyState === 1) {
    console.log('Using existing database connection');
    return;
  }

  try {
    if (!config.mongodbUri) {
      console.error('MongoDB URI is missing:', { 
        hasMongoUri: !!config.mongodbUri,
        nodeEnv: process.env.NODE_ENV 
      });
      throw new Error('MongoDB URI is not configured. Please set MONGO_URI environment variable.');
    }

    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(config.mongodbUri, options);
    console.log('✅ Connected to MongoDB successfully');
    isConnected = true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    isConnected = false;
    throw new Error(`Failed to connect to MongoDB: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Disconnect from MongoDB
export async function disconnectFromDatabase() {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
}

// Database operation wrapper
export async function withDatabase<T>(operation: () => Promise<T>): Promise<T> {
  try {
    await connectToDatabase();
    return await operation();
  } catch (error) {
    console.error('Database operation failed:', error);
    throw error;
  }
}

// Export mongoose instance
export default mongoose; 