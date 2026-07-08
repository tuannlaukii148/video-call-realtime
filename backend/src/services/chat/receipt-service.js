import mongoose from "mongoose";
import {
  Message,
  MessageReceipt,
  ThreadUserState,
} from "../../models/index.js";
import { MESSAGE_STATUS } from "../../utils/constants.js";
import { getScopeFromMessage, toIdString, toObjectId } from "./chat-scope.js";

export const computeAggregateStatus = (receipts = []) => {
  if (receipts.length === 0) {
    return MESSAGE_STATUS.READ;
  }
  if (receipts.every((entry) => entry.status === MESSAGE_STATUS.READ)) {
    return MESSAGE_STATUS.READ;
  }
  if (
    receipts.every(
      (entry) =>
        entry.status === MESSAGE_STATUS.READ ||
        entry.status === MESSAGE_STATUS.DELIVERED,
    )
  ) {
    return MESSAGE_STATUS.DELIVERED;
  }
  return MESSAGE_STATUS.SENT;
};

const normalizeReceipt = (receipt) => ({
  user_id: receipt.user_id,
  status: receipt.status,
  delivered_at: receipt.delivered_at || null,
  read_at: receipt.read_at || null,
});

// Lấy trạng thái các message
export const getReceiptMap = async (messageIds) => {
  const ids = [...new Set(messageIds.map(toIdString).filter(Boolean))];
  if (ids.length === 0) {
    return new Map();
  }

  const receipts = await MessageReceipt.find({
    message_id: { $in: ids.map(toObjectId) },
  })
    .sort({ user_id: 1 })
    .lean();
  const map = new Map();
  for (const receipt of receipts) {
    const key = receipt.message_id.toString();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(normalizeReceipt(receipt));
  }
  return map;
};

// Update trạng thái toàn cục của các message
const updateMessageAggregateStatuses = async (messageIds) => {
  const ids = [...new Set(messageIds.map(toIdString).filter(Boolean))];
  if (ids.length === 0) {
    return;
  }

  const receiptMap = await getReceiptMap(ids);
  const bulkOps = ids.map((id) => ({
    updateOne: {
      filter: { _id: toObjectId(id) },
      update: {
        $set: { status: computeAggregateStatus(receiptMap.get(id) || []) },
      },
    },
  }));

  if (bulkOps.length > 0) {
    await Message.bulkWrite(bulkOps);
  }
};

// Tạo receiptmessage cho user trong group khi có user gửi tin nhắn
export const seedMessageReceipts = async (
  message,
  scopeType,
  scopeId,
  recipientIds = [],
) => {
  const uniqueRecipientIds = [
    ...new Set(recipientIds.map(toIdString).filter(Boolean)),
  ];
  if (uniqueRecipientIds.length === 0) {
    await Message.updateOne(
      { _id: message._id },
      { $set: { status: MESSAGE_STATUS.READ } },
    );
    message.status = MESSAGE_STATUS.READ;
    return [];
  }

  const sentAt = message.timestamp || new Date();
  const operations = uniqueRecipientIds.map((recipientId) => ({
    updateOne: {
      filter: { message_id: message._id, user_id: toObjectId(recipientId) },
      update: {
        $setOnInsert: {
          message_id: message._id,
          scope_type: scopeType,
          scope_id: toIdString(scopeId),
          user_id: toObjectId(recipientId),
          status: MESSAGE_STATUS.SENT,
          sent_at: sentAt,
        },
      },
      upsert: true,
    },
  }));

  // update trạng thái sent
  await MessageReceipt.bulkWrite(operations, { ordered: false });
  await updateMessageAggregateStatuses([message._id]);
  return MessageReceipt.find({ message_id: message._id }).lean();
};

// Update trạng thái cuối cùng của user trong thread
export const upsertThreadUserState = async (
  scopeType,
  scopeId,
  userId,
  payload,
) => {
  await ThreadUserState.findOneAndUpdate(
    { scope_type: scopeType, scope_id: toIdString(scopeId), user_id: userId },
    {
      $set: {
        ...payload,
        updated_at: new Date(),
      },
      $setOnInsert: {
        scope_type: scopeType,
        scope_id: toIdString(scopeId),
        user_id: userId,
      },
    },
    { upsert: true },
  );
};

// Lọc các message cần update từ message
const getEligibleMessageIds = async (messageQuery, messageIds = []) => {
  const query = { ...messageQuery };
  if (messageIds.length > 0) {
    query._id = {
      $in: messageIds
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  return Message.find(query)
    .select("_id timestamp conversation_id room_id")
    .sort({ timestamp: 1 })
    .lean();
};

// mark khi user nhận tin khi user online
export const markMessagesDeliveredByFilter = async (messageQuery, userId) => {
  const now = new Date();
  const messages = await getEligibleMessageIds(messageQuery);
  const ids = messages.map((message) => message._id);
  if (ids.length === 0) {
    return { success: true, updatedMessageIds: [] };
  }

  const receipts = await MessageReceipt.find({
    message_id: { $in: ids },
    user_id: userId,
    status: MESSAGE_STATUS.SENT,
  })
    .select("message_id")
    .lean();
  const updatedIds = receipts.map((receipt) => receipt.message_id);
  if (updatedIds.length === 0) {
    return { success: true, updatedMessageIds: [] };
  }

  await MessageReceipt.updateMany(
    {
      message_id: { $in: updatedIds },
      user_id: userId,
      status: MESSAGE_STATUS.SENT,
    },
    { $set: { status: MESSAGE_STATUS.DELIVERED, delivered_at: now } },
  );
  await updateMessageAggregateStatuses(updatedIds);

  const lastMessage = messages
    .filter((message) =>
      updatedIds.some((id) => id.toString() === message._id.toString()),
    )
    .at(-1);

  // lấy trạng tháu cuối cùng update vào thread của user đó
  if (lastMessage) {
    const scope = getScopeFromMessage(lastMessage);
    await upsertThreadUserState(scope.scopeType, scope.scopeId, userId, {
      last_delivered_message_id: lastMessage._id,
      last_delivered_at: now,
    });
  }

  return {
    success: true,
    updatedMessageIds: updatedIds.map(toIdString),
  };
};

// Mark read
export const markMessagesReadByFilter = async (
  messageQuery,
  userId,
  messageIds = [],
) => {
  const now = new Date();
  const messages = await getEligibleMessageIds(messageQuery, messageIds);
  const ids = messages.map((message) => message._id);
  if (ids.length === 0) {
    return { success: true, messages: [] };
  }

  const receipts = await MessageReceipt.find({
    message_id: { $in: ids },
    user_id: userId,
    status: { $ne: MESSAGE_STATUS.READ },
  })
    .select("message_id")
    .lean();
  const updatedIds = receipts.map((receipt) => receipt.message_id);
  if (updatedIds.length === 0) {
    return { success: true, messages: [] };
  }

  await MessageReceipt.updateMany(
    {
      message_id: { $in: updatedIds },
      user_id: userId,
      status: { $ne: MESSAGE_STATUS.READ },
    },
    { $set: { status: MESSAGE_STATUS.READ, delivered_at: now, read_at: now } },
  );
  await updateMessageAggregateStatuses(updatedIds);

  const lastMessage = messages
    .filter((message) =>
      updatedIds.some((id) => id.toString() === message._id.toString()),
    )
    .at(-1);
  if (lastMessage) {
    const scope = getScopeFromMessage(lastMessage);
    await upsertThreadUserState(scope.scopeType, scope.scopeId, userId, {
      last_delivered_message_id: lastMessage._id,
      last_delivered_at: now,
      last_read_message_id: lastMessage._id,
      last_read_at: now,
    });
  }

  const updatedMessages = await Message.find({ _id: { $in: updatedIds } })
    .sort({ timestamp: 1 })
    .lean();
  return { success: true, messages: updatedMessages };
};

export const countUnread = async (messageQuery, userId) => {
  const messages = await Message.find(messageQuery).select("_id").lean();
  if (messages.length === 0) {
    return 0;
  }

  return MessageReceipt.countDocuments({
    message_id: { $in: messages.map((message) => message._id) },
    user_id: userId,
    status: { $ne: MESSAGE_STATUS.READ },
  });
};

export const attachReceipts = async (messages) => {
  if (!messages) {
    return messages;
  }

  const isArray = Array.isArray(messages);
  const msgList = isArray ? messages : [messages];
  const messageIds = msgList
    .map((msg) => {
      if (!msg) return null;
      return msg._id ? msg._id.toString() : msg.toString();
    })
    .filter(Boolean);

  if (messageIds.length === 0) {
    return messages;
  }

  const receiptMap = await getReceiptMap(messageIds);

  for (const msg of msgList) {
    if (!msg) continue;
    const key = msg._id ? msg._id.toString() : msg.toString();
    const receipts = receiptMap.get(key) || [];
    msg.receipts = receipts;
  }

  return messages;
};

