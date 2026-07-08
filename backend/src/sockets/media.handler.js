/**
 * ============================================================================
 * MEETING PROJECT - BACKEND - XỬ LÝ SỰ KIỆN MEDIA (MIC/CAM/SCREEN SHARE)
 * ============================================================================
 * 
 * Module này xử lý broadcast media state changes:
 * - Toggle mic/cam → thông báo trạng thái tới các user khác trong phòng
 * - Screen share start/stop → thông báo tới phòng
 * 
 * Logic đơn giản: chỉ relay event tới room, không cần Redis/DB.
 * 
 * Tác giả: tuannlaukii148
 * Ngày tạo: 2026-05-03
 */

import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

/**
 * Xử lý toggle mic/cam → broadcast trạng thái tới room
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} data - { roomCode, userId, isAudioMuted, isVideoMuted }
 */
export const handleMediaToggle = (socket, data) => {
  const { roomCode, userId, isAudioMuted, isVideoMuted } = data;

  if (!roomCode || !userId) {
    logger.warn('⚠️  media:toggle thiếu roomCode hoặc userId');
    return;
  }

  logger.debug(`🎙️ Media toggle: User ${userId} in room ${roomCode} — audio: ${isAudioMuted ? 'muted' : 'on'}, video: ${isVideoMuted ? 'off' : 'on'}`);

  // Broadcast tới tất cả trong phòng trừ sender
  socket.to(roomCode).emit(SOCKET_EVENTS.MEDIA_TOGGLE, {
    userId,
    isAudioMuted,
    isVideoMuted,
  });
};

/**
 * Xử lý bắt đầu screen share → broadcast tới room
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} data - { roomCode, userId, userName }
 */
export const handleScreenShareStart = (socket, data) => {
  const { roomCode, userId, userName } = data;

  if (!roomCode || !userId) {
    logger.warn('⚠️  media:screen_share_start thiếu roomCode hoặc userId');
    return;
  }

  logger.info(`🖥️ Screen share started: ${userName || userId} in room ${roomCode}`);

  socket.to(roomCode).emit(SOCKET_EVENTS.MEDIA_SCREEN_SHARE_START, {
    userId,
    userName,
  });
};

/**
 * Xử lý dừng screen share → broadcast tới room
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} data - { roomCode, userId }
 */
export const handleScreenShareStop = (socket, data) => {
  const { roomCode, userId } = data;

  if (!roomCode || !userId) {
    logger.warn('⚠️  media:screen_share_stop thiếu roomCode hoặc userId');
    return;
  }

  logger.info(`🖥️ Screen share stopped: ${userId} in room ${roomCode}`);

  socket.to(roomCode).emit(SOCKET_EVENTS.MEDIA_SCREEN_SHARE_STOP, {
    userId,
  });
};

export default { handleMediaToggle, handleScreenShareStart, handleScreenShareStop };

