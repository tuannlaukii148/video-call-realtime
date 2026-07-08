import { createClient } from 'redis';
import pino from 'pino';

const logger = pino();

let redisClient = null;

const createMemoryRedisClient = () => {
  const kv = new Map();
  const sets = new Map();
  const listeners = new Map();

  const emit = (event, ...args) => {
    const handlers = listeners.get(event) || [];
    handlers.forEach((handler) => handler(...args));
  };

  return {
    on(event, handler) {
      const handlers = listeners.get(event) || [];
      handlers.push(handler);
      listeners.set(event, handlers);
    },
    async connect() {
      emit('connect');
      emit('ready');
    },
    async quit() {
      emit('disconnect');
    },
    async set(key, value) {
      kv.set(key, value);
      return 'OK';
    },
    async setEx(key, _expiresIn, value) {
      kv.set(key, value);
      return 'OK';
    },
    async get(key) {
      return kv.has(key) ? kv.get(key) : null;
    },
    async del(key) {
      const hadKey = kv.delete(key);
      const hadSet = sets.delete(key);
      return hadKey || hadSet ? 1 : 0;
    },
    async sAdd(key, member) {
      const current = sets.get(key) || new Set();
      const before = current.size;
      current.add(member);
      sets.set(key, current);
      return current.size > before ? 1 : 0;
    },
    async sRem(key, member) {
      const current = sets.get(key);
      if (!current) {
        return 0;
      }
      const existed = current.delete(member);
      if (current.size === 0) {
        sets.delete(key);
      }
      return existed ? 1 : 0;
    },
    async sMembers(key) {
      return Array.from(sets.get(key) || []);
    },
    async sCard(key) {
      return (sets.get(key) || new Set()).size;
    },
  };
};

export const connectRedis = async () => {
  try {
    if (process.env.REDIS_MEMORY === 'true') {
      redisClient = createMemoryRedisClient();
      await redisClient.connect();
      logger.info('Redis connected in memory mode');
      return redisClient;
    }

    const redisUrl =
      process.env.REDIS_URL ||
      `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`;

    redisClient = createClient({
      url: redisUrl,
      password: process.env.REDIS_PASSWORD,
      socket: {
        tls: process.env.NODE_ENV === 'production',

        reconnectStrategy: (retries) => {
          if (retries > 10) {
            logger.error({ retries }, 'Redis reconnection failed after 10 attempts');
            return new Error('Max retries exceeded');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      logger.error({ err }, 'Redis error');
    });

    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });

    redisClient.on('connect', () => {
      logger.info('Redis connected successfully');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis disconnected');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Attempting to reconnect to Redis...');
    });

    await redisClient.connect();
    logger.info(`Connected to Redis at ${redisUrl.split('//')[1].split('?')[0]}`);

    return redisClient;
  } catch (error) {
    logger.error({ err: error }, 'Failed to connect Redis');
    process.exit(1);
  }
};

export const disconnectRedis = async () => {
  try {
    if (redisClient) {
      await redisClient.quit();
      logger.info('Redis disconnected gracefully');
      redisClient = null;
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to disconnect Redis');
  }
};

export const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis first.');
  }
  return redisClient;
};

export const setWithExpire = async (key, value, expiresIn = null) => {
  try {
    const client = getRedisClient();
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);

    if (expiresIn) {
      await client.setEx(key, expiresIn, stringValue);
    } else {
      await client.set(key, stringValue);
    }
  } catch (error) {
    logger.error({ err: error, key }, 'Error setting Redis key');
    throw error;
  }
};

export const getRedisValue = async (key) => {
  try {
    const client = getRedisClient();
    return await client.get(key);
  } catch (error) {
    logger.error({ err: error, key }, 'Error getting Redis key');
    throw error;
  }
};

export const deleteRedisKey = async (key) => {
  try {
    const client = getRedisClient();
    return await client.del(key);
  } catch (error) {
    logger.error({ err: error, key }, 'Error deleting Redis key');
    throw error;
  }
};

export const addToSet = async (setKey, member) => {
  try {
    const client = getRedisClient();
    return await client.sAdd(setKey, member);
  } catch (error) {
    logger.error({ err: error, setKey }, 'Error adding to Redis set');
    throw error;
  }
};

export const removeFromSet = async (setKey, member) => {
  try {
    const client = getRedisClient();
    return await client.sRem(setKey, member);
  } catch (error) {
    logger.error({ err: error, setKey }, 'Error removing from Redis set');
    throw error;
  }
};

export const getSetMembers = async (setKey) => {
  try {
    const client = getRedisClient();
    return await client.sMembers(setKey);
  } catch (error) {
    logger.error({ err: error, setKey }, 'Error getting Redis set members');
    throw error;
  }
};

export default redisClient;
