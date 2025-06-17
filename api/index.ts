import { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { connectToDatabase } from './lib/db.js';
import config from './config.js';
import apiRoutes from './api/index.js';

const app = express();

// Middleware
app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Register the API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Initialize database connection
let dbConnected = false;

async function ensureDbConnection() {
  if (!dbConnected) {
    try {
      await connectToDatabase();
      dbConnected = true;
    } catch (error) {
      console.error('Failed to connect to database:', error);
      throw error;
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    console.log(`🚀 API Request: ${req.method} ${req.url}`);
    
    // Ensure database connection
    await ensureDbConnection();
    
    // Handle the request using Express with proper type casting
    return new Promise((resolve, reject) => {
      app(req as any as Request, res as any as Response, (err: any) => {
        if (err) {
          console.error('Express app error:', err);
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error('❌ Handler error:', error);
    
    // Provide more detailed error information
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = error instanceof Error && error.message.includes('MongoDB') ? 503 : 500;
    
    res.status(statusCode).json({ 
      error: 'Internal server error',
      message: errorMessage,
      timestamp: new Date().toISOString()
    });
  }
} 