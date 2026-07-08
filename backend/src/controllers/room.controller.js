/**
 * ============================================================================
 * CONTROLLER: ROOM - Quản lý phòng họp
 * ============================================================================
 * 
 * Tác giả: tuannlaukii148
 */

import roomService from '../services/room.service.js';
import { getRedisClient } from '../config/redis.js';
import { HTTP_STATUS, SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { User } from '../models/index.js';
import emailService from '../services/email.service.js';

class RoomController {
  /**
   * POST /api/v1/rooms - Tạo phòng
   */
  async createRoom(req, res) {
    try {
      const result = await roomService.createRoom(req.userId, req.body);
      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error('Create room error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/rooms - Lấy danh sách phòng của user
   */
  async getMyRooms(req, res) {
    try {
      const result = await roomService.getMyRooms(req.userId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get my rooms error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/rooms/:roomCode - Lấy thông tin phòng
   */
  async getRoomInfo(req, res) {
    try {
      const { roomCode } = req.params;
      logger.info(`Get room info request for room code: ${roomCode}`);
      const room = await roomService.getRoomInfo(roomCode);
      logger.info('Room info:', room);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        room,
      });
    } catch (error) {
      logger.error('Get room info error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/rooms/:roomCode/join - Vào phòng
   */
  async joinRoom(req, res) {
    try {
      const { roomCode } = req.params;
      const result = await roomService.requestJoinRoom(roomCode, req.userId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Join room error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/rooms/:roomCode/approve/:userId - Host duyệt người
   */
  async approveUser(req, res) {
    try {
      const { roomCode, userId } = req.params;
      const result = await roomService.approveUser(roomCode, req.userId, userId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Approve user error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/rooms/:roomCode/reject/:userId - Host từ chối người
   */
  async rejectUser(req, res) {
    try {
      const { roomCode, userId } = req.params;
      const result = await roomService.rejectUser(roomCode, req.userId, userId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Reject user error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * POST /api/v1/rooms/:roomCode/kick/:userId - Host đuổi người
   */
  async kickUser(req, res) {
    try {
      const { roomCode, userId } = req.params;
      const result = await roomService.kickUser(roomCode, req.userId, userId);

      const io = req.app.locals.io;
      const redis = getRedisClient();
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';

      if (io && normalizedCode) {
        const kickedSocketId = await redis.get(`user:${userId}:socket`);

        io.to(normalizedCode).emit(SOCKET_EVENTS.ROOM_USER_LEFT, {
          userId,
          message: 'A participant was removed from the room',
        });

        if (kickedSocketId) {
          const kickedSocket = io.sockets.sockets.get(kickedSocketId);

          io.to(kickedSocketId).emit(SOCKET_EVENTS.ROOM_USER_KICKED, {
            roomCode: normalizedCode,
            userId,
            message: 'You have been removed from the meeting',
          });

          io.to(kickedSocketId).emit(SOCKET_EVENTS.FORCE_DISCONNECT, {
            roomCode: normalizedCode,
            userId,
            message: 'You have been removed from the meeting',
          });

          if (kickedSocket) {
            setTimeout(() => {
              kickedSocket.disconnect(true);
            }, 0);
          }
        }
      }

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Kick user error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/rooms/:roomCode/transfer-host - Chuyển quyền host
   */
  async transferHost(req, res) {
    try {
      const { roomCode } = req.params;
      const { new_host_id: newHostId } = req.body;
      const result = await roomService.transferHost(roomCode, req.userId, newHostId);

      const io = req.app.locals.io;
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';

      if (io && normalizedCode) {
        io.to(normalizedCode).emit(SOCKET_EVENTS.ROOM_HOST_TRANSFERRED, {
          roomCode: normalizedCode,
          previousHostId: result.previousHostId,
          newHostId: result.newHostId,
          message: 'Host role has been transferred',
        });
      }

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Transfer host error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * PUT /api/v1/rooms/:roomCode/end - Kết thúc phòng
   */
  async endRoom(req, res) {
    try {
      const { roomCode } = req.params;
      const result = await roomService.endRoom(roomCode, req.userId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('End room error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * DELETE /api/v1/rooms/:roomCode - Permanently delete a room (host only)
   */
  async deleteRoom(req, res) {
    try {
      const { roomCode } = req.params;
      const result = await roomService.deleteRoom(roomCode, req.userId);

      const io = req.app.locals.io;
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';

      if (io && normalizedCode) {
        // Notify clients in the room that it has been ended/deleted
        io.to(normalizedCode).emit(SOCKET_EVENTS.ROOM_ENDED, {
          roomCode: normalizedCode,
          message: 'This meeting has been deleted by the host',
        });

        // Force-disconnect all sockets in the room
        const roomSockets = io.sockets.adapter.rooms.get(normalizedCode) || new Set();
        for (const socketId of roomSockets) {
          try {
            io.to(socketId).emit(SOCKET_EVENTS.FORCE_DISCONNECT, {
              roomCode: normalizedCode,
              message: 'Meeting deleted by host',
            });
            const s = io.sockets.sockets.get(socketId);
            if (s) s.disconnect(true);
          } catch (e) {
            // ignore
          }
        }
      }

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Delete room error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * GET /api/v1/rooms/:roomCode/participants - Danh sách người tham gia
   */
  async getRoomParticipants(req, res) {
    try {
      const { roomCode } = req.params;
      const result = await roomService.getRoomParticipants(roomCode);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get room participants error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async inviteUser(req, res) {
    try {
      const { roomCode } = req.params;
      const { userId: targetUserId } = req.body;

      const result = await roomService.inviteUser(roomCode, req.userId, targetUserId);

      if (result.online && result.socketId) {
        const io = req.app.locals.io;
        if (io) {
          io.to(result.socketId).emit(SOCKET_EVENTS.ROOM_INVITE, {
            roomCode: roomCode.toUpperCase(),
            hostId: req.userId,
            hostName: req.user?.full_name || 'Host',
          });
        }
      } else {
        // Fallback: Send email to offline user
        const targetUser = await User.findById(targetUserId);
        if (!targetUser) {
          return res.status(HTTP_STATUS.NOT_FOUND).json({
            success: false,
            message: 'Target user not found',
          });
        }

        try {
          await emailService.sendMeetingInviteEmail(
            targetUser.email,
            roomCode.toUpperCase(),
            req.user?.full_name || 'Host',
            targetUser.full_name
          );
        } catch (emailErr) {
          logger.warn(`Failed to send offline invite email to ${targetUser.email}:`, emailErr.message);
        }
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.online ? 'User invited successfully' : 'User is offline, invitation email sent successfully',
        online: result.online,
      });
    } catch (error) {
      logger.error('Invite user controller error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message || 'Failed to invite user',
      });
    }
  }
}

export default new RoomController();
