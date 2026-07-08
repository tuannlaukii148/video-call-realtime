import { create } from "zustand";
import type { ChatMessage, ConversationItem, MessageDelivery, MessageStatus, UserSearchResult } from "@/services/chatService";

export type PresenceState = "online" | "offline";

export interface PresenceEntry {
  status: PresenceState;
  lastSeenAt: string | null;
}

interface MessageState {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  messagesByConversationId: Record<string, ChatMessage[]>;
  presenceByUserId: Record<string, PresenceEntry>;
  typingByConversationId: Record<string, { userId: string; userName: string } | null>;
  userSearchResults: UserSearchResult[];

  setConversations: (conversations: ConversationItem[]) => void;
  upsertConversation: (conversation: ConversationItem) => void;
  removeConversation: (conversationId: string) => void;
  incrementUnread: (conversationId: string) => void;
  clearUnread: (conversationId: string) => void;
  setActiveConversationId: (conversationId: string | null) => void;

  setMessages: (conversationId: string, messages: ChatMessage[]) => void;
  prependMessages: (conversationId: string, messages: ChatMessage[]) => void;
  upsertMessage: (conversationId: string, message: ChatMessage) => void;
  markMessageDeleted: (conversationId: string, messageId: string) => void;
  updateMessageReceipt: (conversationId: string, message: ChatMessage) => void;

  setPresence: (entries: Array<{ userId: string; status: PresenceState; lastSeenAt: string | null }>) => void;
  setTyping: (conversationId: string, typing: { userId: string; userName: string } | null) => void;
  setUserSearchResults: (users: UserSearchResult[]) => void;
}

const replaceByMessageId = (messages: ChatMessage[], nextMessage: ChatMessage) => {
  const nextId = nextMessage.messageId || nextMessage._id;
  const clientId = nextMessage.clientId;
  const existingIndex = messages.findIndex((message) => {
    if (message.messageId === nextId || message._id === nextId) {
      return true;
    }
    return Boolean(clientId && message.clientId && message.clientId === clientId);
  });

  if (existingIndex === -1) {
    return [...messages, nextMessage];
  }

  const copy = [...messages];
  const existing = copy[existingIndex];
  const preserveLocal = (existing && ((existing._id && String(existing._id).startsWith('local-')) || (existing.messageId && String(existing.messageId).startsWith('local-'))));
  const merged = { ...existing, ...nextMessage };
  if (preserveLocal) {
    if (existing._id) merged._id = existing._id;
    if (existing.messageId) merged.messageId = existing.messageId;
  }
  copy[existingIndex] = merged;
  return copy;
};

const updateConversationPreview = (conversation: ConversationItem, message: ChatMessage) => ({
  ...conversation,
  latestMessage: message,
});

export const useMessageStore = create<MessageState>((set) => ({
  conversations: [],
  activeConversationId: null,
  messagesByConversationId: {},
  presenceByUserId: {},
  typingByConversationId: {},
  userSearchResults: [],

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conversation) => set((state) => {
    const existingIndex = state.conversations.findIndex((item) => item.conversationId === conversation.conversationId);
    if (existingIndex === -1) {
      return { conversations: [conversation, ...state.conversations] };
    }
    const next = [...state.conversations];
    next[existingIndex] = { ...next[existingIndex], ...conversation };
    return { conversations: next };
  }),

  removeConversation: (conversationId) => set((state) => ({
    conversations: state.conversations.filter((conversation) => conversation.conversationId !== conversationId),
    messagesByConversationId: Object.fromEntries(
      Object.entries(state.messagesByConversationId).filter(([key]) => key !== conversationId)
    ),
    activeConversationId:
      state.activeConversationId === conversationId ? state.conversations.find((conversation) => conversation.conversationId !== conversationId)?.conversationId || null : state.activeConversationId,
  })),

  incrementUnread: (conversationId) => set((state) => ({
    conversations: state.conversations.map((conversation) =>
      conversation.conversationId === conversationId
        ? { ...conversation, unreadCount: conversation.unreadCount + 1 }
        : conversation
    ),
  })),

  clearUnread: (conversationId) => set((state) => ({
    conversations: state.conversations.map((conversation) =>
      conversation.conversationId === conversationId
        ? { ...conversation, unreadCount: 0 }
        : conversation
    ),
  })),

  setActiveConversationId: (conversationId) => set({ activeConversationId: conversationId }),

  setMessages: (conversationId, messages) => set((state) => ({
    messagesByConversationId: {
      ...state.messagesByConversationId,
      [conversationId]: messages,
    },
    conversations: state.conversations.map((conversation) =>
      conversation.conversationId === conversationId && messages.length > 0
        ? updateConversationPreview(conversation, messages[messages.length - 1])
        : conversation
    ),
  })),

  prependMessages: (conversationId, messages) => set((state) => ({
    messagesByConversationId: {
      ...state.messagesByConversationId,
      [conversationId]: [...messages, ...(state.messagesByConversationId[conversationId] || [])],
    },
  })),

  upsertMessage: (conversationId, message) => set((state) => {
    const nextMessages = replaceByMessageId(state.messagesByConversationId[conversationId] || [], message);
    return {
      messagesByConversationId: {
        ...state.messagesByConversationId,
        [conversationId]: nextMessages,
      },
      conversations: state.conversations.map((conversation) =>
        conversation.conversationId === conversationId
          ? updateConversationPreview(conversation, message)
          : conversation
      ),
    };
  }),

  markMessageDeleted: (conversationId, messageId) => set((state) => ({
    messagesByConversationId: {
      ...state.messagesByConversationId,
      [conversationId]: (state.messagesByConversationId[conversationId] || []).filter(
        (message) => message.messageId !== messageId && message._id !== messageId
      ),
    },
  })),

  updateMessageReceipt: (conversationId, message) => set((state) => ({
    messagesByConversationId: {
      ...state.messagesByConversationId,
      [conversationId]: replaceByMessageId(state.messagesByConversationId[conversationId] || [], message),
    },
    conversations: state.conversations.map((conversation) =>
      conversation.conversationId === conversationId &&
      conversation.latestMessage?.messageId === message.messageId
        ? updateConversationPreview(conversation, message)
        : conversation
    ),
  })),

  setPresence: (entries) => set((state) => {
    const next = { ...state.presenceByUserId };
    let changed = false;
    for (const entry of entries) {
      const previous = next[entry.userId];
      if (previous?.status === entry.status && previous?.lastSeenAt === entry.lastSeenAt) {
        continue;
      }
      next[entry.userId] = {
        status: entry.status,
        lastSeenAt: entry.lastSeenAt,
      };
      changed = true;
    }
    return changed ? { presenceByUserId: next } : state;
  }),

  setTyping: (conversationId, typing) => set((state) => {
    const previous = state.typingByConversationId[conversationId] || null;
    if (previous?.userId === typing?.userId && previous?.userName === typing?.userName) {
      return state;
    }
    return {
      typingByConversationId: {
        ...state.typingByConversationId,
        [conversationId]: typing,
      },
    };
  }),

  setUserSearchResults: (users) => set({ userSearchResults: users }),
}));

export const getMessageReceiptLabel = (
  senderId: string | null,
  currentUserId: string | null | undefined,
  status: MessageStatus,
  delivery: MessageDelivery[] = []
) => {
  if (!currentUserId || senderId !== currentUserId) {
    return null;
  }
  if (status === "read" || delivery.some((entry) => entry.status === "read")) {
    return "Read";
  }
  if (status === "delivered" || delivery.some((entry) => entry.status === "delivered")) {
    return "Delivered";
  }
  return "Sent";
};
