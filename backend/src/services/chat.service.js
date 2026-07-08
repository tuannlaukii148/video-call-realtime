import { BaseChatService } from './base-chat.service.js';
import roomChatService from './room-chat.service.js';
import conversationChatService from './conversation-chat.service.js';

// ---------------------------------------------------------------------------
// ChatService — Unified facade over BaseChatService + domain-specific services
// ---------------------------------------------------------------------------
// Extends BaseChatService directly (inherits all shared methods) and delegates
// room / conversation specific methods to their respective services.
// ---------------------------------------------------------------------------

class ChatService extends BaseChatService {
  // Room Specific Methods
  sendRoomMessage(...args) { return roomChatService.sendRoomMessage(...args); }
  getRoomMessages(...args) { return roomChatService.getRoomMessages(...args); }
  markRoomMessagesDelivered(...args) { return roomChatService.markRoomMessagesDelivered(...args); }
  markRoomMessagesRead(...args) { return roomChatService.markRoomMessagesRead(...args); }
  deleteRoomMessage(...args) { return roomChatService.deleteRoomMessage(...args); }
  clearRoomMessages(...args) { return roomChatService.clearRoomMessages(...args); }

  // Conversation Specific Methods
  getConversations(...args) { return conversationChatService.getConversations(...args); }
  searchUsersByEmail(...args) { return conversationChatService.searchUsersByEmail(...args); }
  createOrGetDirectConversation(...args) { return conversationChatService.createOrGetDirectConversation(...args); }
  sendConversationMessage(...args) { return conversationChatService.sendConversationMessage(...args); }
  addConversationMember(...args) { return conversationChatService.addConversationMember(...args); }
  updateConversation(...args) { return conversationChatService.updateConversation(...args); }
  updateConversationMember(...args) { return conversationChatService.updateConversationMember(...args); }
  removeConversationMember(...args) { return conversationChatService.removeConversationMember(...args); }
  deleteConversation(...args) { return conversationChatService.deleteConversation(...args); }
  getConversationMessages(...args) { return conversationChatService.getConversationMessages(...args); }
  markConversationMessagesDelivered(...args) { return conversationChatService.markConversationMessagesDelivered(...args); }
  markConversationMessagesRead(...args) { return conversationChatService.markConversationMessagesRead(...args); }
  countUnreadMessages(...args) { return conversationChatService.countUnreadMessages(...args); }
  countUnreadConversationMessages(...args) { return conversationChatService.countUnreadConversationMessages(...args); }
  mapConversation(...args) { return conversationChatService.mapConversation(...args); }
}

export default new ChatService();
