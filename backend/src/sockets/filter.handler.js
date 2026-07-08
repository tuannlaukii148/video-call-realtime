import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Handle filter change: broadcast selected filter to room
 * data: { roomCode, userId, filter }
 */
export const handleFilterChange = (socket, data) => {
  const { roomCode, userId, filter } = data;
  if (!roomCode || !userId) {
    logger.warn('⚠️  filter_change thiếu roomCode hoặc userId');
    return;
  }

  logger.info(`✨ Filter change by ${userId} in ${roomCode}: ${filter}`);
  // Broadcast to everyone else in the room
  socket.to(roomCode).emit(SOCKET_EVENTS.ROOM_FILTER_CHANGE, {
    userId,
    filter,
  });
};

export default { handleFilterChange };
