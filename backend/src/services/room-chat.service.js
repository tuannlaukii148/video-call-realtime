import { BaseChatService } from './base-chat.service.js';
import { Room, Message } from '../models/index.js';
import { MESSAGE_TYPE, MESSAGE_STATUS, ERROR_MESSAGES, HTTP_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';

export class RoomChatService extends BaseChatService {
  async sendRoomMessage(roomCode, user, data) {
    try {
      const room = await this.getAccessibleRoom(roomCode, user._id, {
        requireChatEnabled: true,
        requireJoined: true,
      });

      const content = data.content?.trim();
      const recipientIds = await this.getRecipientIds(room._id, user._id);
      const replyMessage = data.replyToMessageId
        ? await this.getMessageByIdForUser(data.replyToMessageId, user._id, { roomId: room._id })
        : null;
      const message = new Message({
        room_id: room._id,
        sender_id: user._id,
        sender_name: user.full_name,
        sender_avatar: user.avatar || null,
        type: data.type || MESSAGE_TYPE.TEXT,
        content: content ? content.substring(0, 5000) : null,
        attachment: data.attachment || null,
        sticker_id: data.stickerId || null,
        emoji: data.emoji || null,
        client_id: data.clientId || null,
        reply_to_message_id: replyMessage?._id || null,
        reply_snapshot: await this.buildReplySnapshot(replyMessage),
        status: recipientIds.length > 0 ? MESSAGE_STATUS.SENT : MESSAGE_STATUS.READ,
        timestamp: new Date(),
      });

      await message.save();
      await this.seedMessageReceipts(message, 'room', room.room_code, recipientIds);
      return { success: true, message: this.mapMessage(message, user._id) };
    } catch (error) {
      logger.error('Send room message error:', error);
      throw error;
    }
  }

  async getRoomMessages(roomCode, userId, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;
      const room = await this.getAccessibleRoom(roomCode, userId);

      const messages = await Message.find({ room_id: room._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      const visibleMessages = await this.excludeHiddenMessages(messages, userId);

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
        messages: await Promise.all(
          visibleMessages.reverse().map((message) => this.mapMessage(message, userId))
        ),
      };
    } catch (error) {
      logger.error('Get room messages error:', error);
      throw error;
    }
  }

  async markRoomMessagesDelivered(roomCode, userId) {
    try {
      const room = await this.getAccessibleRoom(roomCode, userId, { requireJoined: true });
      return this.markMessagesDeliveredByFilter(
        {
          room_id: room._id,
          sender_id: { $ne: userId },
        },
        userId
      );
    } catch (error) {
      logger.error('Mark room messages delivered error:', error);
      throw error;
    }
  }

  async markRoomMessagesRead(roomCode, userId, messageIds = []) {
    try {
      const room = await this.getAccessibleRoom(roomCode, userId, { requireJoined: true });
      return this.markMessagesReadByFilter(
        {
          room_id: room._id,
          sender_id: { $ne: userId },
        },
        userId,
        messageIds
      );
    } catch (error) {
      logger.error('Mark room messages read error:', error);
      throw error;
    }
  }

  async deleteRoomMessage(roomCode, messageId, userId) {
    const room = await this.getAccessibleRoom(roomCode, userId);
    return this.deleteMessage(messageId, userId, {
      mode: 'for_everyone',
      roomId: room._id,
    });
  }

  async clearRoomMessages(roomCode, hostId) {
    try {
      const room = await Room.findOne({ room_code: roomCode });
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

      const result = await Message.deleteMany({ room_id: room._id });
      return {
        success: true,
        message: `${result.deletedCount} messages cleared`,
      };
    } catch (error) {
      logger.error('Clear room messages error:', error);
      throw error;
    }
  }
}

export default new RoomChatService();
