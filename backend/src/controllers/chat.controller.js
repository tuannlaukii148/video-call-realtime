import chatService from '../services/chat.service.js';
import { SOCKET_EVENTS, HTTP_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { Room } from '../models/index.js';
import { buildUploadUrl } from '../middlewares/upload.js';

const getScopeChannel = async (message) => {
  if (message?.conversationId) {
    return `conversation:${message.conversationId}`;
  }

  if (message?.room_id) {
    const room = await Room.findById(message.room_id).select('room_code').lean();
    return room?.room_code || null;
  }

  return null;
};

class ChatController {
  async searchUsers(req, res) {
    try {
      const { email } = req.query;
      const result = await chatService.searchUsersByEmail(email, req.userId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Search users error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async createDirectConversation(req, res) {
    try {
      const result = await chatService.createOrGetDirectConversation(req.userId, req.body);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Create direct conversation error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getConversations(req, res) {
    try {
      const result = await chatService.getConversations(req.userId);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get conversations error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getRoomMessages(req, res) {
    try {
      const { roomCode } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await chatService.getRoomMessages(roomCode, req.userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get room messages error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async getConversationMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const { page = 1, limit = 50 } = req.query;
      const result = await chatService.getConversationMessages(conversationId, req.userId, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
      });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Get conversation messages error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async addConversationMember(req, res) {
    try {
      const { conversationId } = req.params;
      const result = await chatService.addConversationMember(conversationId, req.userId, req.body);
      req.app.locals.io?.to(`conversation:${result.conversation.conversationId}`).emit(SOCKET_EVENTS.CHAT_CONVERSATION_UPDATED, result.conversation);
      req.app.locals.io?.to(`conversation:${result.conversation.conversationId}`).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.systemMessage);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Add conversation member error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const result = await chatService.updateConversation(conversationId, req.userId, req.body);
      req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_CONVERSATION_UPDATED, result.conversation);
      req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.systemMessage);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Update conversation error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateConversationMember(req, res) {
    try {
      const { conversationId, userId } = req.params;
      const result = await chatService.updateConversationMember(conversationId, req.userId, userId, req.body);
      req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_CONVERSATION_UPDATED, result.conversation);
      req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.systemMessage);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Update conversation member error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteConversationMember(req, res) {
    try {
      const { conversationId, userId } = req.params;
      const result = await chatService.removeConversationMember(conversationId, req.userId, userId);
      req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_CONVERSATION_UPDATED, result.conversation);
      req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.systemMessage);
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Delete conversation member error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteConversation(req, res) {
    try {
      const { conversationId } = req.params;
      const result = await chatService.deleteConversation(conversationId, req.userId);
      req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_DELETED, {
        conversationId,
        deletedConversationId: result.conversationId,
      });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Delete conversation error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async sendRoomMessage(req, res) {
    try {
      const { roomCode } = req.params;
      const result = await chatService.sendRoomMessage(roomCode, req.user, req.body);
      req.app.locals.io?.to(roomCode.toUpperCase()).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.message);
      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error('Send room message error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async uploadAttachment(req, res) {
    try {
      if (!req.file) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ success: false, message: 'No file uploaded' });
      }

      const url = buildUploadUrl(req, req.file);
      const fileMeta = {
        url,
        filename: req.file.originalname,
        storedFilename: req.file.filename,
        mime_type: req.file.mimetype,
        size: req.file.size,
      };

      res.status(HTTP_STATUS.OK).json({ success: true, file: fileMeta });
    } catch (error) {
      logger.error('Upload attachment error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({ success: false, message: error.message });
    }
  }

  async sendConversationMessage(req, res) {
    try {
      const { conversationId } = req.params;
      const result = await chatService.sendConversationMessage(conversationId, req.user, req.body);
      req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.message);
      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error('Send conversation message error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async markRoomMessagesRead(req, res) {
    try {
      const { roomCode } = req.params;
      const messageIds = Array.isArray(req.body.messageIds) ? req.body.messageIds : [];
      const result = await chatService.markRoomMessagesRead(roomCode, req.userId, messageIds);

      for (const message of result.messages) {
        req.app.locals.io?.to(roomCode.toUpperCase()).emit(SOCKET_EVENTS.CHAT_READ, {
          roomCode: roomCode.toUpperCase(),
          message,
          userId: req.userId,
        });
      }

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Mark room messages read error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async markConversationMessagesRead(req, res) {
    try {
      const { conversationId } = req.params;
      const messageIds = Array.isArray(req.body.messageIds) ? req.body.messageIds : [];
      const result = await chatService.markConversationMessagesRead(conversationId, req.userId, messageIds);

      for (const message of result.messages) {
        req.app.locals.io?.to(`conversation:${conversationId}`).emit(SOCKET_EVENTS.CHAT_READ, {
          conversationId,
          message,
          userId: req.userId,
        });
      }

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Mark conversation messages read error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateReceiptState(req, res) {
    try {
      const result = await chatService.updateReceiptState(req.userId, req.body);

      for (const message of result.messages || []) {
        const channel = await getScopeChannel(message);
        if (channel) {
          req.app.locals.io?.to(channel).emit(SOCKET_EVENTS.CHAT_RECEIPT_UPDATED, {
            messageId: message.messageId,
            conversationId: message.conversationId || null,
            roomId: message.room_id || null,
            userId: req.userId,
            status: message.status,
            message,
          });
        }
      }

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Update receipt state error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async updateMessage(req, res) {
    try {
      const result = await chatService.updateMessage(req.params.messageId, req.userId, req.body);
      const channel = await getScopeChannel(result.message);
      if (channel) {
        req.app.locals.io?.to(channel).emit(SOCKET_EVENTS.CHAT_MESSAGE_UPDATED, {
          messageId: result.message.messageId,
          version: result.message.version,
          message: result.message,
        });
      }
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Update message error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteMessage(req, res) {
    try {
      const result = await chatService.deleteMessage(req.params.messageId, req.userId, req.body);

      if (req.body.mode === 'for_me') {
        req.app.locals.io?.to(`user:${req.userId}`).emit(SOCKET_EVENTS.CHAT_MESSAGE_HIDDEN, {
          messageId: result.messageId,
          hiddenAt: result.hiddenAt,
        });
      } else {
        const channel = await getScopeChannel(result.message);
        if (channel) {
          req.app.locals.io?.to(channel).emit(SOCKET_EVENTS.CHAT_MESSAGE_DELETED, {
            messageId: result.message.messageId,
            version: result.message.version,
            deletedAt: result.message.deletedForEveryoneAt,
            deletedBy: result.message.deletedBy,
            message: result.message,
          });
        }
      }

      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Delete message error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async forwardMessage(req, res) {
    try {
      const result = await chatService.forwardMessage(req.params.messageId, req.user, req.body);
      const channel = await getScopeChannel(result.message);
      if (channel) {
        req.app.locals.io?.to(channel).emit(SOCKET_EVENTS.CHAT_RECEIVE, result.message);
      }
      res.status(HTTP_STATUS.CREATED).json(result);
    } catch (error) {
      logger.error('Forward message error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async addReaction(req, res) {
    try {
      const result = await chatService.addReaction(
        req.params.messageId,
        req.userId,
        req.params.emoji,
        req.body.clientMutationId || null
      );
      const channel = await getScopeChannel(result.message);
      if (channel) {
        req.app.locals.io?.to(channel).emit(SOCKET_EVENTS.CHAT_REACTION_UPDATED, {
          messageId: result.message.messageId,
          emoji: result.emoji,
          action: 'added',
          userId: req.userId,
          reactionCounts: result.message.reactionCounts,
          message: result.message,
        });
      }
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Add reaction error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async removeReaction(req, res) {
    try {
      const result = await chatService.removeReaction(req.params.messageId, req.userId, req.params.emoji);
      const channel = await getScopeChannel(result.message);
      if (channel) {
        req.app.locals.io?.to(channel).emit(SOCKET_EVENTS.CHAT_REACTION_UPDATED, {
          messageId: result.message.messageId,
          emoji: result.emoji,
          action: 'removed',
          userId: req.userId,
          reactionCounts: result.message.reactionCounts,
          message: result.message,
        });
      }
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Remove reaction error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async listMessageEdits(req, res) {
    try {
      const result = await chatService.listMessageEdits(req.params.messageId, req.userId, {
        limit: parseInt(req.query.limit, 10) || 50,
      });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('List message edits error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async listMessageReactions(req, res) {
    try {
      const result = await chatService.listMessageReactions(req.params.messageId, req.userId, {
        emoji: req.query.emoji || undefined,
        limit: parseInt(req.query.limit, 10) || 50,
      });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('List message reactions error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  async deleteRoomMessage(req, res) {
    try {
      const { roomCode, messageId } = req.params;
      const result = await chatService.deleteRoomMessage(roomCode, messageId, req.userId);
      req.app.locals.io?.to(roomCode.toUpperCase()).emit(SOCKET_EVENTS.CHAT_MESSAGE_DELETED, {
        messageId: result.deletedMessageId,
        message: result.message,
      });
      res.status(HTTP_STATUS.OK).json(result);
    } catch (error) {
      logger.error('Delete room message error:', error);
      res.status(error.statusCode || HTTP_STATUS.INTERNAL_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}

export default new ChatController();
