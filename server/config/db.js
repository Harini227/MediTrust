const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Establishes connection to MongoDB Atlas.
 * Exits process on failure so the app never runs against a dead DB.
 */
async function connectDB() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      throw new Error('MONGO_URI is not defined in environment variables');
    }

    mongoose.set('strictQuery', true);

    const conn = await mongoose.connect(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (err) => {
      logger.error(`MongoDB connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return conn;
  } catch (err) {
    logger.error(`MongoDB initial connection failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = connectDB;
