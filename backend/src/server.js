import 'dotenv/config';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import app from './app.js';
import { connectMongoDB, disconnectMongoDB } from './config/mongodb.js';
import { connectRedis, disconnectRedis, getRedisClient } from './config/redis.js';
import { initializeSocket } from './sockets/index.js';
import notificationService from './services/notification.service.js';
import { verifyAccessToken } from './utils/jwt.js';
import logger from './utils/logger.js';

const parseCorsOrigins = () =>
  (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Create HTTP server
const httpServer = http.createServer(app);

// Socket.IO Configuration with JWT Authentication Middleware
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: parseCorsOrigins(),
    credentials: true,
  },
  transports: ['websocket', 'polling'],
  pingInterval: 25000,
  pingTimeout: 60000,
});

// Socket.IO Authentication Middleware
// Verify JWT token before accepting socket connection
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return next(new Error('Authentication error: No token provided'));
  }

  try {
    const decoded = verifyAccessToken(token);
    if (!decoded || !decoded.userId) {
      return next(new Error('Authentication error: Invalid token'));
    }

    try {
      const redis = getRedisClient();
      const isBlacklisted = await redis.get(`token:blacklist:access:${token}`);
      if (isBlacklisted) {
        return next(new Error('Authentication error: Token has been revoked'));
      }
    } catch (redisError) {
      logger.warn('Socket token blacklist check failed:', redisError.message);
    }

    // Attach authenticated user data to socket object
    socket.userId = decoded.userId;
    socket.email = decoded.email;

    next();
  } catch (error) {
    logger.error('Socket authentication error:', error.message);
    next(new Error('Authentication error: Token verification failed'));
  }
});

// Store io instance in app for use in routes
app.locals.io = io;

let server = null;

const gracefulShutdown = async () => {
  logger.info('\n✓ Received shutdown signal, closing gracefully...');
  try {
    if (server) {
      server.close();
      logger.info('✓ HTTP server closed');
    }
    await disconnectMongoDB();
    await disconnectRedis();
    notificationService.stopMeetingReminderScheduler();
    logger.info('✓ All connections closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Graceful shutdown handlers
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const startServer = async () => {
  try {
    // Connect to databases
    logger.info('🔄 Connecting to MongoDB...');
    await connectMongoDB();

    logger.info('🔄 Connecting to Redis...');
    const redisClient = await connectRedis();

    // Initialize Socket.IO
    logger.info('🔄 Initializing Socket.IO...');
    initializeSocket(io, redisClient);
    notificationService.startMeetingReminderScheduler();

    // Start HTTP server
    server = httpServer.listen(PORT, HOST, () => {
      logger.info(`
╔════════════════════════════════════════════════════════════╗
║     🚀 Meeting Backend Server Started Successfully        ║
╚════════════════════════════════════════════════════════════╝
  
  Server Info:
  ├─ URL: http://${HOST}:${PORT}
  ├─ API Docs: http://${HOST}:${PORT}/api-docs
  ├─ Health Check: http://${HOST}:${PORT}/health
  ├─ Environment: ${process.env.NODE_ENV || 'development'}
  ├─ Node Version: ${process.version}
  └─ Status: ✓ Ready

      `);
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        logger.error(`✗ Port ${PORT} is already in use`);
      } else {
        logger.error('Server error:', error);
      }
      process.exit(1);
    });
  } catch (error) {
    logger.error('✗ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

export default httpServer;
