import { BaseChatService } from './base-chat.service.js';
import { Conversation, Message, User } from '../models/index.js';
import { MESSAGE_TYPE, MESSAGE_STATUS, ERROR_MESSAGES, HTTP_STATUS } from '../utils/constants.js';
import logger from '../utils/logger.js';
import { countUnread } from './chat/receipt-service.js';
import { CONVERSATION_ROLE } from './chat/chat-scope.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeTitle = (title) => title?.trim() || null;

export class ConversationChatService extends BaseChatService {
  async getConversations(userId) {
    try {
      const conversations = await Conversation.find({
        member_ids: userId,
        deleted_at: null,
      })
        .sort({ updated_at: -1 })
        .populate('member_ids', '_id full_name avatar email')
        .lean();

      return {
        success: true,
        conversations: await Promise.all(
          conversations.map((conversation) => this.mapConversation(conversation, userId))
        ),
      };
    } catch (error) {
      logger.error('Get conversations error:', error);
      throw error;
    }
  }

  async searchUsersByEmail(email, requesterId) {
    try {
      const normalizedEmail = email.trim().toLowerCase();
      const users = await User.find({
        _id: { $ne: requesterId },
        email: { $regex: `^${escapeRegex(normalizedEmail)}` },
      })
        .select('_id full_name email avatar')
        .limit(10)
        .lean();

      return {
        success: true,
        users: users.map((user) => ({
          userId: user._id.toString(),
          fullName: user.full_name,
          email: user.email,
          avatar: user.avatar || null,
        })),
      };
    } catch (error) {
      logger.error('Search users by email error:', error);
      throw error;
    }
  }

  async createOrGetDirectConversation(currentUserId, payload) {
    try {
      const targetUser = await this.resolveTargetUser(payload, currentUserId);

      if (!targetUser) {
        const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      if (targetUser._id.toString() === currentUserId.toString()) {
        const error = new Error('Cannot create a conversation with yourself');
        error.statusCode = HTTP_STATUS.UNPROCESSABLE;
        throw error;
      }

      const memberIds = [currentUserId.toString(), targetUser._id.toString()].sort();
      const directKey = this.buildDirectKey(memberIds);
      let conversation = await Conversation.findOne({
        $or: [
          { type: 'direct', direct_key: directKey },
          { type: 'direct', member_ids: { $all: memberIds, $size: 2 } },
        ],
      })
        .populate('member_ids', '_id full_name avatar email')
        .lean();

      if (!conversation) {
        let created;
        try {
          created = await Conversation.findOneAndUpdate(
            { type: 'direct', direct_key: directKey },
            {
              $setOnInsert: {
                type: 'direct',
                direct_key: directKey,
                member_ids: memberIds,
                member_roles: memberIds.map((memberId) => ({
                  user_id: memberId,
                  role: CONVERSATION_ROLE.MEMBER,
                  nickname: null,
                })),
                created_by: currentUserId,
                updated_at: new Date(),
              },
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          );
        } catch (error) {
          if (error.code !== 11000) {
            throw error;
          }
          created = await Conversation.findOne({ type: 'direct', direct_key: directKey });
        }
        conversation = await Conversation.findById(created._id)
          .populate('member_ids', '_id full_name avatar email')
          .lean();
      } else if (!conversation.direct_key) {
        await Conversation.updateOne({ _id: conversation._id, direct_key: null }, { direct_key: directKey });
      }

      return {
        success: true,
        conversation: await this.mapConversation(conversation, currentUserId),
      };
    } catch (error) {
      logger.error('Create or get direct conversation error:', error);
      throw error;
    }
  }

  async sendConversationMessage(conversationId, user, data) {
    try {
      const conversation = await this.getAccessibleConversation(conversationId, user._id);
      const content = data.content?.trim();
      const recipientIds = conversation.member_ids
        .map((memberId) => memberId.toString())
        .filter((memberId) => memberId !== user._id.toString());
      const replyMessage = data.replyToMessageId
        ? await this.getMessageByIdForUser(data.replyToMessageId, user._id, { conversationId: conversation._id })
        : null;

      const message = new Message({
        conversation_id: conversation._id,
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
      await this.seedMessageReceipts(message, 'conversation', conversation._id, recipientIds);
      await Conversation.updateOne(
        { _id: conversation._id },
        {
          last_message_id: message._id,
          updated_at: new Date(),
        }
      );

      return {
        success: true,
        message: await this.mapMessageWithReceipts(message, user._id),
      };
    } catch (error) {
      logger.error('Send conversation message error:', error);
      throw error;
    }
  }

  async addConversationMember(conversationId, currentUserId, payload) {
    try {
      const actor = await User.findById(currentUserId).select('_id full_name avatar email').lean();
      if (!actor) {
        const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      const conversation = await this.getAccessibleConversation(conversationId, currentUserId);
      const targetUsers = await this.resolveTargetUsers(payload, currentUserId);
      if (targetUsers.length === 0) {
        const error = new Error(ERROR_MESSAGES.USER_NOT_FOUND);
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      const existingMemberIds = new Set(conversation.member_ids.map((memberId) => memberId.toString()));
      const duplicateUser = targetUsers.find((user) => existingMemberIds.has(user._id.toString()));
      if (duplicateUser) {
        const error = new Error('User is already in this conversation');
        error.statusCode = HTTP_STATUS.CONFLICT;
        throw error;
      }

      if (conversation.type === 'direct') {
        const title = normalizeTitle(payload.title);
        if (!title || title.length < 3 || title.length > 100) {
          const error = new Error('Group title must be between 3 and 100 characters');
          error.statusCode = HTTP_STATUS.BAD_REQUEST;
          throw error;
        }

        const nextMemberIds = [...new Set([
          ...conversation.member_ids.map((memberId) => memberId.toString()),
          ...targetUsers.map((user) => user._id.toString()),
        ])];

        const created = await Conversation.create({
          type: 'group',
          title,
          owner_id: currentUserId,
          member_ids: nextMemberIds,
          member_roles: nextMemberIds.map((memberId) => ({
            user_id: memberId,
            role: memberId === currentUserId.toString() ? CONVERSATION_ROLE.OWNER : CONVERSATION_ROLE.MEMBER,
            nickname: null,
          })),
          created_by: currentUserId,
          updated_at: new Date(),
        });

        const groupConversation = await Conversation.findById(created._id)
          .populate('member_ids', '_id full_name avatar email');

        const otherNames = groupConversation.member_ids
          .filter((member) => member._id.toString() !== currentUserId.toString())
          .map((member) => member.full_name)
          .join(', ');

        const systemMessage = await this.createSystemMessage(
          { conversationId: created._id.toString(), userId: currentUserId },
          `${actor.full_name} created group "${title}" with ${otherNames}`
        );

        return {
          success: true,
          conversation: await this.mapConversation(groupConversation, currentUserId),
          systemMessage,
        };
      }

      this.assertConversationOwner(conversation, currentUserId);

      const nextMemberIds = [
        ...conversation.member_ids.map((memberId) => memberId.toString()),
        ...targetUsers.map((user) => user._id.toString()),
      ];
      const nextMemberRoles = [
        ...this.getConversationMemberRoles(conversation),
        ...targetUsers.map((user) => ({
          user_id: user._id,
          role: CONVERSATION_ROLE.MEMBER,
          nickname: null,
        })),
      ];

      await Conversation.updateOne(
        { _id: conversation._id },
        {
          member_ids: nextMemberIds,
          member_roles: nextMemberRoles,
          updated_at: new Date(),
        }
      );

      const updatedConversation = await Conversation.findById(conversation._id)
        .populate('member_ids', '_id full_name avatar email');

      const systemMessage = await this.createSystemMessage(
        { conversationId: conversation._id.toString(), userId: currentUserId },
        `${actor.full_name} added ${targetUsers.map((user) => user.full_name).join(', ')}`
      );

      return {
        success: true,
        conversation: await this.mapConversation(updatedConversation, currentUserId),
        systemMessage,
      };
    } catch (error) {
      logger.error('Add conversation member error:', error);
      throw error;
    }
  }

  async updateConversation(conversationId, currentUserId, payload) {
    try {
      const conversation = await this.getAccessibleConversation(conversationId, currentUserId);
      this.assertConversationOwner(conversation, currentUserId);

      const title = normalizeTitle(payload.title);
      if (!title || title.length < 3 || title.length > 100) {
        const error = new Error('Group title must be between 3 and 100 characters');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      const actor = await User.findById(currentUserId).select('full_name').lean();

      await Conversation.updateOne(
        { _id: conversation._id },
        { title, updated_at: new Date() }
      );

      const updatedConversation = await Conversation.findById(conversation._id)
        .populate('member_ids', '_id full_name avatar email');

      const systemMessage = await this.createSystemMessage(
        { conversationId: conversation._id.toString(), userId: currentUserId },
        `${actor?.full_name || 'Someone'} renamed the group to "${title}"`
      );

      return {
        success: true,
        conversation: await this.mapConversation(updatedConversation, currentUserId),
        systemMessage,
      };
    } catch (error) {
      logger.error('Update conversation error:', error);
      throw error;
    }
  }

  async updateConversationMember(conversationId, currentUserId, targetUserId, payload) {
    try {
      const conversation = await this.getAccessibleConversation(conversationId, currentUserId);
      this.assertConversationOwner(conversation, currentUserId);

      const memberRoles = this.getConversationMemberRoles(conversation);
      const targetMember = memberRoles.find((member) => member.user_id.toString() === targetUserId.toString());
      if (!targetMember) {
        const error = new Error('Conversation member not found');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      const nickname = normalizeTitle(payload.nickname);
      const nextMemberRoles = memberRoles.map((member) =>
        member.user_id.toString() === targetUserId.toString()
          ? { ...member, nickname }
          : member
      );

      await Conversation.updateOne(
        { _id: conversation._id },
        { member_roles: nextMemberRoles, updated_at: new Date() }
      );

      const actor = await User.findById(currentUserId).select('full_name').lean();
      const target = await User.findById(targetUserId).select('full_name').lean();
      const updatedConversation = await Conversation.findById(conversation._id)
        .populate('member_ids', '_id full_name avatar email');

      const systemMessage = await this.createSystemMessage(
        { conversationId: conversation._id.toString(), userId: currentUserId },
        `${actor?.full_name || 'Someone'} changed ${target?.full_name || 'a member'}'s nickname`
      );

      return {
        success: true,
        conversation: await this.mapConversation(updatedConversation, currentUserId),
        systemMessage,
      };
    } catch (error) {
      logger.error('Update conversation member error:', error);
      throw error;
    }
  }

  async removeConversationMember(conversationId, currentUserId, targetUserId) {
    try {
      const conversation = await this.getAccessibleConversation(conversationId, currentUserId);
      this.assertConversationOwner(conversation, currentUserId);

      if (targetUserId.toString() === currentUserId.toString()) {
        const error = new Error('Owner cannot remove themself from the group');
        error.statusCode = HTTP_STATUS.BAD_REQUEST;
        throw error;
      }

      const nextMemberIds = conversation.member_ids
        .map((memberId) => memberId.toString())
        .filter((memberId) => memberId !== targetUserId.toString());
      if (nextMemberIds.length === conversation.member_ids.length) {
        const error = new Error('Conversation member not found');
        error.statusCode = HTTP_STATUS.NOT_FOUND;
        throw error;
      }

      const nextMemberRoles = this.getConversationMemberRoles(conversation)
        .filter((member) => member.user_id.toString() !== targetUserId.toString());

      await Conversation.updateOne(
        { _id: conversation._id },
        {
          member_ids: nextMemberIds,
          member_roles: nextMemberRoles,
          updated_at: new Date(),
        }
      );

      const actor = await User.findById(currentUserId).select('full_name').lean();
      const target = await User.findById(targetUserId).select('full_name').lean();
      const updatedConversation = await Conversation.findById(conversation._id)
        .populate('member_ids', '_id full_name avatar email');

      const systemMessage = await this.createSystemMessage(
        { conversationId: conversation._id.toString(), userId: currentUserId },
        `${actor?.full_name || 'Someone'} removed ${target?.full_name || 'a member'}`
      );

      return {
        success: true,
        conversation: await this.mapConversation(updatedConversation, currentUserId),
        systemMessage,
      };
    } catch (error) {
      logger.error('Remove conversation member error:', error);
      throw error;
    }
  }

  async deleteConversation(conversationId, currentUserId) {
    try {
      const conversation = await this.getAccessibleConversation(conversationId, currentUserId);
      this.assertConversationOwner(conversation, currentUserId);

      await Conversation.updateOne(
        { _id: conversation._id },
        { deleted_at: new Date(), updated_at: new Date() }
      );

      return {
        success: true,
        conversationId: conversation._id.toString(),
      };
    } catch (error) {
      logger.error('Delete conversation error:', error);
      throw error;
    }
  }

  async getConversationMessages(conversationId, userId, pagination = {}) {
    try {
      const { page = 1, limit = 50 } = pagination;
      const skip = (page - 1) * limit;
      const conversation = await this.getAccessibleConversation(conversationId, userId);

      const messages = await Message.find({ conversation_id: conversation._id })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
      const visibleMessages = await this.excludeHiddenMessages(messages, userId);
      const total = await Message.countDocuments({ conversation_id: conversation._id });

      return {
        success: true,
        conversation: await this.mapConversation(conversation, userId),
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
      logger.error('Get conversation messages error:', error);
      throw error;
    }
  }

  async markConversationMessagesDelivered(conversationId, userId) {
    try {
      const conversation = await this.getAccessibleConversation(conversationId, userId);
      return this.markMessagesDeliveredByFilter(
        {
          conversation_id: conversation._id,
          sender_id: { $ne: userId },
        },
        userId
      );
    } catch (error) {
      logger.error('Mark conversation messages delivered error:', error);
      throw error;
    }
  }

  async markConversationMessagesRead(conversationId, userId, messageIds = []) {
    try {
      const conversation = await this.getAccessibleConversation(conversationId, userId);
      return this.markMessagesReadByFilter(
        {
          conversation_id: conversation._id,
          sender_id: { $ne: userId },
        },
        userId,
        messageIds
      );
    } catch (error) {
      logger.error('Mark conversation messages read error:', error);
      throw error;
    }
  }

  async countUnreadMessages(roomId, userId) {
    return countUnread(
      {
        room_id: roomId,
        sender_id: { $ne: userId },
      },
      userId
    );
  }

  async countUnreadConversationMessages(conversationId, userId) {
    return countUnread(
      {
        conversation_id: conversationId,
        sender_id: { $ne: userId },
      },
      userId
    );
  }

  async mapConversation(conversation, viewerId) {
    const raw = typeof conversation.toJSON === 'function' ? conversation.toJSON() : conversation;
    const memberRoles = this.getConversationMemberRoles(raw);
    const roleByUserId = new Map(
      memberRoles.map((member) => [member.user_id.toString(), member])
    );
    const members = (raw.member_ids || []).map((member) => ({
      id: member._id?.toString?.() || member.toString(),
      fullName: member.full_name,
      avatar: member.avatar || null,
      email: member.email || '',
      role: roleByUserId.get(member._id?.toString?.() || member.toString())?.role || CONVERSATION_ROLE.MEMBER,
      nickname: roleByUserId.get(member._id?.toString?.() || member.toString())?.nickname || null,
    }));
    const participants = members.filter((member) => member.id !== viewerId.toString());
    const latestCandidates = raw.last_message_id
      ? [await Message.findById(raw.last_message_id).lean()]
      : await Message.find({ conversation_id: raw._id }).sort({ timestamp: -1 }).limit(20).lean();
    const latestVisible = (await this.excludeHiddenMessages(latestCandidates.filter(Boolean), viewerId))[0] || null;
    const latestMessage = latestVisible ? this.mapMessage(latestVisible, viewerId) : null;
    const displayParticipants = participants.map((member) => member.nickname || member.fullName);
    const ownerId = raw.owner_id?.toString?.() || null;
    const currentUserRole = this.getConversationRole(raw, viewerId);

    return {
      conversationId: raw._id.toString(),
      type: raw.type || 'direct',
      ownerId,
      currentUserRole,
      title:
        raw.type === 'group'
          ? raw.title || displayParticipants.join(', ') || 'Group conversation'
          : displayParticipants[0] || raw.title || 'Direct message',
      description: participants[0]?.email || '',
      latestMessage,
      participants,
      participantCount: members.length,
      host:
        members.find((member) => member.id === ownerId) ||
        participants[0] ||
        members[0] ||
        null,
      unreadCount: await this.countUnreadConversationMessages(raw._id, viewerId),
    };
  }
}

export default new ConversationChatService();
