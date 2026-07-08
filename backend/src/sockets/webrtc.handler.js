import { Conversation, Room, RoomMember } from '../models/index.js';
import { SOCKET_EVENTS, USER_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

const emitSocketError = (socket, message) => {
  socket.emit(SOCKET_EVENTS.ERROR, { message });
};

const ensureCanSignal = async ({ socket, roomCode, conversationId, recipientUserId }) => {
  const fromUserId = socket.userId;
  if (!fromUserId) {
    throw new Error('Unauthorized socket');
  }

  if (!recipientUserId) {
    throw new Error('Target user ID is required for WebRTC signaling');
  }

  if (conversationId) {
    const conversation = await Conversation.findOne({
      _id: conversationId,
      member_ids: { $all: [fromUserId, recipientUserId] },
    }).lean();
    if (!conversation) {
      throw new Error('Both peers must belong to the same conversation');
    }
    return fromUserId;
  }

  if (!roomCode) {
    throw new Error('roomCode or conversationId is required for WebRTC signaling');
  }

  const room = await Room.findOne({ room_code: roomCode }).lean();
  if (!room) {
    throw new Error('Room not found');
  }

  const hostId = room.host_id.toString();
  const participantIds = [fromUserId, recipientUserId];
  const nonHostParticipantIds = participantIds.filter((id) => id.toString() !== hostId);
  const memberships = await RoomMember.distinct('user_id', {
    room_id: room._id,
    user_id: { $in: nonHostParticipantIds },
    status: USER_STATUS.JOINED,
  });
  const allowedIds = new Set([hostId, ...memberships.map((id) => id.toString())]);

  if (!participantIds.every((id) => allowedIds.has(id.toString()))) {
    throw new Error('Both peers must be joined in the same room');
  }

  return fromUserId;
};

const forwardSignal = async (socket, data, eventName, payloadKey) => {
  const recipientUserId = data.targetUserId || data.to;
  const payload = data[payloadKey];
  if (!payload) {
    throw new Error(`Missing ${payloadKey} payload`);
  }

  const fromUserId = await ensureCanSignal({
    socket,
    roomCode: data.roomCode,
    conversationId: data.conversationId,
    recipientUserId,
  });

  socket.to(`user:${recipientUserId}`).emit(eventName, {
    from: fromUserId,
    fromUserId,
    targetUserId: recipientUserId,
    roomCode: data.roomCode || null,
    conversationId: data.conversationId || null,
    [payloadKey]: payload,
  });
};

export const handleWebRTCOffer = async (socket, data = {}) => {
  try {
    await forwardSignal(socket, data, SOCKET_EVENTS.WEBRTC_OFFER, 'offer');
  } catch (error) {
    logger.error('handleWebRTCOffer error:', error);
    emitSocketError(socket, error.message || 'Failed to send WebRTC offer');
  }
};

export const handleWebRTCAnswer = async (socket, data = {}) => {
  try {
    await forwardSignal(socket, data, SOCKET_EVENTS.WEBRTC_ANSWER, 'answer');
  } catch (error) {
    logger.error('handleWebRTCAnswer error:', error);
    emitSocketError(socket, error.message || 'Failed to send WebRTC answer');
  }
};

export const handleICECandidate = async (socket, data = {}) => {
  try {
    await forwardSignal(socket, data, SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, 'candidate');
  } catch (error) {
    logger.warn('handleICECandidate rejected:', error.message);
    emitSocketError(socket, error.message || 'Failed to send ICE candidate');
  }
};

export default { handleWebRTCOffer, handleWebRTCAnswer, handleICECandidate };
