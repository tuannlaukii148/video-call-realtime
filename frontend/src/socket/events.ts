export const ROOM_EVENTS = {
  JOIN: 'room:join',
  PENDING: 'room:pending',
  REQUEST_APPROVE: 'room:request_approve',
  REQUEST_APPROVAL: 'room:request_approval',
  APPROVE_USER: 'room:approve_user',
  REJECT_USER: 'room:reject_user',
  USER_JOINED: 'room:user_joined',
  USER_LEFT: 'room:user_left',
  USER_REJECTED: 'room:user_rejected',
  KICK_USER: 'room:kick_user',
  USER_KICKED: 'room:user_kicked',
  HOST_TRANSFERRED: 'room:host_transferred',
  FORCE_DISCONNECT: 'room:force_disconnect',
  ENDED: 'room:ended',
  FILTER_CHANGE: 'room:filter_change',
  ERROR: 'error',
  INVITE: 'room:invite',
  DECLINE_INVITE: 'room:decline_invite',
  INVITE_DECLINED: 'room:invite_declined',
} as const;

// WebRTC events removed — signaling now handled by LiveKit Cloud SFU

export const CHAT_EVENTS = {
  SUBSCRIBE: "chat:subscribe",
  UNSUBSCRIBE: "chat:unsubscribe",
  SEND: "chat:send",
  RECEIVE: "chat:receive",
  CONVERSATION_UPDATED: "chat:conversation_updated",
  SYSTEM_ALERT: "chat:system_alert",
  HISTORY: "chat:history",
  DELIVERED: "chat:delivered",
  READ: "chat:read",
  RECEIPT: "chat:receipt",
  RECEIPT_UPDATED: "chat:receipt_updated",
  TYPING: "chat:typing",
  TYPING_STOP: "chat:typing_stop",
  DELETED: "chat:deleted",
  EDIT: "chat:edit",
  DELETE: "chat:delete",
  FORWARD: "chat:forward",
  MESSAGE_UPDATED: "chat:message_updated",
  MESSAGE_DELETED: "chat:message_deleted",
  MESSAGE_HIDDEN: "chat:message_hidden",
  REACTION_ADD: "chat:reaction:add",
  REACTION_REMOVE: "chat:reaction:remove",
  REACTION_UPDATED: "chat:reaction_updated",
} as const;

export const PRESENCE_EVENTS = {
  SUBSCRIBE: "presence:subscribe",
  UNSUBSCRIBE: "presence:unsubscribe",
  SNAPSHOT: "presence:snapshot",
  ONLINE: "presence:online",
  OFFLINE: "presence:offline",
} as const;

export const WEBRTC_EVENTS = {
  OFFER: "webrtc:offer",
  ANSWER: "webrtc:answer",
  ICE_CANDIDATE: "webrtc:ice_candidate",
} as const;

export const MEDIA_EVENTS = {
  TOGGLE: "media:toggle",
  SCREEN_SHARE_START: "media:screen_share_start",
  SCREEN_SHARE_STOP: "media:screen_share_stop",
} as const;

export const RECORDING_EVENTS = {
  START: "recording:start",
  STOP: "recording:stop",
  STATUS: "recording:status",
} as const;
