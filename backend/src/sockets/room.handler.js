/**
 * ============================================================================
 * MEETING PROJECT - BACKEND - XỬ LÝ SỰ KIỆN ROOM (PHÒNG HỌP)
 * ============================================================================
 * 
 * Module này xử lý toàn bộ logic Socket.IO liên quan tới Phòng họp:
 * - Người dùng yêu cầu vào phòng (room:join)
 * - Duyệt/Từ chối người tham gia (room:approve_user, room:reject_user)
 * - Quản lý danh sách thành viên
 * - Xử lý các sự kiện rời khỏi phòng
 * 
 * Kiến trúc: Handler này được gọi từ sockets/index.js
 * 
 * Tác giả: tuannlaukii148
 * Ngày tạo: 2026-04-08
 */

import { getRedisClient } from '../config/redis.js';
import { RoomMember, Room, User } from '../models/index.js';
import { SOCKET_EVENTS, ROOM_STATUS, USER_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import recordingService from '../services/recording.service.js';

/**
 * Helper: Fetch existing participants in a room (batch query optimization)
 * Prevents N+1 query problem by fetching all members in one query
 * 
 * @param {string} roomCode - Room code
 * @param {Object} roomId - Room MongoDB ID
 * @param {string} excludeUserId - User ID to exclude from results
 * @returns {Promise<Array>} Array of {userId, userName} objects
 */
const getExistingParticipants = async (roomCode, roomId, excludeUserId) => {
  const redis = getRedisClient();
  const memberIds = await redis.sMembers(`room:${roomCode}:members`);
  
  if (memberIds.length === 0) return [];
  
  // Filter out the excluded user
  const filteredMemberIds = memberIds.filter(mId => mId !== excludeUserId);
  
  if (filteredMemberIds.length === 0) return [];
  
  // Batch fetch all RoomMembers with user details in ONE query (not N queries)
  const roomMembers = await RoomMember.find({
    room_id: roomId,
    user_id: { $in: filteredMemberIds },
  })
    .populate('user_id', 'full_name email')
    .lean();
  
  // Convert to required format
  return roomMembers
    .filter(rm => rm && rm.user_id)
    .map(rm => ({
      userId: rm.user_id._id.toString(),
      userName: rm.user_id.full_name,
    }));
};

/**
 * Xử lý sự kiện người dùng yêu cầu vào phòng
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} data - { userId, roomCode }
 * @returns {Promise<void>}
 */
export const handleRoomJoin = async (io, socket, data) => {
  try {
    // Use JWT-authenticated userId from socket instead of client-provided data
    const userId = socket.userId;
    const { roomCode } = data;
    
    if (!roomCode) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room code is required' });
      return;
    }
    
    const redis = getRedisClient();

    logger.info(`👤 Người dùng ${userId} yêu cầu vào phòng ${roomCode}`);

    // 1. Kiểm tra phòng có tồn tại không
    const room = await Room.findOne({ room_code: roomCode });
    if (!room) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Phòng không tồn tại' });
      return;
    }

    // 2. Nếu phòng đã kết thúc, từ chối
    if (room.status === ROOM_STATUS.ENDED) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Phòng đã kết thúc' });
      return;
    }

    // 3. Kiểm tra user là host hay không
    const isHost = room.host_id.toString() === userId;

    // 4. Thêm/cập nhật member vào Database
    const memberStatus = (isHost || !room.settings.require_approval)
      ? USER_STATUS.JOINED
      : USER_STATUS.PENDING;
    const member = await RoomMember.findOneAndUpdate(
      { room_id: room._id, user_id: userId },
      {
        room_id: room._id,
        user_id: userId,
        status: memberStatus,
        joined_at: memberStatus === USER_STATUS.JOINED ? new Date() : null,
      },
      { upsert: true, new: true }
    ).populate("user_id");

    // 5. Cập nhật Redis: Lưu socket -> user -> room mapping
    await redis.set(
      `socket:${socket.id}`,
      JSON.stringify({ userId, roomCode })
    );
    // Lưu ngược: userId -> socketId (để host có thể notify user sau khi approve)
    await redis.set(`user:${userId}:socket`, socket.id);

    // 6. Host LUÔN join room ngay (bỏ qua approval)
    if (isHost) {
      await redis.sAdd(`room:${roomCode}:members`, userId);
      socket.join(roomCode);
      await redis.set(`room:${roomCode}:host:socket`, socket.id);

      // Lấy existing participants (batch query - không N+1)
      const existingParticipants = await getExistingParticipants(roomCode, room._id, userId);

      socket.emit(SOCKET_EVENTS.ROOM_USER_JOINED, {
        success: true,
        existingParticipants,
      });
    } else if (room.settings.require_approval) {
      // ====================================================================
      // CẦN DUYỆT: KHÔNG join room namespace ngay — chờ host approve
      // ====================================================================
      socket.emit(SOCKET_EVENTS.ROOM_PENDING, {
        message: 'Yêu cầu vào phòng đang chờ duyệt',
        memberId: member._id,
      });

      const hostSocketId = await redis.get(`user:${room.host_id.toString()}:socket`);
      if (hostSocketId) {
        io.to(hostSocketId).emit(SOCKET_EVENTS.ROOM_REQUEST_APPROVAL, {
          userId: member.user_id._id,
          userName: member.user_id.full_name,
          memberId: member._id,
          message: `${member.user_id.full_name} yêu cầu vào phòng`,
        });
      }
    } else {
      // ====================================================================
      // KHÔNG CẦN DUYỆT: join room namespace ngay
      // ====================================================================
      // Lấy existing participants TRƯỚC khi join room (batch query - không N+1)
      const existingParticipants = await getExistingParticipants(roomCode, room._id, userId);

      // Thêm vào members set + join room
      await redis.sAdd(`room:${roomCode}:members`, userId);
      socket.join(roomCode);

      // Thông báo cho những người ĐANG trong phòng (trừ bản thân)
      socket.to(roomCode).emit(SOCKET_EVENTS.ROOM_USER_JOINED, {
        userId,
        userName: member.user_id.full_name,
        message: `Một người dùng đã vào phòng`,
      });

      const isRecording = !!(await redis.get(`room:${roomCode}:egress_id`));

      // Gửi cho bản thân kèm existing participants và trạng thái ghi hình
      socket.emit(SOCKET_EVENTS.ROOM_USER_JOINED, {
        success: true,
        existingParticipants,
        isRecording,
      });
    }

    logger.info(`✅ Người dùng ${userId} đã xử lý join phòng ${roomCode}`);
  } catch (error) {
    logger.error('❌ Lỗi trong handleRoomJoin:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Lỗi khi vào phòng' });
  }
};

/**
 * Xử lý Host duyệt người tham gia
 * 
 * io được truyền từ index.js để có thể join approved user vào room
 * 
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket.IO socket instance (host)
 * @param {Object} data - { roomCode, memberId }
 * @returns {Promise<void>}
 */
export const handleApproveUser = async (io, socket, data) => {
  try {
    const { roomCode, memberId } = data;
    const redis = getRedisClient();

    // Kiểm tra quyền hạn Host
    if (!roomCode) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room code is required' });
      return;
    }
    const room = await Room.findOne({ room_code: roomCode });
    if (!room) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
      return;
    }
    if (room.host_id.toString() !== socket.userId?.toString()) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only room host can perform this action' });
      return;
    }

    // Cập nhật status thành JOINED
    const member = await RoomMember.findByIdAndUpdate(
      memberId,
      { status: USER_STATUS.JOINED, joined_at: new Date() },
      { new: true }
    ).populate('user_id', 'full_name email');

    if (!member) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Không tìm thấy thành viên' });
      return;
    }

    const approvedUserId = member.user_id._id.toString();
    logger.info(`Người dùng ${member.user_id.full_name} đã được duyệt vào phòng ${roomCode}`);

    // 1. Tìm socket của approved user
    const approvedSocketId = await redis.get(`user:${approvedUserId}:socket`);
    let approvedSocket = null;
    if (approvedSocketId) {
      approvedSocket = io.sockets.sockets.get(approvedSocketId);
    }

    // 2. Lấy danh sách existing participants TRƯỚC khi thêm approved user (batch query - không N+1)
    const existingParticipants = await getExistingParticipants(roomCode, room._id, approvedUserId);

    // 3. Thêm approved user vào Redis members set
    await redis.sAdd(`room:${roomCode}:members`, approvedUserId);

    const payload = {
      userId: approvedUserId,
      userName: member.user_id.full_name,
      message: `${member.user_id.full_name} đã được duyệt vào phòng`,
    };

    // 4. Notify HOST (socket.emit → chính host nhận)
    socket.emit(SOCKET_EVENTS.ROOM_USER_JOINED, payload);

    // 5. Notify người KHÁC trong room (approved user CHƯA join room nên không nhận duplicate)
    socket.to(roomCode).emit(SOCKET_EVENTS.ROOM_USER_JOINED, payload);

    const isRecording = !!(await redis.get(`room:${roomCode}:egress_id`));

    // 6. Emit riêng cho approved user: isSelf + existingParticipants và trạng thái ghi hình
    if (approvedSocket) {
      approvedSocket.emit(SOCKET_EVENTS.ROOM_USER_JOINED, {
        ...payload,
        isSelf: true,
        existingParticipants,
        isRecording,
      });
      logger.info(`📤 Đã notify approved user ${approvedUserId} với ${existingParticipants.length} existing participants`);
    } else {
      logger.warn(`⚠️  Không tìm thấy socket của user ${approvedUserId}`);
    }

    // 7. SAU KHI emit xong → join approved user vào room cho các event tương lai
    if (approvedSocket) {
      approvedSocket.join(roomCode);
      logger.info(`📥 Socket ${approvedSocketId} đã join room namespace ${roomCode}`);
    }

    logger.info(`✅ Host đã duyệt người dùng ${approvedUserId} vào phòng ${roomCode}`);
  } catch (error) {
    logger.error('❌ Lỗi trong handleApproveUser:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Lỗi khi duyệt người' });
  }
};

/**
 * Xử lý Host từ chối người tham gia
 * 
 * io được truyền từ index.js để có thể emit tới rejected user
 * 
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} data - { roomCode, memberId }
 * @returns {Promise<void>}
 */
export const handleRejectUser = async (io, socket, data) => {
  try {
    const { roomCode, memberId } = data;
    const redis = getRedisClient();

    // Kiểm tra quyền hạn Host
    if (!roomCode) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room code is required' });
      return;
    }
    const room = await Room.findOne({ room_code: roomCode });
    if (!room) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Room not found' });
      return;
    }
    if (room.host_id.toString() !== socket.userId?.toString()) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Only room host can perform this action' });
      return;
    }

    const member = await RoomMember.findByIdAndUpdate(
      memberId,
      { status: USER_STATUS.REJECTED },
      { new: true }
    );

    if (!member) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Không tìm thấy thành viên' });
      return;
    }
    const rejectedUserId = member.user_id.toString();
    const rejectedSocketId = await redis.get(`user:${rejectedUserId}:socket`);
    if (rejectedSocketId) {
      io.to(rejectedSocketId).emit(SOCKET_EVENTS.ROOM_USER_REJECTED, {
        memberId,
        userId: rejectedUserId,
        message: 'Yêu cầu vào phòng đã bị từ chối',
      });
      logger.info(`📤 Đã notify rejected user ${rejectedUserId} qua socket ${rejectedSocketId}`);
    } else {
      logger.warn(`⚠️  Không tìm thấy socket của user ${rejectedUserId} để gửi rejection`);
    }

    logger.info(`❌ Host từ chối người dùng vào phòng ${roomCode}`);
  } catch (error) {
    logger.error('❌ Lỗi trong handleRejectUser:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Lỗi khi từ chối người' });
  }
};

/**
 * Xử lý người dùng rời khỏi phòng
 * 
 * @param {Object} socket - Socket.IO socket instance
 * @param {Object} data - { roomCode, userId }
 * @returns {Promise<void>}
 */
export const handleUserLeft = async (socket, data) => {
  try {
    const { roomCode, userId } = data;
    const redis = getRedisClient();

    const room = await Room.findOne({ room_code: roomCode });
    if (!room) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'Không tìm thấy phòng' });
      return;
    }

    const member = await RoomMember.findOneAndUpdate(
      { room_id: room._id, user_id: userId },
      { status: USER_STATUS.LEFT, left_at: new Date() },
      { new: true }
    ).populate('user_id', 'full_name email avatar');

    if (!member) return;

    // Xóa user khỏi Set thành viên phòng
    await redis.sRem(`room:${roomCode}:members`, userId);

    const remainingCount = await redis.sCard(`room:${roomCode}:members`);
    if (remainingCount === 0) {
      const recordingEgressId = await redis.get(`room:${roomCode}:egress_id`);
      if (recordingEgressId) {
        try {
          await recordingService.stopLiveKitRecording(roomCode, userId);
          logger.info(`⏹️ Tự động dừng ghi hình do phòng họp không còn ai ${roomCode}`);
        } catch (recError) {
          logger.error(`❌ Lỗi khi tự động dừng ghi hình:`, recError);
        }
      }
    }

    // Cleanup Redis socket mappings (tránh disconnect handler double-fire)
    await redis.del(`socket:${socket.id}`);

    // Rời khỏi room namespace
    socket.leave(roomCode);

    // Phát thông báo tới tất cả trong phòng
    socket.to(roomCode).emit(SOCKET_EVENTS.ROOM_USER_LEFT, {
      userId,
      user: member.user_id,
      message: `${member.user_id.full_name} đã rời khỏi phòng`,
    });

    logger.info(`👋 Người dùng ${userId} rời khỏi phòng ${roomCode}`);
  } catch (error) {
    logger.error('❌ Lỗi trong handleUserLeft:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Lỗi khi rời khỏi phòng' });
  }
};


/**
 * Xử lý Host kết thúc cuộc họp cho tất cả
 * 
 * @param {Object} io - Socket.IO server instance
 * @param {Object} socket - Socket.IO socket instance (host)
 * @param {Object} data - { roomCode }
 * @returns {Promise<void>}
 */
export const handleEndMeeting = async (io, socket, data) => {
  try {
    const { roomCode } = data;
    const redis = getRedisClient();

    logger.info(`🔴 Host kết thúc phòng ${roomCode}`);

    // Tự động dừng ghi hình nếu đang ghi
    const recordingEgressId = await redis.get(`room:${roomCode}:egress_id`);
    if (recordingEgressId) {
      try {
        await recordingService.stopLiveKitRecording(roomCode, socket.userId);
        logger.info(`⏹️ Tự động dừng ghi hình khi kết thúc phòng ${roomCode}`);
      } catch (recError) {
        logger.error(`❌ Lỗi khi tự động dừng ghi hình:`, recError);
      }
    }

    // 1. Broadcast room:ended cho tất cả participant trong room (trừ host)
    socket.to(roomCode).emit(SOCKET_EVENTS.ROOM_ENDED, {
      message: 'The meeting has been ended by the host',
    });

    // 2. Notify waiting users (pending members chưa join room namespace)
    const room = await Room.findOne({ room_code: roomCode });
    if (room) {
      const pendingMembers = await RoomMember.find({
        room_id: room._id,
        status: USER_STATUS.PENDING,
      });

      for (const member of pendingMembers) {
        const waitingUserId = member.user_id.toString();
        const waitingSocketId = await redis.get(`user:${waitingUserId}:socket`);
        if (waitingSocketId) {
          const waitingSocket = io.sockets.sockets.get(waitingSocketId);
          if (waitingSocket) {
            waitingSocket.emit(SOCKET_EVENTS.ROOM_ENDED, {
              message: 'The meeting has been ended by the host',
            });
          }
        }
      }
    }

    // 3. Cleanup Redis keys cho host socket
    await redis.del(`room:${roomCode}:host:socket`);

    // 4. Host rời khỏi room namespace
    socket.leave(roomCode);

    logger.info(`✅ Phòng ${roomCode} đã kết thúc, tất cả đã được thông báo`);
  } catch (error) {
    logger.error('❌ Lỗi trong handleEndMeeting:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: 'Lỗi khi kết thúc phòng' });
  }
};

/**
 * Xử lý sự kiện người dùng từ chối lời mời
 */
export const handleDeclineInvite = async (io, socket, data) => {
  try {
    const { roomCode, hostId, userName } = data;
    if (!roomCode || !hostId) return;

    const redis = getRedisClient();
    const room = await Room.findOne({ room_code: roomCode.toUpperCase() });
    if (!room || room.status === ROOM_STATUS.ENDED) {
      logger.info(`Declined invite ignored: Room ${roomCode} has already ended or does not exist`);
      return;
    }

    const hostSocketId = await redis.get(`user:${hostId}:socket`);
    if (hostSocketId) {
      io.to(hostSocketId).emit(SOCKET_EVENTS.ROOM_INVITE_DECLINED, {
        roomCode: roomCode.toUpperCase(),
        userName: userName || 'Someone',
      });
      logger.info(`Notification sent to host ${hostId} that user declined invitation`);
    } else {
      logger.warn(`Could not find socket for host ${hostId} to send decline notification`);
    }
  } catch (error) {
    logger.error('Error in handleDeclineInvite:', error);
  }
};

export default { handleRoomJoin, handleApproveUser, handleRejectUser, handleUserLeft, handleEndMeeting, handleDeclineInvite };