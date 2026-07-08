import api from "@/lib/axios";

export type MessageStatus = "sent" | "delivered" | "read";
export type MessageType = "text" | "system" | "file" | "sticker" | "emoji";
export type ReactionEmoji = "like" | "love" | "haha" | "wow" | "sad" | "angry";
export type CallType = "audio" | "video";
export type CallStatus = "ended" | "missed" | "rejected";

export interface MessageDelivery {
  userId: string;
  status: MessageStatus;
  deliveredAt: string | null;
  readAt: string | null;
}

export interface MessageSystemEvent {
  category: "call";
  callId: string | null;
  call_type: CallType | null;
  call_status: CallStatus | null;
  callerId: string | null;
  receiverIds: string[];
  started_at: string | null;
  answered_at: string | null;
  ended_at: string | null;
  duration_seconds: number | null;
}

export interface MessageReference {
  messageId: string | null;
  senderId: string | null;
  senderName: string;
  content: string;
  type: MessageType;
  timestamp: string | null;
}

export interface MessageReactionCount {
  emoji: ReactionEmoji;
  count: number;
}

export interface MessageEditHistoryItem {
  editId: string;
  messageId: string;
  editorId: string;
  fromVersion: number;
  toVersion: number;
  previousContent: string;
  newContent: string;
  editedAt: string;
}

export interface MessageReactionUser {
  reactionId: string;
  emoji: ReactionEmoji;
  reactedAt: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  userEmail: string;
}

export interface ChatMessage {
  _id: string;
  messageId: string;
  conversationId: string | null;
  room_id?: string | null;
  sender_id?: string | null;
  sender_name?: string;
  sender_avatar?: string | null;
  senderId: string | null;
  senderName: string;
  senderAvatar?: string | null;
  type: MessageType;
  content: string;
  timestamp: string;
  status: MessageStatus;
  attachment?: {
    url: string;
    filename: string;
    storedFilename?: string;
    mime_type?: string;
    size?: number;
  } | null;
  clientId?: string | null;
  version: number;
  delivery: MessageDelivery[];
  ownReceipt?: MessageDelivery | null;
  editedAt?: string | null;
  editedBy?: string | null;
  editCount: number;
  isEdited: boolean;
  deletedForEveryoneAt?: string | null;
  deletedBy?: string | null;
  deleteReason?: string | null;
  replyTo?: MessageReference | null;
  forwardedFrom?: {
    messageId: string | null;
    conversationId: string | null;
    roomId: string | null;
    senderId: string | null;
    senderName: string;
    timestamp: string | null;
  } | null;
  reactionCounts: MessageReactionCount[];
  myReactions?: ReactionEmoji[];
  systemEvent?: MessageSystemEvent | null;
}

export interface ConversationParticipant {
  id: string;
  fullName: string;
  avatar: string | null;
  email?: string;
  role?: "owner" | "member";
  nickname?: string | null;
}

export interface ConversationItem {
  conversationId: string;
  type: "direct" | "group";
  ownerId: string | null;
  currentUserRole: "owner" | "member";
  title: string;
  description: string;
  latestMessage: ChatMessage | null;
  participants: ConversationParticipant[];
  participantCount: number;
  host: ConversationParticipant | null;
  unreadCount: number;
}

export interface UserSearchResult {
  userId: string;
  fullName: string;
  email: string;
  avatar: string | null;
}

export interface ConversationHistoryResponse {
  success: boolean;
  conversation: ConversationItem;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  messages: ChatMessage[];
}

export interface RoomChatHistoryResponse {
  success: boolean;
  room: {
    roomCode: string;
    title: string;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  messages: ChatMessage[];
}

export const chatService = {
  searchUsers: async (email: string): Promise<{ success: boolean; users: UserSearchResult[] }> => {
    const res = await api.get("/chat/users/search", { params: { email } });
    return res.data;
  },

  createDirectConversation: async (payload: { email?: string; userId?: string }): Promise<{ success: boolean; conversation: ConversationItem }> => {
    const res = await api.post("/chat/conversations/direct", payload);
    return res.data;
  },

  getConversations: async (): Promise<{ success: boolean; conversations: ConversationItem[] }> => {
    const res = await api.get("/chat/conversations");
    return res.data;
  },

  addConversationMember: async (
    conversationId: string,
    payload: { email?: string; userId?: string; userIds?: string[]; title?: string }
  ): Promise<{ success: boolean; conversation: ConversationItem; systemMessage?: ChatMessage }> => {
    const res = await api.post(`/chat/conversations/${conversationId}/members`, payload);
    return res.data;
  },

  updateConversation: async (
    conversationId: string,
    payload: { title: string }
  ): Promise<{ success: boolean; conversation: ConversationItem; systemMessage?: ChatMessage }> => {
    const res = await api.patch(`/chat/conversations/${conversationId}`, payload);
    return res.data;
  },

  updateConversationMember: async (
    conversationId: string,
    userId: string,
    payload: { nickname: string | null }
  ): Promise<{ success: boolean; conversation: ConversationItem; systemMessage?: ChatMessage }> => {
    const res = await api.patch(`/chat/conversations/${conversationId}/members/${userId}`, payload);
    return res.data;
  },

  deleteConversationMember: async (
    conversationId: string,
    userId: string
  ): Promise<{ success: boolean; conversation: ConversationItem; systemMessage?: ChatMessage }> => {
    const res = await api.delete(`/chat/conversations/${conversationId}/members/${userId}`);
    return res.data;
  },

  deleteConversation: async (
    conversationId: string
  ): Promise<{ success: boolean; conversationId: string }> => {
    const res = await api.delete(`/chat/conversations/${conversationId}`);
    return res.data;
  },

  getConversationMessages: async (
    conversationId: string,
    options?: { page?: number; limit?: number }
  ): Promise<ConversationHistoryResponse> => {
    const params = {
      page: options?.page || 1,
      limit: options?.limit || 50,
    };
    const res = await api.get(`/chat/conversations/${conversationId}/messages`, { params });
    return res.data;
  },

  sendConversationMessage: async (
    conversationId: string,
    payload: { content: string; type?: MessageType; clientId?: string; replyToMessageId?: string | null }
  ): Promise<{ success: boolean; message: ChatMessage }> => {
    const res = await api.post(`/chat/conversations/${conversationId}/messages`, payload);
    return res.data;
  },

  markConversationRead: async (
    conversationId: string,
    messageIds?: string[]
  ): Promise<{ success: boolean; messages: ChatMessage[] }> => {
    const res = await api.patch(`/chat/conversations/${conversationId}/messages/read`, {
      messageIds: messageIds || [],
    });
    return res.data;
  },

  updateMessageReceipt: async (payload: {
    scopeType: "conversation" | "room";
    scopeId: string;
    messageIds?: string[];
    status: "delivered" | "read";
    clientMutationId?: string;
  }): Promise<{ success: boolean; messages: ChatMessage[] }> => {
    const res = await api.patch(`/chat/messages/receipts`, payload);
    return res.data;
  },

  editMessage: async (
    messageId: string,
    payload: { content: string; expectedVersion: number; clientMutationId?: string }
  ): Promise<{ success: boolean; message: ChatMessage }> => {
    const res = await api.patch(`/chat/messages/${messageId}`, payload);
    return res.data;
  },

  deleteMessage: async (
    messageId: string,
    payload: { mode: "for_me" | "for_everyone"; expectedVersion?: number; clientMutationId?: string }
  ): Promise<{ success: boolean; message?: ChatMessage; hidden?: boolean; messageId?: string }> => {
    const res = await api.delete(`/chat/messages/${messageId}`, { data: payload });
    return res.data;
  },

  forwardMessage: async (
    messageId: string,
    payload: { targetType: "conversation" | "room"; targetId: string; clientId: string; clientMutationId?: string }
  ): Promise<{ success: boolean; message: ChatMessage }> => {
    const res = await api.post(`/chat/messages/${messageId}/forward`, payload);
    return res.data;
  },

  addReaction: async (
    messageId: string,
    emoji: ReactionEmoji,
    clientMutationId?: string
  ): Promise<{ success: boolean; message: ChatMessage; emoji: ReactionEmoji }> => {
    const res = await api.put(`/chat/messages/${messageId}/reactions/${emoji}`, { clientMutationId });
    return res.data;
  },

  removeReaction: async (
    messageId: string,
    emoji: ReactionEmoji,
    clientMutationId?: string
  ): Promise<{ success: boolean; message: ChatMessage; emoji: ReactionEmoji }> => {
    const res = await api.delete(`/chat/messages/${messageId}/reactions/${emoji}`, {
      data: { clientMutationId },
    });
    return res.data;
  },

  getMessageEdits: async (
    messageId: string,
    options?: { limit?: number }
  ): Promise<{ success: boolean; edits: MessageEditHistoryItem[] }> => {
    const res = await api.get(`/chat/messages/${messageId}/edits`, {
      params: { limit: options?.limit || 50 },
    });
    return res.data;
  },

  getMessageReactions: async (
    messageId: string,
    options?: { emoji?: ReactionEmoji; limit?: number }
  ): Promise<{ success: boolean; reactions: MessageReactionUser[] }> => {
    const res = await api.get(`/chat/messages/${messageId}/reactions`, {
      params: { emoji: options?.emoji, limit: options?.limit || 50 },
    });
    return res.data;
  },

  getChatHistory: async (
    roomCode: string,
    options?: { page?: number; limit?: number }
  ): Promise<RoomChatHistoryResponse> => {
    const params = {
      page: options?.page || 1,
      limit: options?.limit || 50,
    };
    const res = await api.get(`/chat/rooms/${roomCode}/messages`, { params });
    return res.data;
  },

  getRoomMessages: async (
    roomCode: string,
    options?: { page?: number; limit?: number }
  ): Promise<RoomChatHistoryResponse> => {
    return chatService.getChatHistory(roomCode, options);
  },
  
  uploadChatFile: async (form: FormData): Promise<{ success: boolean; file: { url: string; filename: string; mime_type: string; size: number } }> => {
    // Do NOT set Content-Type header manually; let axios set the multipart boundary.
    const res = await api.post(`/chat/uploads/chat`, form);
    return res.data;
  },
};
