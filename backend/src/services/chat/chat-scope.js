import mongoose from 'mongoose';

export const CONVERSATION_ROLE = {
  OWNER: 'owner',
  MEMBER: 'member',
};

export const toObjectId = (value) => (
  value instanceof mongoose.Types.ObjectId ? value : new mongoose.Types.ObjectId(value)
);

export const toIdString = (value) => value?.toString?.() || String(value || '');

export const normalizeRoomCode = (roomCode) => (roomCode ? roomCode.toUpperCase() : '');

export const normalizeScopeType = (scopeType) => (scopeType === 'room' ? 'room' : 'conversation');

export const buildDirectKey = (memberIds) => memberIds.map(toIdString).sort().join(':');

export const getScopeFromMessage = (message) => {
  if (message.conversation_id) {
    return {
      scopeType: 'conversation',
      scopeId: toIdString(message.conversation_id),
    };
  }

  return {
    scopeType: 'room',
    scopeId: toIdString(message.room_id),
  };
};

export const buildMessageSnapshot = (message) => {
  if (!message) {
    return null;
  }

  return {
    message_id: message._id,
    sender_id: message.sender_id || null,
    sender_name: message.sender_name,
    content: message.content,
    type: message.type,
    timestamp: message.timestamp,
    conversation_id: message.conversation_id || null,
    room_id: message.room_id || null,
    attachment: message.attachment || null,
    emoji: message.emoji || null,
  };
};
