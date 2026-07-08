import chatService from '../services/chat.service.js';
import { User, Room } from '../models/index.js';
import { SOCKET_EVENTS } from '../utils/constants.js';
import logger from '../utils/logger.js';

const normalizeRoomCode = (roomCode) => (roomCode ? roomCode.toUpperCase() : '');
const getConversationChannel = (conversationId) => `conversation:${conversationId}`;
const ackSuccess = (ack, data) => {
  if (typeof ack === 'function') {
    ack({ ok: true, ...data });
  }
};
const ackFailure = (ack, error, extra = {}) => {
  if (typeof ack === 'function') {
    ack({
      ok: false,
      error: {
        message: error.message || 'Request failed',
        statusCode: error.statusCode || 500,
      },
      ...extra,
    });
  }
};

export const handleChatSubscribe = async (socket, data = {}) => {
  try {
    const roomCode = normalizeRoomCode(data.roomCode);
    const conversationId = data.conversationId || null;

    if (conversationId) {
      await chatService.getAccessibleConversation(conversationId, socket.userId);
      socket.join(getConversationChannel(conversationId));
      const deliveryUpdate = await chatService.markConversationMessagesDelivered(conversationId, socket.userId);
      socket.emit(SOCKET_EVENTS.CHAT_DELIVERED, {
        conversationId,
        messageIds: deliveryUpdate.updatedMessageIds,
        userId: socket.userId,
      });

      return;
    }

    if (!roomCode) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'roomCode or conversationId is required' });
      return;
    }

    await chatService.getAccessibleRoom(roomCode, socket.userId, { requireJoined: false });
    socket.join(roomCode);
    const deliveryUpdate = await chatService.markRoomMessagesDelivered(roomCode, socket.userId);
    socket.emit(SOCKET_EVENTS.CHAT_DELIVERED, {
      roomCode,
      messageIds: deliveryUpdate.updatedMessageIds,
      userId: socket.userId,
    });
  } catch (error) {
    logger.error('handleChatSubscribe error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to subscribe to chat' });
  }
};

export const handleChatUnsubscribe = (socket, data = {}) => {
  if (data.conversationId) {
    socket.leave(getConversationChannel(data.conversationId));
    return;
  }

  const roomCode = normalizeRoomCode(data.roomCode);
  if (roomCode) {
    socket.leave(roomCode);
  }
};

export const handleChatSend = async (io, socket, data = {}) => {
  try {
    const roomCode = normalizeRoomCode(data.roomCode);
    const conversationId = data.conversationId || null;
    const user = await User.findById(socket.userId).select('_id full_name avatar').lean();
    if (!user) {
      socket.emit(SOCKET_EVENTS.ERROR, { message: 'User not found' });
      return;
    }

    if (conversationId) {
      const result = await chatService.sendConversationMessage(conversationId, user, data);
      // Ensure emitted message contains clientId for clients to match optimistic messages
      try {
        const cid = data.clientId || data.client_id || result.message.clientId || null;
        result.message.clientId = cid;
        // Also include legacy snake_case for clients that expect it
        result.message.client_id = cid;
      } catch (e) {
        // ignore client_id assignment errors
      }
      io.to(getConversationChannel(conversationId)).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.message);
      return;
    }

    const result = await chatService.sendRoomMessage(roomCode, user, data);
    try {
      const cid = data.clientId || data.client_id || result.message.clientId || null;
      result.message.clientId = cid;
      result.message.client_id = cid;
    } catch (e) {
      // ignore client_id assignment errors
    }
    io.to(roomCode).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.message);
  } catch (error) {
    logger.error('handleChatSend error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to send message' });
  }
};

export const handleChatHistory = async (socket, data = {}) => {
  try {
    const page = Math.max(1, parseInt(data.page, 10) || 1);
    const limit = Math.min(Math.max(1, parseInt(data.limit, 10) || 50), 100);

    if (data.conversationId) {
      const result = await chatService.getConversationMessages(data.conversationId, socket.userId, { page, limit });
      socket.emit(SOCKET_EVENTS.CHAT_HISTORY, {
        conversationId: data.conversationId,
        messages: result.messages,
        page,
        hasMore: result.pagination.page < result.pagination.pages,
      });
      return;
    }

    const roomCode = normalizeRoomCode(data.roomCode);
    const result = await chatService.getRoomMessages(roomCode, socket.userId, { page, limit });
    socket.emit(SOCKET_EVENTS.CHAT_HISTORY, {
      roomCode,
      messages: result.messages,
      page,
      hasMore: result.pagination.page < result.pagination.pages,
    });
  } catch (error) {
    logger.error('handleChatHistory error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to fetch chat history' });
  }
};

export const handleChatRead = async (io, socket, data = {}) => {
  try {
    const messageIds = Array.isArray(data.messageIds) ? data.messageIds : [];

    if (data.conversationId) {
      const result = await chatService.markConversationMessagesRead(data.conversationId, socket.userId, messageIds);
      for (const message of result.messages) {
        io.to(getConversationChannel(data.conversationId)).emit(SOCKET_EVENTS.CHAT_READ, {
          conversationId: data.conversationId,
          message,
          userId: socket.userId,
        });
      }
      return;
    }

    const roomCode = normalizeRoomCode(data.roomCode);
    const result = await chatService.markRoomMessagesRead(roomCode, socket.userId, messageIds);
    for (const message of result.messages) {
      io.to(roomCode).emit(SOCKET_EVENTS.CHAT_READ, {
        roomCode,
        message,
        userId: socket.userId,
      });
    }
  } catch (error) {
    logger.error('handleChatRead error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to mark messages as read' });
  }
};

export const handleChatReceipt = async (io, socket, data = {}, ack) => {
  try {
    const payload = {
      scopeType: data.conversationId ? 'conversation' : 'room',
      scopeId: data.conversationId || normalizeRoomCode(data.roomCode),
      messageIds: Array.isArray(data.messageIds) ? data.messageIds : [],
      status: data.status,
      clientMutationId: data.clientMutationId || null,
    };
    const result = await chatService.updateReceiptState(socket.userId, payload);
    const channel = data.conversationId ? getConversationChannel(data.conversationId) : normalizeRoomCode(data.roomCode);

    for (const message of result.messages || []) {
      io.to(channel).emit(SOCKET_EVENTS.CHAT_RECEIPT_UPDATED, {
        messageId: message.messageId,
        conversationId: message.conversationId || null,
        roomId: message.room_id || null,
        userId: socket.userId,
        status: message.status,
        message,
      });
    }

    ackSuccess(ack, { data: result, clientMutationId: payload.clientMutationId });
  } catch (error) {
    logger.error('handleChatReceipt error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to update receipts' });
    ackFailure(ack, error, { clientMutationId: data.clientMutationId || null });
  }
};

export const handleChatEdit = async (io, socket, data = {}, ack) => {
  try {
    const result = await chatService.updateMessage(data.messageId, socket.userId, data);
    const channel = result.message.conversationId
      ? getConversationChannel(result.message.conversationId)
      : normalizeRoomCode(data.roomCode);

    if (channel) {
      io.to(channel).emit(SOCKET_EVENTS.CHAT_MESSAGE_UPDATED, {
        messageId: result.message.messageId,
        version: result.message.version,
        message: result.message,
      });
    }

    ackSuccess(ack, { data: result, clientMutationId: data.clientMutationId || null });
  } catch (error) {
    logger.error('handleChatEdit error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to edit message' });
    ackFailure(ack, error, { clientMutationId: data.clientMutationId || null });
  }
};

export const handleChatDelete = async (io, socket, data = {}, ack) => {
  try {
    const result = await chatService.deleteMessage(data.messageId, socket.userId, data);
    if (data.mode === 'for_me') {
      io.to(`user:${socket.userId}`).emit(SOCKET_EVENTS.CHAT_MESSAGE_HIDDEN, {
        messageId: result.messageId,
        hiddenAt: result.hiddenAt,
      });
    } else {
      const channel = result.message.conversationId
        ? getConversationChannel(result.message.conversationId)
        : normalizeRoomCode(data.roomCode);
      if (channel) {
        io.to(channel).emit(SOCKET_EVENTS.CHAT_MESSAGE_DELETED, {
          messageId: result.message.messageId,
          version: result.message.version,
          deletedAt: result.message.deletedForEveryoneAt,
          deletedBy: result.message.deletedBy,
          message: result.message,
        });
      }
    }

    ackSuccess(ack, { data: result, clientMutationId: data.clientMutationId || null });
  } catch (error) {
    logger.error('handleChatDelete error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to delete message' });
    ackFailure(ack, error, { clientMutationId: data.clientMutationId || null });
  }
};

export const handleChatForward = async (io, socket, data = {}, ack) => {
  try {
    const user = await User.findById(socket.userId).select('_id full_name avatar').lean();
    if (!user) {
      throw Object.assign(new Error('User not found'), { statusCode: 404 });
    }

    const result = await chatService.forwardMessage(data.messageId, user, data);
    const channel = result.message.conversationId
      ? getConversationChannel(result.message.conversationId)
      : normalizeRoomCode(data.targetId);
    if (channel) {
      io.to(channel).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.message);
    }

    ackSuccess(ack, { data: result, clientMutationId: data.clientMutationId || null });
  } catch (error) {
    logger.error('handleChatForward error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to forward message' });
    ackFailure(ack, error, { clientMutationId: data.clientMutationId || null });
  }
};

export const handleChatReactionAdd = async (io, socket, data = {}, ack) => {
  try {
    const result = await chatService.addReaction(data.messageId, socket.userId, data.emoji, data.clientMutationId || null);
    const channel = result.message.conversationId
      ? getConversationChannel(result.message.conversationId)
      : normalizeRoomCode(data.roomCode);
    if (channel) {
      io.to(channel).emit(SOCKET_EVENTS.CHAT_REACTION_UPDATED, {
        messageId: result.message.messageId,
        emoji: result.emoji,
        action: 'added',
        userId: socket.userId,
        reactionCounts: result.message.reactionCounts,
        message: result.message,
      });
    }

    ackSuccess(ack, { data: result, clientMutationId: data.clientMutationId || null });
  } catch (error) {
    logger.error('handleChatReactionAdd error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to add reaction' });
    ackFailure(ack, error, { clientMutationId: data.clientMutationId || null });
  }
};

export const handleChatReactionRemove = async (io, socket, data = {}, ack) => {
  try {
    const result = await chatService.removeReaction(data.messageId, socket.userId, data.emoji);
    const channel = result.message.conversationId
      ? getConversationChannel(result.message.conversationId)
      : normalizeRoomCode(data.roomCode);
    if (channel) {
      io.to(channel).emit(SOCKET_EVENTS.CHAT_REACTION_UPDATED, {
        messageId: result.message.messageId,
        emoji: result.emoji,
        action: 'removed',
        userId: socket.userId,
        reactionCounts: result.message.reactionCounts,
        message: result.message,
      });
    }

    ackSuccess(ack, { data: result, clientMutationId: data.clientMutationId || null });
  } catch (error) {
    logger.error('handleChatReactionRemove error:', error);
    socket.emit(SOCKET_EVENTS.ERROR, { message: error.message || 'Failed to remove reaction' });
    ackFailure(ack, error, { clientMutationId: data.clientMutationId || null });
  }
};

export const handleChatTyping = (socket, data = {}) => {
  if (data.conversationId) {
    socket.to(getConversationChannel(data.conversationId)).emit(SOCKET_EVENTS.CHAT_TYPING, {
      conversationId: data.conversationId,
      userId: socket.userId,
      userName: data.userName || 'Someone',
    });
    return;
  }

  const roomCode = normalizeRoomCode(data.roomCode);
  if (roomCode) {
    socket.to(roomCode).emit(SOCKET_EVENTS.CHAT_TYPING, {
      roomCode,
      userId: socket.userId,
      userName: data.userName || 'Someone',
    });
  }
};

export const handleChatTypingStop = (socket, data = {}) => {
  if (data.conversationId) {
    socket.to(getConversationChannel(data.conversationId)).emit(SOCKET_EVENTS.CHAT_TYPING_STOP, {
      conversationId: data.conversationId,
      userId: socket.userId,
    });
    return;
  }

  const roomCode = normalizeRoomCode(data.roomCode);
  if (roomCode) {
    socket.to(roomCode).emit(SOCKET_EVENTS.CHAT_TYPING_STOP, {
      roomCode,
      userId: socket.userId,
    });
  }
};

export default {
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
};
