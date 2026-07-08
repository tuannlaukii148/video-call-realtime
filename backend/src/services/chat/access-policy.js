import mongoose from "mongoose";
import { Conversation, Room, RoomMember } from "../../models/index.js";
import { ERROR_MESSAGES, HTTP_STATUS } from "../../utils/constants.js";
import { CONVERSATION_ROLE, normalizeRoomCode } from "./chat-scope.js";

const throwHttp = (message, statusCode) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

export const getAccessibleRoom = async (roomIdOrCode, userId, options = {}) => {
  let room;
  if (mongoose.Types.ObjectId.isValid(roomIdOrCode)) {
    room = await Room.findById(roomIdOrCode);
  } else if (roomIdOrCode && typeof roomIdOrCode === 'string') {
    room = await Room.findOne({ room_code: roomIdOrCode });
  }

  if (!room) {
    throwHttp(ERROR_MESSAGES.ROOM_NOT_FOUND, HTTP_STATUS.NOT_FOUND);
  }

  if (options.requireChatEnabled && room.settings?.allow_chat === false) {
    throwHttp("Chat is disabled for this room", HTTP_STATUS.FORBIDDEN);
  }

  const isHost = room.host_id.toString() === userId.toString();
  const requireJoined = options.requireJoined !== false;
  const allowedStatuses = requireJoined
    ? ["joined"]
    : ["joined", "left", "pending"];
  const isMember = await RoomMember.exists({
    room_id: room._id,
    user_id: userId,
    status: { $in: allowedStatuses },
  });

  if (!isHost && !isMember) {
    throwHttp("Unauthorized to access room chat", HTTP_STATUS.FORBIDDEN);
  }

  return room;
};

export const getAccessibleConversation = async (conversationId, userId) => {
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    throwHttp("Invalid conversation ID", HTTP_STATUS.BAD_REQUEST);
  }

  const conversation = await Conversation.findOne({
    _id: conversationId,
    member_ids: userId,
    deleted_at: null,
  });

  if (!conversation) {
    throwHttp("Conversation not found", HTTP_STATUS.NOT_FOUND);
  }

  return conversation;
};

export const getConversationMemberRoles = (conversation) => {
  if (conversation.member_roles?.length) {
    return conversation.member_roles.map((member) => ({
      user_id: member.user_id,
      role: member.role || CONVERSATION_ROLE.MEMBER,
      nickname: member.nickname || null,
    }));
  }

  return (conversation.member_ids || []).map((memberId) => ({
    user_id: memberId,
    role:
      conversation.owner_id &&
      conversation.owner_id.toString() === memberId.toString()
        ? CONVERSATION_ROLE.OWNER
        : CONVERSATION_ROLE.MEMBER,
    nickname: null,
  }));
};

export const getConversationRole = (conversation, userId) => {
  if (conversation.type !== "group") {
    return CONVERSATION_ROLE.MEMBER;
  }

  const entry = getConversationMemberRoles(conversation).find(
    (member) => member.user_id.toString() === userId.toString(),
  );
  return entry?.role || CONVERSATION_ROLE.MEMBER;
};

export const assertConversationOwner = (conversation, userId) => {
  if (
    conversation.type !== "group" ||
    getConversationRole(conversation, userId) !== CONVERSATION_ROLE.OWNER
  ) {
    throwHttp(
      "Only the group owner can perform this action",
      HTTP_STATUS.FORBIDDEN,
    );
  }
};
