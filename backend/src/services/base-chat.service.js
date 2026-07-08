import mongoose from "mongoose";
import {
  Conversation,
  Message,
  MessageEdit,
  MessageReaction,
  MessageUserState,
  Room,
  RoomMember,
  User,
} from "../models/index.js";
import {
  ERROR_MESSAGES,
  HTTP_STATUS,
  MESSAGE_REACTION,
  MESSAGE_STATUS,
  MESSAGE_TYPE,
} from "../utils/constants.js";
import logger from "../utils/logger.js";
import {
  assertConversationOwner,
  getAccessibleConversation,
  getAccessibleRoom,
  getConversationMemberRoles,
  getConversationRole,
} from "./chat/access-policy.js";
import {
  buildDirectKey,
  buildMessageSnapshot,
  CONVERSATION_ROLE,
  getScopeFromMessage,
  normalizeScopeType,
  toIdString,
} from "./chat/chat-scope.js";
import { mapMessage } from "./chat/message-mapper.js";
import {
  attachReceipts,
  computeAggregateStatus,
  markMessagesDeliveredByFilter,
  markMessagesReadByFilter,
  seedMessageReceipts,
  upsertThreadUserState,
} from "./chat/receipt-service.js";

const MESSAGE_REACTIONS = Object.values(MESSAGE_REACTION);
const MESSAGE_DELETE_PLACEHOLDER = "This message was deleted";

const throwHttp = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

export class BaseChatService {
  normalizeScopeType(scopeType) {
    return normalizeScopeType(scopeType);
  }

  buildReplySnapshot(message) {
    return buildMessageSnapshot(message);
  }

  async seedMessageReceipts(message, scopeType, scopeId, recipientIds = []) {
    return seedMessageReceipts(message, scopeType, scopeId, recipientIds);
  }

  async upsertThreadUserState(scopeType, scopeId, userId, payload) {
    try {
      await upsertThreadUserState(scopeType, scopeId, userId, payload);
    } catch (error) {
      logger.error("upsertThreadUserState error:", error);
    }
  }

  async excludeHiddenMessages(messages, userId) {
    if (!messages || !messages.length) {
      return messages || [];
    }

    const messageIds = messages.map((message) => message._id);
    const hiddenDocs = await MessageUserState.find({
      message_id: { $in: messageIds },
      user_id: userId,
      hidden_at: { $ne: null },
    })
      .select("message_id")
      .lean();
    const hiddenSet = new Set(
      hiddenDocs.map((doc) => doc.message_id.toString()),
    );

    return messages.filter((message) => !hiddenSet.has(message._id.toString()));
  }

  mapMessage(messages, viewerId = null) {
    if (Array.isArray(messages)) {
      return messages.map((message) => mapMessage(message, viewerId));
    }
    return mapMessage(messages, viewerId);
  }

  async mapMessageWithReceipts(message, viewerId = null) {
    if (!message) return null;
    const [msgWithReceipts] = await attachReceipts([message]);
    return mapMessage(msgWithReceipts, viewerId);
  }

  async mapMessagesWithReceipts(messages, viewerId = null) {
    if (!messages || messages.length === 0) {
      return [];
    }
    const msgsWithReceipts = await attachReceipts(messages);
    return msgsWithReceipts.map((msg) => mapMessage(msg, viewerId));
  }


  async createSystemMessage(scope, description, metadata = {}) {
    try {
      const messageData = {
        sender_id: null,
        sender_name: "System",
        sender_avatar: null,
        type: MESSAGE_TYPE.SYSTEM,
        content: description,
        status: MESSAGE_STATUS.READ,
        system_event: metadata.systemEvent || null,
        timestamp: new Date(),
      };

      let recipientIds = [];
      let scopeType = null;
      let scopeId = null;

      if (scope.roomCode) {
        const room = await Room.findOne({
          room_code: scope.roomCode.toUpperCase(),
        });
        if (!room) {
          throwHttp(ERROR_MESSAGES.ROOM_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
        }
        messageData.room_id = room._id;
        recipientIds = await this.getRecipientIds(room._id, null);
        scopeType = "room";
        scopeId = room._id;
      } else if (scope.conversationId) {
        const conversation = await this.getAccessibleConversation(
          scope.conversationId,
          scope.userId,
        );
        messageData.conversation_id = conversation._id;
        recipientIds = conversation.member_ids.map(toIdString);
        scopeType = "conversation";
        scopeId = conversation._id;
      } else {
        throwHttp("Message scope is required", HTTP_STATUS.UNPROCESSABLE);
      }

      const message = await Message.create(messageData);
      await this.seedMessageReceipts(message, scopeType, scopeId, recipientIds);

      if (messageData.conversation_id) {
        await Conversation.updateOne(
          { _id: messageData.conversation_id },
          { last_message_id: message._id, updated_at: new Date() },
        );
      }

      return this.mapMessageWithReceipts(message, scope.userId || null);
    } catch (error) {
      logger.error("Create system message error:", error);
      throw error;
    }
  }

  async getMessageByIdForUser(messageId, userId, constraints = {}) {
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      throwHttp("Invalid message ID", HTTP_STATUS.BAD_REQUEST);
    }

    const message = await Message.findById(messageId);
    if (!message) {
      throwHttp("Message not found", HTTP_STATUS.NOT_FOUND);
    }

    if (
      constraints.conversationId &&
      message.conversation_id?.toString() !==
        constraints.conversationId.toString()
    ) {
      throwHttp("Message not found", HTTP_STATUS.NOT_FOUND);
    }

    if (
      constraints.roomId &&
      message.room_id?.toString() !== constraints.roomId.toString()
    ) {
      throwHttp("Message not found", HTTP_STATUS.NOT_FOUND);
    }

    if (message.conversation_id) {
      await this.getAccessibleConversation(
        message.conversation_id.toString(),
        userId,
      );
    } else if (message.room_id) {
      await this.getAccessibleRoom(message.room_id, userId, {
        requireJoined: true,
      });
    }

    return message;
  }

  async updateMessage(messageId, userId, payload) {
    try {
      const message = await this.getMessageByIdForUser(messageId, userId);
      if (
        message.type !== MESSAGE_TYPE.TEXT ||
        !message.sender_id ||
        message.sender_id.toString() !== userId.toString()
      ) {
        throwHttp(
          "Only the sender can edit this message",
          HTTP_STATUS.FORBIDDEN,
        );
      }

      if (message.deleted_for_everyone_at) {
        throwHttp("Deleted messages cannot be edited", HTTP_STATUS.CONFLICT);
      }

      if (message.version !== payload.expectedVersion) {
        throwHttp("Message version conflict", HTTP_STATUS.CONFLICT);
      }

      const nextContent = payload.content.trim().substring(0, 5000);
      const nextVersion = message.version + 1;

      await MessageEdit.create({
        message_id: message._id,
        editor_id: userId,
        from_version: message.version,
        to_version: nextVersion,
        previous_content: message.content,
        new_content: nextContent,
        edited_at: new Date(),
      });

      message.content = nextContent;
      message.version = nextVersion;
      message.edited_at = new Date();
      message.edited_by = userId;
      message.edit_count = (message.edit_count || 0) + 1;
      await message.save();

      return {
        success: true,
        message: this.mapMessage(message),
      };
    } catch (error) {
      logger.error("Update message error:", error);
      throw error;
    }
  }

  async deleteMessage(messageId, userId, payload = {}) {
    try {
      const message = await this.getMessageByIdForUser(
        messageId,
        userId,
        payload,
      );
      if (payload.mode === "for_me") {
        const hiddenAt = new Date();
        await MessageUserState.findOneAndUpdate(
          { message_id: message._id, user_id: userId },
          { hidden_at: hiddenAt, hidden_reason: "delete_for_me" },
          { upsert: true },
        );

        return {
          success: true,
          hidden: true,
          messageId: message._id.toString(),
          hiddenAt: hiddenAt.toISOString(),
          scope: this.getScopeFromMessage(message),
        };
      }

      let canDeleteForEveryone =
        message.sender_id?.toString() === userId.toString();
      if (message.room_id && !canDeleteForEveryone) {
        const room = await Room.findById(message.room_id)
          .select("host_id")
          .lean();
        canDeleteForEveryone = room?.host_id?.toString() === userId.toString();
      }

      if (!canDeleteForEveryone) {
        throwHttp("Unauthorized to delete this message", HTTP_STATUS.FORBIDDEN);
      }

      if (message.deleted_for_everyone_at) {
        throwHttp("Message has already been deleted", HTTP_STATUS.CONFLICT);
      }

      if (
        payload.expectedVersion &&
        message.version !== payload.expectedVersion
      ) {
        throwHttp("Message version conflict", HTTP_STATUS.CONFLICT);
      }

      message.content = MESSAGE_DELETE_PLACEHOLDER;
      message.attachment = null;
      message.emoji = null;
      message.sticker_id = null;
      message.deleted_for_everyone_at = new Date();
      message.deleted_by = userId;
      message.delete_reason = "deleted_by_user";
      message.version += 1;
      await message.save();

      return {
        success: true,
        message: await this.mapMessage(message),
        deletedMessageId: message._id.toString(),
        scope: this.getScopeFromMessage(message),
      };
    } catch (error) {
      logger.error("Delete message error:", error);
      throw error;
    }
  }

  buildForwardPayload(sourceMessage, user, clientId) {
    return {
      sender_id: user._id,
      sender_name: user.full_name,
      sender_avatar: user.avatar || null,
      type: sourceMessage.type,
      content: sourceMessage.content,
      attachment: sourceMessage.attachment || null,
      sticker_id: sourceMessage.sticker_id || null,
      emoji: sourceMessage.emoji || null,
      client_id: clientId || null,
      forwarded_from: this.buildReplySnapshot(sourceMessage),
      timestamp: new Date(),
    };
  }

  async forwardMessage(messageId, user, payload) {
    try {
      const sourceMessage = await this.getMessageByIdForUser(
        messageId,
        user._id,
      );
      if (sourceMessage.deleted_for_everyone_at) {
        throwHttp("Deleted messages cannot be forwarded", HTTP_STATUS.CONFLICT);
      }

      if (payload.targetType === "conversation") {
        const conversation = await this.getAccessibleConversation(
          payload.targetId,
          user._id,
        );
        const recipientIds = conversation.member_ids
          .map(toIdString)
          .filter((memberId) => memberId !== user._id.toString());
        const message = await Message.create({
          ...this.buildForwardPayload(sourceMessage, user, payload.clientId),
          conversation_id: conversation._id,
        });

        await this.seedMessageReceipts(
          message,
          "conversation",
          conversation._id,
          recipientIds,
        );
        await Conversation.updateOne(
          { _id: conversation._id },
          { last_message_id: message._id, updated_at: new Date() },
        );

        return {
          success: true,
          message: await this.mapMessage(message),
        };
      }
      else {
        throwHttp("Invalid target type", HTTP_STATUS.BAD_REQUEST);
      }
    } catch (error) {
      logger.error("Forward message error:", error);
      throw error;
    }
  }

  async updateReceiptState(userId, payload) {
    const scopeType = this.normalizeScopeType(payload.scopeType);
    if (scopeType === "conversation") {
      if (payload.status === MESSAGE_STATUS.READ) {
        return this.markConversationMessagesRead(
          payload.scopeId,
          userId,
          payload.messageIds || [],
        );
      }
      return this.markConversationMessagesDelivered(payload.scopeId, userId);
    }

    if (payload.status === MESSAGE_STATUS.READ) {
      return this.markRoomMessagesRead(
        payload.scopeId,
        userId,
        payload.messageIds || [],
      );
    }
    return this.markRoomMessagesDelivered(payload.scopeId, userId);
  }

  async listMessageEdits(messageId, userId, options = {}) {
    await this.getMessageByIdForUser(messageId, userId);

    const edits = await MessageEdit.find({ message_id: messageId })
      .sort({ edited_at: -1 })
      .limit(options.limit || 50)
      .lean();

    return {
      success: true,
      edits: edits.map((entry) => ({
        editId: entry._id.toString(),
        messageId: entry.message_id.toString(),
        editorId: entry.editor_id.toString(),
        fromVersion: entry.from_version,
        toVersion: entry.to_version,
        previousContent: entry.previous_content,
        newContent: entry.new_content,
        editedAt: entry.edited_at,
      })),
    };
  }

  async listMessageReactions(messageId, userId, options = {}) {
    await this.getMessageByIdForUser(messageId, userId);

    const query = { message_id: messageId };
    if (options.emoji) {
      query.emoji = options.emoji;
    }

    const reactions = await MessageReaction.find(query)
      .sort({ reacted_at: -1 })
      .limit(options.limit || 50)
      .lean();
    const users = await User.find({
      _id: { $in: reactions.map((reaction) => reaction.user_id) },
    })
      .select("_id full_name avatar email")
      .lean();
    const userMap = new Map(
      users.map((userObj) => [userObj._id.toString(), userObj]),
    );

    return {
      success: true,
      reactions: reactions.map((entry) => {
        const userObj = userMap.get(entry.user_id.toString()) || {};
        return {
          reactionId: entry._id.toString(),
          emoji: entry.emoji,
          reactedAt: entry.reacted_at,
          userId: entry.user_id.toString(),
          userName: userObj.full_name || "",
          userAvatar: userObj.avatar || null,
          userEmail: userObj.email || "",
        };
      }),
    };
  }

  async syncReactionSummary(messageId) {
    const counts = await MessageReaction.aggregate([
      { $match: { message_id: new mongoose.Types.ObjectId(messageId) } },
      { $group: { _id: "$emoji", count: { $sum: 1 } } },
    ]);
    const summary = {};
    for (const { _id, count } of counts) {
      summary[_id] = count;
    }
    await Message.updateOne(
      { _id: messageId },
      { $set: { reaction_summary: summary } },
    );
    return summary;
  }

  async addReaction(messageId, userId, emoji, clientMutationId = null) {
    if (!MESSAGE_REACTIONS.includes(emoji)) {
      throwHttp("Unsupported reaction", HTTP_STATUS.BAD_REQUEST);
    }

    const message = await this.getMessageByIdForUser(messageId, userId);
    if (message.deleted_for_everyone_at) {
      throwHttp("Deleted messages cannot be reacted to", HTTP_STATUS.CONFLICT);
    }

    await MessageReaction.findOneAndUpdate(
      { message_id: message._id, user_id: userId, emoji },
      {
        reacted_at: new Date(),
        client_mutation_id: clientMutationId || null,
      },
      { upsert: true },
    );

    await this.syncReactionSummary(message._id);
    const updated = await Message.findById(message._id).lean();

    return {
      success: true,
      message: await this.mapMessage(updated),
      emoji,
    };
  }

  async removeReaction(messageId, userId, emoji) {
    if (!MESSAGE_REACTIONS.includes(emoji)) {
      throwHttp("Unsupported reaction", HTTP_STATUS.BAD_REQUEST);
    }

    const message = await this.getMessageByIdForUser(messageId, userId);
    await MessageReaction.deleteOne({
      message_id: message._id,
      user_id: userId,
      emoji,
    });
    await this.syncReactionSummary(message._id);
    const updated = await Message.findById(message._id).lean();

    return {
      success: true,
      message: await this.mapMessageWithReceipts(updated, userId),
      emoji,
    };
  }

  getAccessibleRoom(roomId, userId, options = {}) {
    return getAccessibleRoom(roomId, userId, options);
  }

  getAccessibleConversation(conversationId, userId) {
    return getAccessibleConversation(conversationId, userId);
  }

  async resolveTargetUser(payload, requesterId) {
    let targetUser = null;
    if (payload.userId && mongoose.Types.ObjectId.isValid(payload.userId)) {
      targetUser = await User.findById(payload.userId)
        .select("_id full_name email avatar")
        .lean();
    } else if (payload.email) {
      targetUser = await User.findOne({
        email: payload.email.trim().toLowerCase(),
      })
        .select("_id full_name email avatar")
        .lean();
    }

    if (targetUser?._id?.toString() === requesterId.toString()) {
      throwHttp(
        "Cannot create a conversation with yourself",
        HTTP_STATUS.UNPROCESSABLE,
      );
    }

    return targetUser;
  }

  async resolveTargetUsers(payload, requesterId) {
    if (Array.isArray(payload.userIds) && payload.userIds.length > 0) {
      const uniqueIds = [
        ...new Set(
          payload.userIds
            .filter((value) => mongoose.Types.ObjectId.isValid(value))
            .map((value) => value.toString()),
        ),
      ];
      if (uniqueIds.some((id) => id === requesterId.toString())) {
        throwHttp(
          "Cannot create a conversation with yourself",
          HTTP_STATUS.UNPROCESSABLE,
        );
      }

      const users = await User.find({ _id: { $in: uniqueIds } })
        .select("_id full_name email avatar")
        .lean();

      if (users.length !== uniqueIds.length) {
        throwHttp(ERROR_MESSAGES.USER_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
      }

      return uniqueIds
        .map((id) => users.find((userObj) => userObj._id.toString() === id))
        .filter(Boolean);
    }

    const user = await this.resolveTargetUser(payload, requesterId);
    return user ? [user] : [];
  }

  getConversationMemberRoles(conversation) {
    return getConversationMemberRoles(conversation);
  }

  getConversationRole(conversation, userId) {
    return getConversationRole(conversation, userId);
  }

  assertConversationOwner(conversation, userId) {
    return assertConversationOwner(conversation, userId);
  }

  buildDirectKey(memberIds) {
    return buildDirectKey(memberIds);
  }

  async getRecipientIds(roomId, senderId = null) {
    const room = await Room.findById(roomId).select("host_id").lean();
    const joinedMembers = await RoomMember.find({
      room_id: roomId,
      status: "joined",
      ...(senderId ? { user_id: { $ne: senderId } } : {}),
    }).distinct("user_id");

    const recipientIds = joinedMembers.map(toIdString);
    if (
      room?.host_id &&
      (!senderId || room.host_id.toString() !== senderId.toString())
    ) {
      recipientIds.push(room.host_id.toString());
    }

    return [...new Set(recipientIds)];
  }

  getScopeFromMessage(message) {
    return getScopeFromMessage(message);
  }

  async markMessagesDeliveredByFilter(query, userId) {
    return markMessagesDeliveredByFilter(query, userId);
  }

  async markMessagesReadByFilter(query, userId, messageIds = []) {
    const result = await markMessagesReadByFilter(query, userId, messageIds);
    if (!result.messages?.length) {
      return result;
    }

    return {
      success: true,
      messages: await this.mapMessagesWithReceipts(result.messages, userId),
    };
  }

  computeAggregateStatus(deliveryEntries = []) {
    return computeAggregateStatus(deliveryEntries);
  }
}

export default new BaseChatService();
