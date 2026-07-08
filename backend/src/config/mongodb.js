import mongoose from 'mongoose';
import pino from 'pino';

const logger = pino();
let memoryServer = null;

export const connectMongoDB = async () => {
  try {
    if (process.env.MONGODB_MEMORY === 'true') {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      const mongoUri = memoryServer.getUri();

      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });

      logger.info('MongoDB connected in memory mode');
      return mongoose.connection;
    }

    if (!process.env.MONGODB_URI) {
      throw new Error('FATAL: MONGODB_URI environment variable is not set. Please configure it before starting the application.');
    }

    const mongoUri = process.env.MONGODB_URI;

    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info('MongoDB connected successfully');

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect MongoDB');
    process.exit(1);
  }
};

export const disconnectMongoDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServer) {
      await memoryServer.stop();
      memoryServer = null;
    }
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Failed to disconnect MongoDB');
  }
};

export default mongoose;
