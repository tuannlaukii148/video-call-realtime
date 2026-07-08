import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  chatService,
  type ChatMessage,
  type MessageEditHistoryItem,
  type MessageReactionUser,
  type ReactionEmoji,
} from "@/services/chatService";
import { getSocket } from "@/socket/socket";
import { CHAT_EVENTS } from "@/socket/events";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMessageStore } from "@/stores/messageStore";

const buildClientId = () => `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
const EMPTY_MESSAGES: ChatMessage[] = [];

export interface ComposerState {
  mode: "default" | "reply" | "edit";
  message: ChatMessage | null;
}

const withMyReaction = (message: ChatMessage, emoji: ReactionEmoji, active: boolean): ChatMessage => {
  const current = new Set(message.myReactions || []);
  if (active) {
    current.add(emoji);
  } else {
    current.delete(emoji);
  }

  return {
    ...message,
    myReactions: [...current],
  };
};

export function useMessages(conversationId: string | null) {
  const authUser = useAuthStore((state) => state.user);
  const messages = useMessageStore((state) => {
    if (!conversationId) {
      return EMPTY_MESSAGES;
    }
    return state.messagesByConversationId[conversationId] || EMPTY_MESSAGES;
  });
  const setMessages = useMessageStore((state) => state.setMessages);
  const prependMessages = useMessageStore((state) => state.prependMessages);
  const upsertMessage = useMessageStore((state) => state.upsertMessage);
  const markMessageDeleted = useMessageStore((state) => state.markMessageDeleted);
  const updateMessageReceipt = useMessageStore((state) => state.updateMessageReceipt);
  const removeConversation = useMessageStore((state) => state.removeConversation);
  const clearUnread = useMessageStore((state) => state.clearUnread);
  const incrementUnread = useMessageStore((state) => state.incrementUnread);
  const setTyping = useMessageStore((state) => state.setTyping);
  const activeConversationId = useMessageStore((state) => state.activeConversationId);

  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [composerState, setComposerState] = useState<ComposerState>({ mode: "default", message: null });
  const pageRef = useRef(1);

  useEffect(() => {
    if (!conversationId) {
      return;
    }

    const socket = getSocket();
    const load = async () => {
      setIsLoading(true);
      try {
        const result = await chatService.getConversationMessages(conversationId, { page: 1, limit: 50 });
        pageRef.current = 1;
        setMessages(conversationId, result.messages);
        setHasMore(result.pagination.page < result.pagination.pages);
        clearUnread(conversationId);
        socket.emit(CHAT_EVENTS.SUBSCRIBE, { conversationId });
        if (result.messages.length > 0) {
          socket.emit(CHAT_EVENTS.RECEIPT, {
            conversationId,
            status: "read",
            messageIds: result.messages
              .filter((message) => message.senderId && message.senderId !== authUser?._id)
              .map((message) => message.messageId),
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    load().catch((error) => {
      console.error("Failed to load messages", error);
    });

    return () => {
      socket.emit(CHAT_EVENTS.UNSUBSCRIBE, { conversationId });
      setTyping(conversationId, null);
      setComposerState({ mode: "default", message: null });
    };
  }, [authUser?._id, clearUnread, conversationId, setMessages, setTyping]);



  type SendPayload = string | { type: import("@/services/chatService").MessageType; content?: string; file?: any; stickerId?: string; emoji?: string };

  const sendMessage = async (payload: SendPayload) => {
    if (!conversationId || !authUser?._id) return;
    if (typeof payload === 'string' && !payload.trim()) return;

    // handle edit mode
    if (composerState.mode === "edit" && composerState.message) {
      const current = composerState.message;
      const previousContent = current.content;
      const newContent = typeof payload === 'string' ? payload.trim() : payload.content || '';
      const optimistic: ChatMessage = {
        ...current,
        content: newContent,
        version: current.version + 1,
        isEdited: true,
        editCount: current.editCount + 1,
        editedAt: new Date().toISOString(),
      };

      upsertMessage(conversationId, optimistic);
      try {
        const result = await chatService.editMessage(current.messageId, {
          content: newContent,
          expectedVersion: current.version,
          clientMutationId: buildClientId(),
        });
        upsertMessage(conversationId, result.message);
        setComposerState({ mode: "default", message: null });
      } catch (error) {
        upsertMessage(conversationId, { ...current, content: previousContent });
        throw error;
      }
      return;
    }

    const clientId = typeof payload === 'string' ? buildClientId() : ((payload as any).clientId || buildClientId());

    // Build optimistic message based on payload
    const messageType = typeof payload === 'string' ? 'text' : payload.type || 'text';
    const contentStr = typeof payload === 'string'
      ? payload.trim()
      : payload.type === 'file'
        ? (payload.content || payload.file?.filename || payload.file?.url || '')
        : (payload.content || '');

    const optimistic: ChatMessage = {
      _id: clientId,
      messageId: clientId,
      conversationId,
      sender_id: authUser._id,
      sender_name: authUser.full_name,
      sender_avatar: authUser.avatar || null,
      senderId: authUser._id,
      senderName: authUser.full_name,
      senderAvatar: authUser.avatar || null,
      type: messageType as any,
      content: contentStr,
      timestamp: new Date().toISOString(),
      status: "sent",
      clientId,
      attachment: typeof payload === 'string' ? null : (payload.type === 'file' ? payload.file || null : null),
      version: 1,
      delivery: [],
      ownReceipt: null,
      editCount: 0,
      isEdited: false,
      editedAt: null,
      editedBy: null,
      deletedForEveryoneAt: null,
      deletedBy: null,
      deleteReason: null,
      replyTo:
        composerState.mode === "reply" && composerState.message
          ? {
              messageId: composerState.message.messageId,
              senderId: composerState.message.senderId,
              senderName: composerState.message.senderName,
              content: composerState.message.content,
              type: composerState.message.type,
              timestamp: composerState.message.timestamp,
            }
          : null,
      forwardedFrom: null,
      reactionCounts: [],
      myReactions: [],
      systemEvent: null,
    };

    upsertMessage(conversationId, optimistic);

    // Emit socket send with appropriate type and payload
    const sendPayload: any = {
      conversationId,
      clientId,
      replyToMessageId: composerState.mode === "reply" ? composerState.message?.messageId || null : null,
    };

    if (typeof payload === 'string') {
      sendPayload.content = payload.trim();
      sendPayload.type = 'text';
    } else {
      sendPayload.type = payload.type || 'text';
      if (payload.type === 'file' && payload.file) {
        // include file metadata as attachment
        sendPayload.attachment = payload.file;
        // include file caption if present, otherwise fall back to filename/url
        sendPayload.content = payload.content || payload.file.filename || payload.file.url || '';
      } else if (payload.type === 'sticker') {
        sendPayload.content = payload.stickerId || '';
      } else if (payload.type === 'emoji') {
        sendPayload.content = payload.emoji || '';
      } else {
        sendPayload.content = payload.content || '';
      }
    }

    getSocket().emit(CHAT_EVENTS.SEND, sendPayload);
    setComposerState({ mode: "default", message: null });
  };

  const deleteMessage = async (message: ChatMessage, mode: "for_me" | "for_everyone") => {
    if (!conversationId) {
      return;
    }

    if (mode === "for_me") {
      markMessageDeleted(conversationId, message.messageId);
      try {
        await chatService.deleteMessage(message.messageId, {
          mode,
          clientMutationId: buildClientId(),
        });
      } catch (error) {
        upsertMessage(conversationId, message);
        throw error;
      }
      return;
    }

    const optimistic: ChatMessage = {
      ...message,
      content: "This message was deleted",
      deletedForEveryoneAt: new Date().toISOString(),
      deletedBy: authUser?._id || null,
      version: message.version + 1,
    };
    upsertMessage(conversationId, optimistic);
    const result = await chatService.deleteMessage(message.messageId, {
      mode,
      expectedVersion: message.version,
      clientMutationId: buildClientId(),
    });
    if (result.message) {
      upsertMessage(conversationId, result.message);
    }
  };

  const toggleReaction = async (message: ChatMessage, emoji: ReactionEmoji) => {
    if (!conversationId) {
      return;
    }

    const active = (message.myReactions || []).includes(emoji);
    const result = active
      ? await chatService.removeReaction(message.messageId, emoji, buildClientId())
      : await chatService.addReaction(message.messageId, emoji, buildClientId());

    upsertMessage(conversationId, withMyReaction(result.message, emoji, !active));
  };

  const forwardMessage = async (messageId: string, targetConversationId: string) => {
    await chatService.forwardMessage(messageId, {
      targetType: "conversation",
      targetId: targetConversationId,
      clientId: buildClientId(),
      clientMutationId: buildClientId(),
    });
  };

  const loadEditHistory = async (messageId: string): Promise<MessageEditHistoryItem[]> => {
    const result = await chatService.getMessageEdits(messageId);
    return result.edits;
  };

  const loadReactionUsers = async (messageId: string, emoji?: ReactionEmoji): Promise<MessageReactionUser[]> => {
    const result = await chatService.getMessageReactions(messageId, { emoji });
    return result.reactions;
  };

  const loadMore = async () => {
    if (!conversationId || isLoading || !hasMore) {
      return;
    }
    setIsLoading(true);
    try {
      const nextPage = pageRef.current + 1;
      const result = await chatService.getConversationMessages(conversationId, { page: nextPage, limit: 50 });
      pageRef.current = nextPage;
      prependMessages(conversationId, result.messages);
      setHasMore(result.pagination.page < result.pagination.pages);
    } finally {
      setIsLoading(false);
    }
  };

  const setTypingState = (typing: boolean) => {
    if (!conversationId || !authUser?.full_name) {
      return;
    }
    getSocket().emit(typing ? CHAT_EVENTS.TYPING : CHAT_EVENTS.TYPING_STOP, {
      conversationId,
      userName: authUser.full_name,
    });
  };

  return {
    messages,
    isLoading,
    hasMore,
    composerState,
    sendMessage,
    loadMore,
    setTypingState,
    startReply: (message: ChatMessage) => setComposerState({ mode: "reply", message }),
    startEdit: (message: ChatMessage) => setComposerState({ mode: "edit", message }),
    clearComposerState: () => setComposerState({ mode: "default", message: null }),
    deleteMessage,
    toggleReaction,
    forwardMessage,
    loadEditHistory,
    loadReactionUsers,
  };
}
