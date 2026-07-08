/**
 * ============================================================================
 * MEETING PROJECT - BACKEND - SOCKET.IO INITIALIZATION
 * ============================================================================
 * 
 * File này là điểm vào chính cho tất cả xử lý Socket.IO (WebSocket).
 * Nơi đây:
 * - Khởi tạo Socket.IO server
 * - Đăng ký toàn bộ event handlers
 * - Quản lý kết nối/ngắt kết nối
 * - Xử lý lỗi realtime
 * 
 * Các handler được tổ chức theo tính năng:
 * - room.handler.js: Quản lý phòng (join, approve, kick, etc.)
 * - webrtc.handler.js: WebRTC Signaling (offer, answer, ICE)
 * - chat.handler.js: Chat realtime
 * 
 * Kiến trúc: Observer Pattern với Socket.IO
 * 
 * Tác giả: tuannlaukii148
 * Ngày tạo: 2026-04-08
 */

import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { getRedisClient } from '../config/redis.js';
import { handleRoomJoin, handleApproveUser, handleRejectUser, handleUserLeft, handleEndMeeting, handleDeclineInvite } from './room.handler.js';
import {
  handleChatSubscribe,
  handleChatUnsubscribe,
  handleChatSend,
  handleChatHistory,
  handleChatRead,
  handleChatReceipt,
  handleChatEdit,
  handleChatDelete,
  handleChatForward,
  handleChatReactionAdd,
  handleChatReactionRemove,
  handleChatTyping,
  handleChatTypingStop,
} from './chat.handler.js';
import { handleMediaToggle, handleScreenShareStart, handleScreenShareStop } from './media.handler.js';
import { handleFilterChange } from './filter.handler.js';
import { markUserOnline, markUserOffline, handlePresenceSubscribe, handlePresenceUnsubscribe } from './presence.handler.js';
import recordingService from '../services/recording.service.js';
import { handleWebRTCOffer, handleWebRTCAnswer, handleICECandidate } from './webrtc.handler.js';

/**
 * Khởi tạo tất cả Socket.IO event handlers
 * 
 * @param {Object} io - Socket.IO instance
 * @param {Object} redisClient - Redis client instance
 * @returns {void}
 */
export const initializeSocket = (io, redisClient) => {
  logger.info('🔌 Đang khởi tạo Socket.IO...');

  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    // Lưu userId vào socket.data để các handler truy cập
    const userId = socket.userId || socket.handshake.query.userId || socket.id;
    socket.data.userId = userId;
    logger.info(`✅ Kết nối mới: Socket ${socket.id} | Người dùng: ${userId}`);
    markUserOnline(io, socket);

    // Đánh dấu người dùng online trong Redis khi kết nối
    if (socket.userId) {
      redisClient.set(`user:${socket.userId}:socket`, socket.id)
        .catch((err) => logger.error(`Lỗi khi lưu socket ID cho user ${socket.userId}:`, err));
    }

    // =========================================================================
    // QUẢN LÝ PHÒNG HỌP
    // =========================================================================

    /**
     * Sự kiện: Người dùng yêu cầu vào phòng
     * Dữ liệu: { userId, roomCode }
     */
    socket.on(SOCKET_EVENTS.ROOM_JOIN, (data) => {
      handleRoomJoin(io, socket, data);
    });

    /**
     * Sự kiện: Host duyệt người tham gia
     * Dữ liệu: { roomCode, memberId }
     * Truyền io để handler có thể join approved user vào room
     */
    socket.on(SOCKET_EVENTS.ROOM_APPROVE_USER, (data) => {
      handleApproveUser(io, socket, data);
    });

    /**
     * Sự kiện: Host từ chối người tham gia
     * Dữ liệu: { roomCode, memberId }
     */
    socket.on(SOCKET_EVENTS.ROOM_REJECT_USER, (data) => {
      handleRejectUser(io, socket, data);
    });

    /**
     * Sự kiện: Người dùng rời khỏi phòng
     * Dữ liệu: { roomCode, userId }
     */
    socket.on(SOCKET_EVENTS.ROOM_USER_LEFT, (data) => {
      handleUserLeft(socket, data);
    });

    /**
     * Sự kiện: Host kết thúc cuộc họp cho tất cả
     * Dữ liệu: { roomCode }
     */
    socket.on(SOCKET_EVENTS.ROOM_ENDED, (data) => {
      handleEndMeeting(io, socket, data);
    });

    /**
     * Sự kiện: Người dùng từ chối lời mời
     * Dữ liệu: { roomCode, hostId, userName }
     */
    socket.on(SOCKET_EVENTS.ROOM_DECLINE_INVITE, (data) => {
      handleDeclineInvite(io, socket, data);
    });

    // =========================================================================
    // WEBRTC SIGNALING
    // =========================================================================

    socket.on(SOCKET_EVENTS.WEBRTC_OFFER, (data) => {
      handleWebRTCOffer(socket, data);
    });

    socket.on(SOCKET_EVENTS.WEBRTC_ANSWER, (data) => {
      handleWebRTCAnswer(socket, data);
    });

    socket.on(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, (data) => {
      handleICECandidate(socket, data);
    });

    // =========================================================================
    // CHAT REALTIME
    // =========================================================================

    socket.on(SOCKET_EVENTS.CHAT_SUBSCRIBE, (data) => {
      handleChatSubscribe(socket, data);
    });

    socket.on(SOCKET_EVENTS.CHAT_UNSUBSCRIBE, (data) => {
      handleChatUnsubscribe(socket, data);
    });

    /**
     * Sự kiện: Gửi tin nhắn
     * Dữ liệu: { roomCode, content, type, senderName, senderAvatar }
     */
    socket.on(SOCKET_EVENTS.CHAT_SEND, (data) => {
      handleChatSend(io, socket, data);
    });

    /**
     * Sự kiện: Yêu cầu lịch sử chat
     * Dữ liệu: { roomCode, page, limit }
     */
    socket.on(SOCKET_EVENTS.CHAT_HISTORY, (data) => {
      handleChatHistory(socket, data);
    });

    socket.on(SOCKET_EVENTS.CHAT_READ, (data) => {
      handleChatRead(io, socket, data);
    });

    socket.on(SOCKET_EVENTS.CHAT_RECEIPT, (data, ack) => {
      handleChatReceipt(io, socket, data, ack);
    });

    socket.on(SOCKET_EVENTS.CHAT_EDIT, (data, ack) => {
      handleChatEdit(io, socket, data, ack);
    });

    socket.on(SOCKET_EVENTS.CHAT_DELETE, (data, ack) => {
      handleChatDelete(io, socket, data, ack);
    });

    socket.on(SOCKET_EVENTS.CHAT_FORWARD, (data, ack) => {
      handleChatForward(io, socket, data, ack);
    });

    socket.on(SOCKET_EVENTS.CHAT_REACTION_ADD, (data, ack) => {
      handleChatReactionAdd(io, socket, data, ack);
    });

    socket.on(SOCKET_EVENTS.CHAT_REACTION_REMOVE, (data, ack) => {
      handleChatReactionRemove(io, socket, data, ack);
    });

    socket.on(SOCKET_EVENTS.CHAT_TYPING, (data) => {
      handleChatTyping(socket, data);
    });

    socket.on(SOCKET_EVENTS.CHAT_TYPING_STOP, (data) => {
      handleChatTypingStop(socket, data);
    });

    socket.on(SOCKET_EVENTS.PRESENCE_SUBSCRIBE, (data) => {
      handlePresenceSubscribe(socket, data);
    });

    socket.on(SOCKET_EVENTS.PRESENCE_UNSUBSCRIBE, (data) => {
      handlePresenceUnsubscribe(socket, data);
    });

    // =========================================================================
    // QUẢN LÝ KẾT NỐI
    // =========================================================================

    // =========================================================================
    // MEDIA EVENTS (MIC/CAM TOGGLE + SCREEN SHARE)
    // =========================================================================

    /**
     * Sự kiện: Toggle mic/cam
     * Dữ liệu: { roomCode, userId, isAudioMuted, isVideoMuted }
     */
    socket.on(SOCKET_EVENTS.MEDIA_TOGGLE, (data) => {
      handleMediaToggle(socket, data);
    });

    /**
     * Sự kiện: Bắt đầu screen share
     * Dữ liệu: { roomCode, userId, userName }
     */
    socket.on(SOCKET_EVENTS.MEDIA_SCREEN_SHARE_START, (data) => {
      handleScreenShareStart(socket, data);
    });

    /**
     * Sự kiện: Dừng screen share
     * Dữ liệu: { roomCode, userId }
     */
    socket.on(SOCKET_EVENTS.MEDIA_SCREEN_SHARE_STOP, (data) => {
      handleScreenShareStop(socket, data);
    });

    /**
     * Sự kiện: Filter change (apply filter globally)
     * Dữ liệu: { roomCode, userId, filter }
     */
    socket.on(SOCKET_EVENTS.ROOM_FILTER_CHANGE, (data) => {
      handleFilterChange(socket, data);
    });

    /**
     * Sự kiện: Người dùng ngắt kết nối
     * Cleanup: Xóa Redis keys, cập nhật database
     */
    socket.on(SOCKET_EVENTS.DISCONNECT, async () => {
      try {
        await markUserOffline(io, socket);
        const redis = getRedisClient();

        // Đánh dấu offline bằng cách xóa mapping user -> socket
        if (socket.userId) {
          const currentSocketId = await redis.get(`user:${socket.userId}:socket`);
          if (currentSocketId === socket.id) {
            await redis.del(`user:${socket.userId}:socket`);
          }
        }

        // Xóa mapping socket -> user
        const socketData = await redis.get(`socket:${socket.id}`);
        if (socketData) {
          const { roomCode, userId: disconnectedUserId } = JSON.parse(socketData);

          // Emit room leave event FIRST (before cleanup)
          socket.to(roomCode).emit(SOCKET_EVENTS.ROOM_USER_LEFT, {
            userId: disconnectedUserId,
            timestamp: new Date().toISOString(),
            message: 'Một người dùng đã rời khỏi phòng',
          });

          // Then cleanup Redis with error handling
          try {
            await Promise.all([
              redis.del(`socket:${socket.id}`),
              redis.sRem(`room:${roomCode}:members`, disconnectedUserId),
            ]);
            logger.info(`Người dùng ${disconnectedUserId} đã rời khỏi phòng ${roomCode}`);

            const remainingCount = await redis.sCard(`room:${roomCode}:members`);
            if (remainingCount === 0) {
              const recordingEgressId = await redis.get(`room:${roomCode}:egress_id`);
              if (recordingEgressId) {
                try {
                  await recordingService.stopLiveKitRecording(roomCode, disconnectedUserId);
                  logger.info(`⏹️ Tự động dừng ghi hình do phòng họp không còn ai (disconnect) ${roomCode}`);
                } catch (recError) {
                  logger.error(`❌ Lỗi khi tự động dừng ghi hình:`, recError);
                }
              }
            }
          } catch (cleanupError) {
            logger.error(`Xóa dữ liệu không thành công cho người dùng ${disconnectedUserId}:`, cleanupError.message);
            // Don't re-throw - disconnect already happened
          }
        }
      } catch (error) {
        logger.error('Lỗi trong Socket disconnect handler:', error);
        // Fallback: at least emit disconnect event
        if (socket.userId) {
          socket.broadcast.emit(SOCKET_EVENTS.ERROR, {
            message: 'Người dùng đã ngắt kết nối đột ngột',
            userId: socket.userId,
          });
        }
      }
    });

    /**
     * Sự kiện: Lỗi Socket
     * Dữ liệu: error object
     */
    socket.on(SOCKET_EVENTS.ERROR, (error) => {
      logger.error(`⚠️  Socket error [${socket.id}]:`, error);
    });
  });

  logger.info('✅ Tất cả Socket.IO handlers đã sẵn sàng');
};

export default { initializeSocket };
