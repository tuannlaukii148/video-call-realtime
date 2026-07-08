/**
 * ============================================================================
 * SERVICE: ROOM - Quản lý phòng họp
 * ============================================================================
 * 
 * Mục đích: Xử lý business logic liên quan đến phòng họp:
 * - Tạo phòng
 * - Join phòng
 * - Kết thúc phòng
 * - Quản lý thành viên
 * - Lấy danh sách người tham gia
 * 
 * Tác giả: tuannlaukii148
 */

import { Room, RoomMember, MeetingEvent, Recording } from '../models/index.js';
import { getRedisClient, addToSet, removeFromSet, deleteRedisKey } from '../config/redis.js';
import { HTTP_STATUS, ERROR_MESSAGES, ROOM_STATUS, USER_STATUS, EVENT_TYPE } from '../utils/constants.js';
import logger from '../utils/logger.js';
import recordingService from './recording.service.js';

class RoomService {
  /**
   * Lấy danh sách phòng của người dùng
   */
  async getMyRooms(userId) {
    try {
      const hostRooms = await Room.find({ 
        host_id: userId,
        status: { $ne: ROOM_STATUS.ENDED } 
      }).populate('host_id', '_id full_name email avatar').lean();

      const memberEntries = await RoomMember.find({ user_id: userId, status: { $in: [USER_STATUS.JOINED, USER_STATUS.PENDING] } });
      const memberRoomIds = memberEntries.map(e => e.room_id);

      const participantRooms = await Room.find({
        _id: { $in: memberRoomIds, $nin: hostRooms.map(r => r._id) },
        status: { $ne: ROOM_STATUS.ENDED }
      }).populate('host_id', '_id full_name email avatar').lean();

      const allRooms = [...hostRooms, ...participantRooms];

      allRooms.sort((a, b) => {
        if (!a.started_at && !b.started_at) return new Date(b.created_at) - new Date(a.created_at);
        if (!a.started_at) return 1;
        if (!b.started_at) return -1;
        return new Date(a.started_at) - new Date(b.started_at);
      });

      return {
        success: true,
        rooms: allRooms
      };
    } catch (error) {
      logger.error('Get my rooms error:', error);
      throw error;
    }
  }

  /**
   * Tạo phòng họp mới
   * @param {String} hostId - User ID of host
   * @param {Object} data - { title, description, settings }
   * @returns {Object} Created room
   */
  async createRoom(hostId, data) {
    try {
      const {
        title,
        description,
        settings,
        require_approval,
        allow_chat,
        max_participants,
      } = data;
      const normalizedSettings = {
        require_approval: settings?.require_approval ?? require_approval ?? false,
        allow_chat: settings?.allow_chat ?? allow_chat ?? true,
        max_participants: settings?.max_participants ?? max_participants ?? 100,
      };

      // Generate unique room code
      const roomCode = this.generateRoomCode();

      // Create room
      const room = new Room({
        room_code: roomCode,
        host_id: hostId,
        title,
        description: description || '',
        status: ROOM_STATUS.WAITING,
        settings: normalizedSettings,
        started_at: data.started_at || null,
        ended_at: null,
      });

      await room.save();

      // Log event
      await this.logEvent(room._id, hostId, EVENT_TYPE.ROOM_CREATED, `Room created by host`);

      // Store host in Redis
      const redis = getRedisClient();
      await redis.set(`room:${roomCode}:host`, hostId.toString());

      logger.info(`✓ Room created: ${roomCode} by ${hostId}`);

      return {
        success: true,
        room: this.mapRoom(room),
      };
    } catch (error) {
      logger.error('Create room error:', error);
      throw error;
    }
  }

  /**
   * Lấy thông tin phòng
   * @param {String} roomCode
   * @returns {Object} Room info
   */
  async getRoomInfo(roomCode) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode }).populate('host_id', '-password_hash');

      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      // Check if room has ended
      if (room.status === ROOM_STATUS.ENDED) {
        const error = new Error(ERROR_MESSAGES.ROOM_ENDED);
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      return this.mapRoom(room);
    } catch (error) {
      logger.error('Get room info error:', error);
      throw error;
    }
  }

  /**
   * Request to join room
   * @param {String} roomCode
   * @param {String} userId
   * @returns {Object} { roomMember, status }
   */
  async requestJoinRoom(roomCode, userId) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (room.status === ROOM_STATUS.ENDED) {
        const error = new Error(ERROR_MESSAGES.ROOM_ENDED);
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      // Check max participants
      const memberCount = await RoomMember.countDocuments({
        room_id: room._id,
        status: { $in: [USER_STATUS.JOINED, USER_STATUS.PENDING] },
      });

      if (memberCount >= room.settings.max_participants) {
        const error = new Error(ERROR_MESSAGES.MAX_PARTICIPANTS);
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      // Check if user already in room
      let roomMember = await RoomMember.findOne({ room_id: room._id, user_id: userId });

      const isHost = room.host_id.toString() === userId.toString();

      if (roomMember) {
        // If previously left, rejoin
        roomMember.status = isHost ? USER_STATUS.JOINED : (room.settings.require_approval ? USER_STATUS.PENDING : USER_STATUS.JOINED);
        roomMember.joined_at = isHost ? new Date() : (room.settings.require_approval ? null : new Date());
        roomMember.left_at = null;
      } else {
        // Create new room member entry
        roomMember = new RoomMember({
          room_id: room._id,
          user_id: userId,
          status: isHost ? USER_STATUS.JOINED : (room.settings.require_approval ? USER_STATUS.PENDING : USER_STATUS.JOINED),
          joined_at: isHost ? new Date() : (room.settings.require_approval ? null : new Date()),
        });
      }

      await roomMember.save();

      if (roomMember.status === USER_STATUS.JOINED) {
        await addToSet(`room:${normalizedCode}:members`, userId.toString());

        if (room.status === ROOM_STATUS.WAITING) {
          room.status = ROOM_STATUS.ACTIVE;
        }
        if (!room.started_at) {
          room.started_at = new Date();
        }
        await room.save();
      }

      logger.info(`✓ User ${userId} requested to join room ${normalizedCode}`);

      return {
        success: true,
        roomMember: roomMember.toJSON(),
        status: roomMember.status,
        roomId: room._id,
      };
    } catch (error) {
      logger.error('Request join room error:', error);
      throw error;
    }
  }

  /**
   * Approve user to join room
   * @param {String} roomCode
   * @param {String} hostId
   * @param {String} userId
   * @returns {Object} Updated room member
   */
  async approveUser(roomCode, hostId, userId) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      // Check if requester is host
      if (room.host_id.toString() !== hostId.toString()) {
        const error = new Error(ERROR_MESSAGES.NOT_HOST);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      const roomMember = await RoomMember.findOneAndUpdate(
        { room_id: room._id, user_id: userId },
        { status: USER_STATUS.JOINED, joined_at: new Date() },
        { new: true }
      );

      if (!roomMember) {
        const error = new Error('User not found in room');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (room.status === ROOM_STATUS.WAITING) {
        room.status = ROOM_STATUS.ACTIVE;
      }
      if (!room.started_at) {
        room.started_at = new Date();
      }
      await room.save();

      await this.logEvent(room._id, userId, EVENT_TYPE.USER_APPROVED, 'User approved to join');

      logger.info(`✓ User ${userId} approved to join room ${normalizedCode}`);
      return { success: true, roomMember: roomMember.toJSON() };
    } catch (error) {
      logger.error('Approve user error:', error);
      throw error;
    }
  }

  /**
   * Reject user from joining room
   * @param {String} roomCode
   * @param {String} hostId
   * @param {String} userId
   * @returns {Object} Updated room member
   */
  async rejectUser(roomCode, hostId, userId) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (room.host_id.toString() !== hostId.toString()) {
        const error = new Error(ERROR_MESSAGES.NOT_HOST);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      const roomMember = await RoomMember.findOneAndUpdate(
        { room_id: room._id, user_id: userId },
        { status: USER_STATUS.REJECTED, left_at: new Date() },
        { new: true }
      );

      if (!roomMember) {
        const error = new Error('User not found in room');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      await this.logEvent(room._id, userId, EVENT_TYPE.USER_REJECTED, 'User rejected');

      logger.info(`✓ User ${userId} rejected from room ${normalizedCode}`);
      return { success: true, roomMember: roomMember.toJSON() };
    } catch (error) {
      logger.error('Reject user error:', error);
      throw error;
    }
  }

  /**
   * Kick user from room
   * @param {String} roomCode
   * @param {String} hostId
   * @param {String} userId
   * @returns {Object} Updated room member
   */
  async kickUser(roomCode, hostId, userId) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (room.host_id.toString() !== hostId.toString()) {
        const error = new Error(ERROR_MESSAGES.NOT_HOST);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      const roomMember = await RoomMember.findOneAndUpdate(
        { room_id: room._id, user_id: userId },
        { status: USER_STATUS.KICKED, left_at: new Date() },
        { new: true }
      );

      if (!roomMember) {
        const error = new Error('User not found in room');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      await removeFromSet(`room:${normalizedCode}:members`, userId.toString());

      await this.logEvent(room._id, userId, EVENT_TYPE.USER_KICKED, 'User kicked from room');

      logger.info(`✓ User ${userId} kicked from room ${normalizedCode}`);
      return { success: true, roomMember: roomMember.toJSON() };
    } catch (error) {
      logger.error('Kick user error:', error);
      throw error;
    }
  }

  /**
   * Transfer host role to another joined participant
   * @param {String} roomCode
   * @param {String} currentHostId
   * @param {String} newHostId
   * @returns {Object}
   */
  async transferHost(roomCode, currentHostId, newHostId) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (!newHostId) {
        const error = new Error(ERROR_MESSAGES.NEW_HOST_REQUIRED);
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      if (room.host_id.toString() !== currentHostId.toString()) {
        const error = new Error(ERROR_MESSAGES.NOT_HOST);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      if (currentHostId.toString() === newHostId.toString()) {
        const error = new Error(ERROR_MESSAGES.HOST_TRANSFER_SELF);
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      const joinedMember = await RoomMember.findOne({
        room_id: room._id,
        user_id: newHostId,
        status: USER_STATUS.JOINED,
      });

      if (!joinedMember) {
        const error = new Error(ERROR_MESSAGES.NEW_HOST_NOT_IN_ROOM);
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      const previousHostId = room.host_id.toString();
      room.host_id = newHostId;
      room.updated_at = new Date();
      await room.save();

      const redis = getRedisClient();
      await redis.set(`room:${normalizedCode}:host`, newHostId.toString());
      const newHostSocketId = await redis.get(`user:${newHostId.toString()}:socket`);
      if (newHostSocketId) {
        await redis.set(`room:${normalizedCode}:host:socket`, newHostSocketId);
      } else {
        await redis.del(`room:${normalizedCode}:host:socket`);
      }

      await this.logEvent(
        room._id,
        newHostId,
        EVENT_TYPE.HOST_TRANSFERRED,
        `Host transferred from ${previousHostId} to ${newHostId}`
      );

      logger.info(`✓ Host transferred in room ${normalizedCode}: ${previousHostId} -> ${newHostId}`);

      return {
        success: true,
        room: this.mapRoom(room),
        previousHostId,
        newHostId: newHostId.toString(),
      };
    } catch (error) {
      logger.error('Transfer host error:', error);
      throw error;
    }
  }

  /**
   * End room
   * @param {String} roomCode
   * @param {String} hostId
   * @returns {Object} Updated room
   */
  async endRoom(roomCode, hostId) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (room.host_id.toString() !== hostId.toString()) {
        const error = new Error(ERROR_MESSAGES.NOT_HOST);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      room.status = ROOM_STATUS.ENDED;
      room.ended_at = new Date();
      if (!room.started_at) {
        room.started_at = room.created_at;
      }

      // Auto-stop recording if active
      try {
        const recordingStatus = await recordingService.getLiveKitRecordingStatus(normalizedCode);
        if (recordingStatus.isRecording) {
          await recordingService.stopLiveKitRecording(normalizedCode, hostId);
          logger.info(`✓ Auto-stopped recording for room ${normalizedCode}`);
        }
      } catch (err) {
        logger.warn('Failed to auto-stop recording on room end:', err.message);
      }

      await room.save();

      // Mark all members as left
      await RoomMember.updateMany(
        { room_id: room._id, status: USER_STATUS.JOINED },
        { status: USER_STATUS.LEFT, left_at: new Date() }
      );

      await deleteRedisKey(`room:${normalizedCode}:members`);
      await deleteRedisKey(`room:${normalizedCode}:host`);

      await this.logEvent(room._id, hostId, EVENT_TYPE.ROOM_ENDED, 'Room ended by host');

      logger.info(`✓ Room ended: ${normalizedCode}`);
      return { success: true, room: this.mapRoom(room) };
    } catch (error) {
      logger.error('End room error:', error);
      throw error;
    }
  }

  /**
   * Delete room (permanently remove room and associated data)
   * @param {String} roomCode
   * @param {String} hostId
   */
  async deleteRoom(roomCode, hostId) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (room.host_id.toString() !== hostId.toString()) {
        const error = new Error(ERROR_MESSAGES.NOT_HOST);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      // If recording is active, attempt to stop it first
      try {
        const recordingStatus = await recordingService.getLiveKitRecordingStatus(normalizedCode);
        if (recordingStatus.isRecording) {
          await recordingService.stopLiveKitRecording(normalizedCode, hostId);
          logger.info(`✓ Auto-stopped recording for room ${normalizedCode} before delete`);
        }
      } catch (err) {
        logger.warn('Failed to auto-stop recording on room delete:', err.message);
      }

      // Remove related documents: members, events, recordings
      await RoomMember.deleteMany({ room_id: room._id });
      await MeetingEvent.deleteMany({ room_id: room._id });
      await Recording.deleteMany({ room_id: room._id });

      // Remove Redis keys
      await deleteRedisKey(`room:${normalizedCode}:members`);
      await deleteRedisKey(`room:${normalizedCode}:host`);
      await deleteRedisKey(`room:${normalizedCode}:host:socket`);
      await deleteRedisKey(`room:${normalizedCode}:egress_id`);
      await deleteRedisKey(`room:${normalizedCode}:egress_start_time`);
      await deleteRedisKey(`room:${normalizedCode}:egress_recorder_id`);
      await deleteRedisKey(`room:${normalizedCode}:recording_path`);

      // Finally remove the room document
      await Room.deleteOne({ _id: room._id });

      logger.info(`✓ Room deleted permanently: ${normalizedCode}`);
      return { success: true, message: 'Room deleted successfully', roomCode: normalizedCode };
    } catch (error) {
      logger.error('Delete room error:', error);
      throw error;
    }
  }

  /**
   * Get list of participants in a room
   * @param {String} roomCode
   * @returns {Array} List of participants
   */
  async getRoomParticipants(roomCode) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      const participants = await RoomMember.find({
        room_id: room._id,
        status: { $in: [USER_STATUS.JOINED, USER_STATUS.PENDING] },
      }).populate('user_id', '-password_hash');

      return {
        success: true,
        participants: participants.map(p => ({
          ...p.toJSON(),
          user: p.user_id?.toJSON() || null,
          id: p.user_id?._id?.toString() || p.user_id?.toString(),
          fullName: p.user_id?.full_name || null,
          avatar: p.user_id?.avatar || null,
        })),
      };
    } catch (error) {
      logger.error('Get room participants error:', error);
      throw error;
    }
  }

  /**
   * Generate unique room code - improved security with longer, random alphanumeric
   * @returns {String} Room code (format: XXX-YYY-ZZZ in alphanumeric)
   */
  generateRoomCode() {
    // Generate 9-character random alphanumeric code (resistant to brute force)
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 9; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${code.substring(0, 3)}-${code.substring(3, 6)}-${code.substring(6, 9)}`;
  }

  /**
   * Log meeting event
   * @param {String} roomId
   * @param {String} userId
   * @param {String} eventType
   * @param {String} description
   */
  async logEvent(roomId, userId, eventType, description) {
    try {
      const event = new MeetingEvent({
        room_id: roomId,
        user_id: userId,
        event_type: eventType,
        description,
      });
      await event.save();
    } catch (error) {
      logger.error('Log event error:', error);
    }
  }

  async inviteUser(roomCode, hostId, targetUserId) {
    try {
      const normalizedCode = roomCode ? roomCode.toUpperCase() : '';
      const room = await Room.findOne({ room_code: normalizedCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (room.host_id.toString() !== hostId.toString()) {
        const error = new Error(ERROR_MESSAGES.NOT_HOST);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      if (room.status === ROOM_STATUS.ENDED) {
        const error = new Error(ERROR_MESSAGES.ROOM_ENDED);
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      const existingMember = await RoomMember.findOne({
        room_id: room._id,
        user_id: targetUserId,
        status: { $in: [USER_STATUS.JOINED, USER_STATUS.PENDING] }
      });

      if (existingMember) {
        const error = new Error('User is already in this meeting room');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      const redis = getRedisClient();
      const socketId = await redis.get(`user:${targetUserId}:socket`);

      return {
        success: true,
        online: !!socketId,
        socketId,
        room,
      };
    } catch (error) {
      logger.error('Invite user service error:', error);
      throw error;
    }
  }

  mapRoom(room) {
    const raw = typeof room.toJSON === 'function' ? room.toJSON() : room;
    const host = raw.host_id;

    return {
      ...raw,
      host_name: host?.full_name || raw.host_name || null,
      require_approval: raw.settings?.require_approval ?? false,
      allow_chat: raw.settings?.allow_chat ?? true,
      max_participants: raw.settings?.max_participants ?? 100,
    };
  }
}

export default new RoomService();
