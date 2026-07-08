import { MESSAGE_STATUS, MESSAGE_TYPE } from "../../utils/constants.js";

const parseAttachment = (raw) => {
  if (
    raw.attachment &&
    typeof raw.attachment === "object" &&
    raw.attachment.url
  ) {
    return raw.attachment;
  }

  if (typeof raw.content === "string") {
    try {
      const parsed = JSON.parse(raw.content);
      if (parsed && typeof parsed === "object" && parsed.url) {
        return parsed;
      }
    } catch {
      // Content is not JSON.
    }
  }

  return null;
};

const normalizeFileContent = (raw, attachment) => {
  if (raw.type !== MESSAGE_TYPE.FILE) {
    return raw.content;
  }

  if (raw.content && typeof raw.content === "string" && raw.content.trim()) {
    try {
      const maybe = JSON.parse(raw.content);
      if (maybe && typeof maybe === "object" && !maybe.url) {
        return raw.content;
      }
    } catch {
      return raw.content;
    }
  }

  if (attachment) {
    return (
      attachment.filename ||
      attachment.name ||
      attachment.storedFilename ||
      attachment.url ||
      ""
    );
  }

  return raw.content || "";
};

export const mapMessage = (message, viewerId = null) => {
  let raw =
    typeof message?.toJSON === "function" ? message.toJSON() : message;
  
  if (message && message.receipts && !raw.receipts) {
    raw.receipts = message.receipts;
  }

  const attachment = parseAttachment(raw || {});

  const reactionSummary = raw?.reaction_summary || {};
  const reactionCounts = Object.entries(reactionSummary)
    .map(([emoji, count]) => ({ emoji, count }))
    .sort((a, b) => a.emoji.localeCompare(b.emoji));

  const receiptsRaw = raw?.receipts || [];
  const delivery = receiptsRaw.map((r) => ({
    userId: r.user_id?.toString?.() || r.user_id,
    status: r.status,
    deliveredAt: r.delivered_at ? (typeof r.delivered_at.toISOString === "function" ? r.delivered_at.toISOString() : r.delivered_at) : null,
    readAt: r.read_at ? (typeof r.read_at.toISOString === "function" ? r.read_at.toISOString() : r.read_at) : null,
  }));

  const ownReceipt = viewerId
    ? delivery.find((d) => d.userId === viewerId.toString()) || null
    : null;

  return {
    _id: raw?._id?.toString?.() || null,
    messageId: raw?._id?.toString?.(),
    conversationId: raw?.conversation_id?.toString?.() || null,
    room_id: raw?.room_id?.toString?.() || null,
    senderId: raw?.sender_id?.toString?.(),
    senderName: raw?.sender_name,
    senderAvatar: raw?.sender_avatar,
    type: raw?.type,
    clientId: raw?.client_id || null,
    client_id: raw?.client_id || null,
    version: raw?.version || 1,
    status: raw?.status || MESSAGE_STATUS.SENT,
    delivery,
    ownReceipt,
    content: normalizeFileContent(raw || {}, attachment),
    attachment,
    emoji: raw?.emoji || null,
    stickerId: raw?.sticker_id || null,
    timestamp: raw?.timestamp,
    editedAt: raw?.edited_at || null,
    editedBy: raw?.edited_by?.toString?.() || null,
    editCount: raw?.edit_count || 0,
    isEdited: Boolean(raw?.edited_at),
    deletedForEveryoneAt: raw?.deleted_for_everyone_at || null,
    deletedBy: raw?.deleted_by?.toString?.() || null,
    deleteReason: raw?.delete_reason || null,
    replyTo: raw?.reply_snapshot
      ? {
          messageId: raw.reply_snapshot.message_id?.toString?.() || null,
          senderId: raw.reply_snapshot.sender_id?.toString?.() || null,
          senderName: raw.reply_snapshot.sender_name || "Unknown",
          content: raw.reply_snapshot.content || "",
          type: raw.reply_snapshot.type || MESSAGE_TYPE.TEXT,
          timestamp: raw.reply_snapshot.timestamp || null,
          attachment: raw.reply_snapshot.attachment || null,
          emoji: raw.reply_snapshot.emoji || null,
        }
      : null,
    forwardedFrom: raw?.forwarded_from
      ? {
          messageId: raw.forwarded_from.message_id?.toString?.() || null,
          conversationId:
            raw.forwarded_from.conversation_id?.toString?.() || null,
          roomId: raw.forwarded_from.room_id?.toString?.() || null,
          senderId: raw.forwarded_from.sender_id?.toString?.() || null,
          senderName: raw.forwarded_from.sender_name || "Unknown",
          timestamp: raw.forwarded_from.timestamp || null,
        }
      : null,
    reactionCounts,
    systemEvent: raw?.system_event
      ? {
          ...raw.system_event,
          callId: raw.system_event.call_id?.toString?.() || null,
          callerId: raw.system_event.caller_id?.toString?.() || null,
          receiverIds: (raw.system_event.receiver_ids || []).map((id) =>
            id.toString(),
          ),
        }
      : null,
  };
};
