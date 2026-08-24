const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Global cache to persist connection across serverless function invocations
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Establishes connection to MongoDB Atlas.
 * In serverless environments, it reuses the cached connection if available.
 */
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    if (cached.conn) {
      return cached.conn;
    }

    if (!cached.promise) {
      mongoose.set('strictQuery', true);
      logger.info('Initializing MongoDB connection...');

      cached.promise = mongoose.connect(uri, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 10000,
      }).then((conn) => {
        logger.info(`MongoDB connected: ${conn.connection.host}`);
        
        mongoose.connection.on('error', (err) => {
          logger.error(`MongoDB connection error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
          logger.warn('MongoDB disconnected');
        });

        return conn;
      }).catch((err) => {
        logger.error(`MongoDB initial connection failed: ${err.message}`);
        cached.promise = null; // Reset promise so we can retry next time
        throw err;
      });
    }

    cached.conn = await cached.promise;
    return cached.conn;
  } catch (err) {
    logger.error(`MongoDB connection setup failed: ${err.message}`);
    // If not in a serverless environment (i.e. running the server directly via server.js), exit process
    if (require.main === module || !process.env.VERCEL) {
      process.exit(1);
    }
    throw err;
  }
}

module.exports = connectDB;
