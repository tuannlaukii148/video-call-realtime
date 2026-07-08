/**
 * ============================================================================
 * SERVICE: HISTORY - Quản lý lịch sử & Audit logs
 * ============================================================================
 * 
 * Mục đích: Xử lý business logic liên quan đến lịch sử:
 * - Lấy danh sách phòng đã tham gia/tạo
 * - Lấy audit logs (events)
 * - Xem lịch sử chat
 * 
 * Tác giả: tuannlaukii148
 */

import { Room, RoomMember, MeetingEvent, Message } from '../models/index.js';
import { HTTP_STATUS, ERROR_MESSAGES } from '../utils/constants.js';
import logger from '../utils/logger.js';

class HistoryService {
  /**
   * Get user's room history (created or joined)
   * @param {String} userId
   * @param {Object} pagination - { page, limit, status }
   * @returns {Object} Rooms
   */
  async getUserRoomHistory(userId, pagination = {}) {
    try {
      const { page = 1, limit = 20, status = null } = pagination;
      const skip = (page - 1) * limit;

      // Find rooms where user is host or member
      const query = {
        $or: [
          { host_id: userId },
          {
            _id: {
              $in: await RoomMember.find({ user_id: userId }).distinct('room_id'),
            },
          },
        ],
      };

      if (status) {
        query.status = status;
      }

      const rooms = await Room.find(query)
        .populate('host_id', 'full_name avatar email')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Room.countDocuments(query);

      // Fetch all member infos at once instead of N+1 queries
      const roomIds = rooms.map(r => r._id);
      const memberInfos = await RoomMember.find({
        room_id: { $in: roomIds },
        user_id: userId,
      }).lean();

      const memberCounts = await RoomMember.aggregate([
        {
          $match: {
            room_id: { $in: roomIds },
            status: { $in: ['joined', 'left'] },
          },
        },
        { $group: { _id: '$room_id', count: { $sum: 1 } } },
      ]);
      
      // Create a map for quick lookup: roomId -> memberInfo
      const memberMap = new Map(
        memberInfos.map(m => [m.room_id.toString(), m])
      );
      const memberCountMap = new Map(
        memberCounts.map(m => [m._id.toString(), m.count])
      );

      // Enrich with user's role in room
      const enrichedRooms = rooms.map((room) => {
        let userRole = 'member';
        if (room.host_id?._id.toString() === userId.toString()) {
          userRole = 'host';
        }

        const memberInfo = memberMap.get(room._id.toString());

        return {
          ...room,
          host_name: room.host_id?.full_name || null,
          participant_count: memberCountMap.get(room._id.toString()) || 0,
          duration: room.ended_at
            ? Math.floor((room.ended_at - (room.started_at || room.created_at)) / 1000)
            : null,
          require_approval: room.settings?.require_approval ?? false,
          allow_chat: room.settings?.allow_chat ?? true,
          max_participants: room.settings?.max_participants ?? 100,
          userRole,
          userStatus: memberInfo?.status || 'unknown',
          userJoinedAt: memberInfo?.joined_at,
        };
      });

      return {
        success: true,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        rooms: enrichedRooms,
      };
    } catch (error) {
      logger.error('Get user room history error:', error);
      throw error;
    }
  }

  /**
   * Get room audit log (all events)
   * @param {String} roomCode
   * @param {String} userId - Only host or joined member can view
   * @param {Object} pagination - { page, limit }
   * @returns {Object} Events
   */
  async getRoomAuditLog(roomCode, userId, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;

      // Find room
      const room = await Room.findOne({ room_code: roomCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      // Check if user is host or member
      const isHost = room.host_id.toString() === userId.toString();
      const isMember = await RoomMember.findOne({
        room_id: room._id,
        user_id: userId,
      });

      if (!isHost && !isMember) {
        const error = new Error('Unauthorized to view room audit log');
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      // Get events
      const events = await MeetingEvent.find({ room_id: room._id })
        .populate('user_id', 'full_name avatar')
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await MeetingEvent.countDocuments({ room_id: room._id });

      return {
        success: true,
        room: {
          roomCode: room.room_code,
          title: room.title,
          status: room.status,
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        events: events.map(e => ({
          ...e,
          user: e.user_id,
          user_id: undefined,
        })),
      };
    } catch (error) {
      logger.error('Get room audit log error:', error);
      throw error;
    }
  }

  /**
   * Get room chat history
   * @param {String} roomCode
   * @param {String} userId - Only host or joined member can view
   * @param {Object} pagination - { page, limit }
   * @returns {Object} Messages
   */
  async getRoomChatHistory(roomCode, userId, pagination = {}) {
    try {
      const { page = 1, limit = 100 } = pagination;
      const skip = (page - 1) * limit;

      // Find room
      const room = await Room.findOne({ room_code: roomCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      // Check if user has access
      const isHost = room.host_id.toString() === userId.toString();
      const isMember = await RoomMember.findOne({
        room_id: room._id,
        user_id: userId,
      });

      if (!isHost && !isMember) {
        const error = new Error('Unauthorized to view room chat history');
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      // Get messages
      const messages = await Message.find({ room_id: room._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      const total = await Message.countDocuments({ room_id: room._id });

      return {
        success: true,
        room: {
          roomCode: room.room_code,
          title: room.title,
        },
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
        messages: messages.reverse(), // Chronological order
      };
    } catch (error) {
      logger.error('Get room chat history error:', error);
      throw error;
    }
  }

  /**
   * Get event statistics
   * @param {String} roomCode
   * @param {String} userId
   * @returns {Object} Statistics
   */
  async getRoomEventStats(roomCode, userId) {
    try {
      const room = await Room.findOne({ room_code: roomCode });
      if (!room) {
        const error = new Error(ERROR_MESSAGES.ROOM_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      // Check authorization
      const isHost = room.host_id.toString() === userId.toString();
      if (!isHost) {
        const error = new Error(ERROR_MESSAGES.NOT_HOST);
        error.statusCode = HTTP_STATUS.FORBIDDEN;
        throw error;
      }

      // Get event counts
      const events = await MeetingEvent.aggregate([
        { $match: { room_id: room._id } },
        { $group: { _id: '$event_type', count: { $sum: 1 } } },
      ]);

      // Get message count
      const messageCount = await Message.countDocuments({ room_id: room._id });

      // Get participant count
      const participantCount = await RoomMember.countDocuments({
        room_id: room._id,
      });

      // Get duration
      const duration = room.ended_at
        ? Math.floor((room.ended_at - (room.started_at || room.created_at)) / 1000)
        : null;

      return {
        success: true,
        stats: {
          room: room.toJSON(),
          participants: participantCount,
          messageCount,
          durationSeconds: duration,
          events: events.reduce((acc, e) => {
            acc[e._id] = e.count;
            return acc;
          }, {}),
        },
      };
    } catch (error) {
      logger.error('Get room event stats error:', error);
      throw error;
    }
  }
}

export default new HistoryService();
