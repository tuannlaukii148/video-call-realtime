import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { getSocket } from '@/socket/socket';
import { CHAT_EVENTS } from '@/socket/events';
import { useMeetingStore } from '@/stores/meetingStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { ChatMessage } from '@/types';

/**
 * Shape returned by backend mapMessage() for room-based chat history.
 */
interface MappedMessage {
  _id: string;
  messageId: string;
  senderId: string | null;
  senderName: string;
  senderAvatar?: string | null;
  content: string;
  type: 'text' | 'system' | 'file' | 'sticker' | 'emoji';
  timestamp: string;
  attachment?: {
    url: string;
    filename: string;
    storedFilename?: string;
    mime_type?: string;
    size?: number;
  } | null;
  clientId?: string | null;
  client_id?: string | null;
  conversationId?: string | null;
  version?: number;
  status?: string;
  isEdited?: boolean;
  editedAt?: string | null;
  deletedForEveryoneAt?: string | null;
  deletedBy?: string | null;
  replyTo?: {
    messageId: string | null;
    senderId: string | null;
    senderName: string;
    content: string;
    type: string;
    timestamp: string | null;
  } | null;
  reactionCounts?: Array<{ emoji: string; count: number }>;
  myReactions?: string[];
}

interface ChatHistoryResponse {
  messages: MappedMessage[];
  page: number;
  hasMore: boolean;
  roomCode?: string;
}

const toLocalMessage = (m: MappedMessage): ChatMessage => ({
  id: m.messageId || m._id,
  senderId: m.senderId || (m as any).sender_id || '',
  senderName: m.senderName || (m as any).sender_name || '',
  content: m.content,
  timestamp: m.timestamp,
  type: (m.type ?? 'text') as ChatMessage['type'],
  attachment: m.attachment ?? null,
  clientId: m.clientId || m.client_id || null,
  version: m.version ?? 1,
  isEdited: m.isEdited || Boolean(m.editedAt),
  editedAt: m.editedAt || null,
  deletedForEveryoneAt: m.deletedForEveryoneAt || null,
  deletedBy: m.deletedBy || null,
  replyTo: m.replyTo || null,
  reactionCounts: m.reactionCounts || [],
  myReactions: m.myReactions || [],
});

export function useChatEvents(roomCode: string | null) {
  const socket = getSocket();
  const authUser = useAuthStore((s) => s.user);
  const { addMessage, setMessages, prependMessages } = useMeetingStore();
  const upsertMessage = useMeetingStore((s) => s.upsertMessage);

  const pageRef = useRef(1);
  const hasMoreRef = useRef(true);
  const isLoadingRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  // --- Subscribe to room chat channel on mount ---
  useEffect(() => {
    if (!roomCode) return;

    socket.emit(CHAT_EVENTS.SUBSCRIBE, { roomCode });

    return () => {
      socket.emit(CHAT_EVENTS.UNSUBSCRIBE, { roomCode });
    };
  }, [socket, roomCode]);

  // --- Listen for incoming messages and updates ---
  useEffect(() => {
    if (!roomCode) return;

    const handleReceive = (data: MappedMessage) => {
      const msg = toLocalMessage(data);

      if (msg.senderId && msg.senderId !== authUser?._id) {
        const preview = msg.type === 'file'
          ? msg.attachment?.filename || msg.content || 'Attachment'
          : msg.content;
        try {
          toast.info(`Tin nhắn mới từ ${msg.senderName}`, {
            description: preview,
          });
        } catch {
          // ignore toast errors
        }
      }

      const serverClientId = data.clientId || data.client_id || (data as any).client_id;
      if (serverClientId) {
        upsertMessage({ ...msg, clientId: serverClientId });
        return;
      }

      addMessage(msg);
    };

    const handleSystemAlert = (data: { message: string; timestamp?: string }) => {
      const msg: ChatMessage = {
        id: `system-${Date.now()}`,
        senderId: 'system',
        senderName: 'System',
        content: data.message,
        timestamp: data.timestamp ?? new Date().toISOString(),
        type: 'system',
      };
      addMessage(msg);
    };

    const handleMessageUpdated = (payload: { message?: MappedMessage }) => {
      if (payload?.message) {
        upsertMessage(toLocalMessage(payload.message));
      }
    };

    const handleMessageDeleted = (payload: { message?: MappedMessage }) => {
      if (payload?.message) {
        upsertMessage(toLocalMessage(payload.message));
      }
    };

    const handleReactionUpdated = (payload: { message?: MappedMessage }) => {
      if (payload?.message) {
        upsertMessage(toLocalMessage(payload.message));
      }
    };

    const handleConnect = () => {
      console.log('Socket reconnected, resubscribing and syncing chat history...');
      socket.emit(CHAT_EVENTS.SUBSCRIBE, { roomCode });
      socket.emit(CHAT_EVENTS.HISTORY, {
        roomCode,
        page: 1,
        limit: 50,
      });
    };

    socket.on(CHAT_EVENTS.RECEIVE, handleReceive);
    socket.on(CHAT_EVENTS.SYSTEM_ALERT, handleSystemAlert);
    socket.on(CHAT_EVENTS.MESSAGE_UPDATED, handleMessageUpdated);
    socket.on(CHAT_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
    socket.on(CHAT_EVENTS.REACTION_UPDATED, handleReactionUpdated);
    socket.on('connect', handleConnect);

    return () => {
      socket.off(CHAT_EVENTS.RECEIVE, handleReceive);
      socket.off(CHAT_EVENTS.SYSTEM_ALERT, handleSystemAlert);
      socket.off(CHAT_EVENTS.MESSAGE_UPDATED, handleMessageUpdated);
      socket.off(CHAT_EVENTS.MESSAGE_DELETED, handleMessageDeleted);
      socket.off(CHAT_EVENTS.REACTION_UPDATED, handleReactionUpdated);
      socket.off('connect', handleConnect);
    };
  }, [socket, roomCode, addMessage, upsertMessage, authUser?._id]);

  // --- Listen for history response ---
  useEffect(() => {
    if (!roomCode) return;

    const handleHistory = (data: ChatHistoryResponse) => {
      isLoadingRef.current = false;
      hasMoreRef.current = data.hasMore;

      const mapped: ChatMessage[] = data.messages.map(toLocalMessage);

      if (data.page === 1) {
        setMessages(mapped);
      } else {
        prependMessages(mapped);
      }
    };

    socket.on(CHAT_EVENTS.HISTORY, handleHistory);

    return () => {
      socket.off(CHAT_EVENTS.HISTORY, handleHistory);
    };
  }, [socket, roomCode, setMessages, prependMessages]);

  // --- Initial history load ---
  useEffect(() => {
    if (!roomCode || initialLoadDoneRef.current) return;

    initialLoadDoneRef.current = true;
    pageRef.current = 1;
    isLoadingRef.current = true;

    socket.emit(CHAT_EVENTS.HISTORY, {
      roomCode,
      page: 1,
      limit: 50,
    });
  }, [socket, roomCode]);

  // --- Reset on unmount ---
  useEffect(() => {
    return () => {
      initialLoadDoneRef.current = false;
      pageRef.current = 1;
      hasMoreRef.current = true;
    };
  }, [roomCode]);

  // --- Actions ---
  const sendMessage = useCallback(
    (payload: string | any) => {
      if (!roomCode) return;

      if (typeof payload === 'string') {
        const content = payload.trim();
        if (!content) return;

        const localId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const optimisticMsg: ChatMessage = {
          id: localId,
          senderId: authUser?._id ?? '',
          senderName: authUser?.full_name ?? 'You',
          content,
          timestamp: new Date().toISOString(),
          type: 'text',
          clientId: localId,
        };
        addMessage(optimisticMsg);

        socket.emit(CHAT_EVENTS.SEND, {
          roomCode,
          content,
          type: 'text',
          senderName: authUser?.full_name ?? 'You',
          senderAvatar: null,
          clientId: localId,
          client_id: localId,
        });

        return;
      }

      const data = payload || {};
      const localId = data.clientId || data.client_id || `local-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const optimisticMsg: ChatMessage = {
        id: localId,
        senderId: authUser?._id ?? '',
        senderName: authUser?.full_name ?? 'You',
        content:
          data.type === 'file'
            ? (data.attachment?.filename || data.attachment?.url || '')
            : (data.content || '') as string,
        timestamp: new Date().toISOString(),
        type: (data.type as any) || 'text',
        attachment: data.attachment ?? null,
        clientId: localId,
        replyTo: data.replyTo || null,
      };
      addMessage(optimisticMsg);

      const normalizedPayload = {
        roomCode,
        ...data,
        clientId: data.clientId || data.client_id || localId,
        client_id: data.clientId || data.client_id || localId,
        senderName: authUser?.full_name ?? 'You',
        senderAvatar: null,
        content: data.type === 'file' ? (data.attachment?.filename || data.attachment?.url || '') : data.content,
      };

      socket.emit(CHAT_EVENTS.SEND, normalizedPayload);
    },
    [socket, roomCode, authUser, addMessage],
  );

  const editMessage = useCallback((messageId: string, content: string, expectedVersion: number) => {
    if (!roomCode) return;
    socket.emit(CHAT_EVENTS.EDIT, {
      roomCode,
      messageId,
      content,
      expectedVersion,
      clientMutationId: `local-${Date.now()}`,
    });
  }, [socket, roomCode]);

  const deleteMessage = useCallback((messageId: string, expectedVersion: number) => {
    if (!roomCode) return;
    socket.emit(CHAT_EVENTS.DELETE, {
      roomCode,
      messageId,
      expectedVersion,
      clientMutationId: `local-${Date.now()}`,
    });
  }, [socket, roomCode]);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    if (!roomCode) return;
    socket.emit(CHAT_EVENTS.REACTION_ADD, {
      roomCode,
      messageId,
      emoji,
      clientMutationId: `local-${Date.now()}`,
    });
  }, [socket, roomCode]);

  const removeReaction = useCallback((messageId: string, emoji: string) => {
    if (!roomCode) return;
    socket.emit(CHAT_EVENTS.REACTION_REMOVE, {
      roomCode,
      messageId,
      emoji,
    });
  }, [socket, roomCode]);

  const loadMoreHistory = useCallback(() => {
    if (!roomCode || isLoadingRef.current || !hasMoreRef.current) return;

    isLoadingRef.current = true;
    pageRef.current += 1;

    socket.emit(CHAT_EVENTS.HISTORY, {
      roomCode,
      page: pageRef.current,
      limit: 50,
    });
  }, [socket, roomCode]);

  return {
    sendMessage,
    editMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    loadMoreHistory,
    hasMore: hasMoreRef.current,
  };
}
