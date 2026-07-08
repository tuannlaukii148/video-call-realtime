import { getRedisClient } from '../config/redis.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

const normalizeUserIds = (userIds = []) => [...new Set(userIds.filter(Boolean).map((id) => id.toString()))];

const hasConnectedSocket = (socketSource, socketId) => {
  const sockets = socketSource?.nsp?.sockets || socketSource?.sockets?.sockets;
  return Boolean(sockets?.has(socketId));
};

const hasActiveUserSocket = async (redis, socketSource, userId) => {
  const socketKey = `user:${userId}:sockets`;
  const socketIds = await redis.sMembers(socketKey);
  const staleSocketIds = socketIds.filter((socketId) => !hasConnectedSocket(socketSource, socketId));

  if (staleSocketIds.length > 0) {
    await redis.sRem(socketKey, staleSocketIds);
  }

  const activeCount = socketIds.length - staleSocketIds.length;
  if (activeCount === 0) {
    await redis.sRem('online:users', userId);
  }

  return activeCount > 0;
};

export const markUserOnline = async (io, socket) => {
  try {
    const redis = getRedisClient();
    const userId = socket.userId?.toString();
    if (!userId) {
      return;
    }

    await Promise.all([
      redis.sAdd('online:users', userId),
      redis.sAdd(`user:${userId}:sockets`, socket.id),
      redis.set(`socket:${socket.id}:user`, userId),
    ]);

    socket.join(`user:${userId}`);
    io.to(`presence:${userId}`).emit(SOCKET_EVENTS.PRESENCE_ONLINE, {
      userId,
      status: 'online',
      lastSeenAt: null,
    });
  } catch (error) {
    logger.error('markUserOnline error:', error);
  }
};

export const markUserOffline = async (io, socket) => {
  try {
    const redis = getRedisClient();
    const userId = socket.userId?.toString();
    if (!userId) {
      return;
    }

    await Promise.all([
      redis.sRem(`user:${userId}:sockets`, socket.id),
      redis.del(`socket:${socket.id}:user`),
    ]);

    const isOnline = await hasActiveUserSocket(redis, io, userId);
    if (!isOnline) {
      const lastSeenAt = new Date().toISOString();
      await Promise.all([
        redis.sRem('online:users', userId),
        redis.set(`user:${userId}:last_seen_at`, lastSeenAt),
      ]);

      io.to(`presence:${userId}`).emit(SOCKET_EVENTS.PRESENCE_OFFLINE, {
        userId,
        status: 'offline',
        lastSeenAt,
      });
    }
  } catch (error) {
    logger.error('markUserOffline error:', error);
  }
};

export const handlePresenceSubscribe = async (socket, data = {}) => {
  try {
    const redis = getRedisClient();
    const userIds = normalizeUserIds(data.userIds);
    const snapshot = [];

    for (const userId of userIds) {
      socket.join(`presence:${userId}`);
      const isOnline = await hasActiveUserSocket(redis, socket, userId);
      const lastSeenAt = isOnline ? null : await redis.get(`user:${userId}:last_seen_at`);
      snapshot.push({
        userId,
        status: isOnline ? 'online' : 'offline',
        lastSeenAt,
      });
    }

    socket.emit(SOCKET_EVENTS.PRESENCE_SNAPSHOT, { users: snapshot });
  } catch (error) {
    logger.error('handlePresenceSubscribe error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Failed to subscribe to presence' });
  }
};

export const handlePresenceUnsubscribe = async (socket, data = {}) => {
  const userIds = normalizeUserIds(data.userIds);
  for (const userId of userIds) {
    socket.leave(`presence:${userId}`);
  }
};

export default {
  markUserOnline,
  markUserOffline,
  handlePresenceSubscribe,
  handlePresenceUnsubscribe,
};
