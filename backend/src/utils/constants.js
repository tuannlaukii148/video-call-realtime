export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE: 422,
  INTERNAL_ERROR: 500,
};

export const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid email or password',
  USER_EXISTS: 'User already exists',
  USER_NOT_FOUND: 'User not found',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',
  UNAUTHORIZED: 'Unauthorized access',
  ROOM_NOT_FOUND: 'Room not found',
  ROOM_ENDED: 'This room has ended',
  INVALID_ROOM_CODE: 'Invalid room code',
  NOT_HOST: 'Only room host can perform this action',
  NEW_HOST_REQUIRED: 'New host ID is required',
  HOST_TRANSFER_SELF: 'Cannot transfer host role to yourself',
  NEW_HOST_NOT_IN_ROOM: 'New host must be an active participant in the room',
  MAX_PARTICIPANTS: 'Maximum participants reached',
  SERVER_ERROR: 'Internal server error',
};

export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',

  // Room events
  ROOM_JOIN: 'room:join',
  ROOM_PENDING: 'room:pending',
  ROOM_REQUEST_APPROVAL: 'room:request_approval',
  ROOM_APPROVE_USER: 'room:approve_user',
  ROOM_REJECT_USER: 'room:reject_user',
  ROOM_USER_REJECTED: 'room:user_rejected',
  ROOM_USER_JOINED: 'room:user_joined',
  ROOM_USER_LEFT: 'room:user_left',
  ROOM_FILTER_CHANGE: 'room:filter_change',
  ROOM_USER_KICKED: 'room:user_kicked',
  ROOM_HOST_TRANSFERRED: 'room:host_transferred',
  ROOM_ENDED: 'room:ended',
  ROOM_INVITE: 'room:invite',
  ROOM_DECLINE_INVITE: 'room:decline_invite',
  ROOM_INVITE_DECLINED: 'room:invite_declined',


  // Chat events
  CHAT_SUBSCRIBE: 'chat:subscribe',
  CHAT_UNSUBSCRIBE: 'chat:unsubscribe',
  CHAT_SEND: 'chat:send',
  CHAT_RECEIVE: 'chat:receive',
  CHAT_CONVERSATION_UPDATED: 'chat:conversation_updated',
  CHAT_HISTORY: 'chat:history',
  CHAT_DELIVERED: 'chat:delivered',
  CHAT_READ: 'chat:read',
  CHAT_RECEIPT: 'chat:receipt',
  CHAT_RECEIPT_UPDATED: 'chat:receipt_updated',
  CHAT_TYPING: 'chat:typing',
  CHAT_TYPING_STOP: 'chat:typing_stop',
  CHAT_DELETED: 'chat:deleted',
  CHAT_EDIT: 'chat:edit',
  CHAT_DELETE: 'chat:delete',
  CHAT_FORWARD: 'chat:forward',
  CHAT_MESSAGE_UPDATED: 'chat:message_updated',
  CHAT_MESSAGE_DELETED: 'chat:message_deleted',
  CHAT_MESSAGE_HIDDEN: 'chat:message_hidden',
  CHAT_REACTION_ADD: 'chat:reaction:add',
  CHAT_REACTION_REMOVE: 'chat:reaction:remove',
  CHAT_REACTION_UPDATED: 'chat:reaction_updated',

  // Presence events
  PRESENCE_SUBSCRIBE: 'presence:subscribe',
  PRESENCE_UNSUBSCRIBE: 'presence:unsubscribe',
  PRESENCE_SNAPSHOT: 'presence:snapshot',
  PRESENCE_ONLINE: 'presence:online',
  PRESENCE_OFFLINE: 'presence:offline',

  // Media events
  MEDIA_TOGGLE: 'media:toggle',
  MEDIA_SCREEN_SHARE_START: 'media:screen_share_start',
  MEDIA_SCREEN_SHARE_STOP: 'media:screen_share_stop',

  // Recording events
  RECORDING_START: 'recording:start',
  RECORDING_STOP: 'recording:stop',
  RECORDING_STATUS: 'recording:status',
};

export const ROOM_STATUS = {
  WAITING: 'waiting',
  ACTIVE: 'active',
  ENDED: 'ended',
};

export const USER_STATUS = {
  PENDING: 'pending',
  JOINED: 'joined',
  REJECTED: 'rejected',
  KICKED: 'kicked',
  LEFT: 'left',
};

export const MESSAGE_TYPE = {
  TEXT: 'text',
  SYSTEM: 'system',
  FILE: 'file',
  STICKER: 'sticker',
  EMOJI: 'emoji',
};

export const MESSAGE_REACTION = {
  LIKE: 'like',
  LOVE: 'love',
  HAHA: 'haha',
  WOW: 'wow',
  SAD: 'sad',
  ANGRY: 'angry',
};

export const MESSAGE_STATUS = {
  SENT: 'sent',
  DELIVERED: 'delivered',
  READ: 'read',
};

export const EVENT_TYPE = {
  ROOM_CREATED: 'room_created',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  USER_KICKED: 'user_kicked',
  ROOM_ENDED: 'room_ended',
  USER_APPROVED: 'user_approved',
  USER_REJECTED: 'user_rejected',
  HOST_TRANSFERRED: 'host_transferred',
  RECORDING_CREATED: 'recording_created',
  RECORDING_DELETED: 'recording_deleted',
};

export default {
  HTTP_STATUS,
  ERROR_MESSAGES,
  SOCKET_EVENTS,
  ROOM_STATUS,
  USER_STATUS,
  MESSAGE_TYPE,
  MESSAGE_STATUS,
  EVENT_TYPE,
};
