import { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';
import cors from 'cors';
import { connectToDatabase } from '../src/server/lib/db';
import config from '../src/server/config';
import apiRoutes from '../src/server/api';

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

export default async function handler(req, res) {
  try {
    // Ensure database connection
    await ensureDbConnection();
    
    // Handle the request using Express
    return new Promise((resolve, reject) => {
      app(req, res, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve(undefined);
        }
      });
    });
  } catch (error) {
    console.error('Handler error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 