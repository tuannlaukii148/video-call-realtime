import { useCallback, useEffect, useState } from "react";
import { chatService, type ConversationItem } from "@/services/chatService";
import { CHAT_EVENTS } from "@/socket/events";
import { getSocket } from "@/socket/socket";
import { useMessageStore } from "@/stores/messageStore";

export function useConversations() {
  const conversations = useMessageStore((state) => state.conversations);
  const activeConversationId = useMessageStore((state) => state.activeConversationId);
  const userSearchResults = useMessageStore((state) => state.userSearchResults);
  const setConversations = useMessageStore((state) => state.setConversations);
  const upsertConversation = useMessageStore((state) => state.upsertConversation);
  const removeConversation = useMessageStore((state) => state.removeConversation);
  const setActiveConversationId = useMessageStore((state) => state.setActiveConversationId);
  const setUserSearchResults = useMessageStore((state) => state.setUserSearchResults);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const result = await chatService.getConversations();
      if (cancelled) {
        return;
      }
      setConversations(result.conversations);
      if (!activeConversationId && result.conversations.length > 0) {
        setActiveConversationId(result.conversations[0].conversationId);
      }
    };

    load().catch((error) => {
      console.error("Failed to load conversations", error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();

    const handleConversationUpdated = (conversation: ConversationItem) => {
      upsertConversation(conversation);
    };

    const handleConversationDeleted = (payload: { deletedConversationId?: string }) => {
      if (payload.deletedConversationId) {
        removeConversation(payload.deletedConversationId);
      }
    };

    socket.on(CHAT_EVENTS.CONVERSATION_UPDATED, handleConversationUpdated);
    socket.on(CHAT_EVENTS.DELETED, handleConversationDeleted);

    return () => {
      socket.off(CHAT_EVENTS.CONVERSATION_UPDATED, handleConversationUpdated);
      socket.off(CHAT_EVENTS.DELETED, handleConversationDeleted);
    };
  }, [removeConversation, upsertConversation]);

  const searchUsers = useCallback(async (email: string) => {
    if (!email.trim()) {
      setUserSearchResults([]);
      return;
    }
    setIsSearchingUsers(true);
    try {
      const result = await chatService.searchUsers(email.trim());
      setUserSearchResults(result.users);
    } finally {
      setIsSearchingUsers(false);
    }
  }, [setUserSearchResults]);

  const startConversation = useCallback(async (payload: { email?: string; userId?: string }) => {
    const result = await chatService.createDirectConversation(payload);
    upsertConversation(result.conversation);
    setActiveConversationId(result.conversation.conversationId);
    setUserSearchResults([]);
    return result.conversation;
  }, [setActiveConversationId, setUserSearchResults, upsertConversation]);

  const addPersonToConversation = useCallback(async (
    conversationId: string,
    payload: { email?: string; userId?: string; userIds?: string[]; title?: string }
  ) => {
    const result = await chatService.addConversationMember(conversationId, payload);
    upsertConversation(result.conversation);
    setActiveConversationId(result.conversation.conversationId);
    return result.conversation;
  }, [setActiveConversationId, upsertConversation]);

  const renameConversation = useCallback(async (conversationId: string, title: string) => {
    const result = await chatService.updateConversation(conversationId, { title });
    upsertConversation(result.conversation);
    return result.conversation;
  }, [upsertConversation]);

  const renameConversationMember = useCallback(async (
    conversationId: string,
    userId: string,
    nickname: string | null
  ) => {
    const result = await chatService.updateConversationMember(conversationId, userId, { nickname });
    upsertConversation(result.conversation);
    return result.conversation;
  }, [upsertConversation]);

  const removeConversationMember = useCallback(async (conversationId: string, userId: string) => {
    const result = await chatService.deleteConversationMember(conversationId, userId);
    upsertConversation(result.conversation);
    return result.conversation;
  }, [upsertConversation]);

  const deleteConversation = useCallback(async (conversationId: string) => {
    await chatService.deleteConversation(conversationId);
    removeConversation(conversationId);
  }, [removeConversation]);

  return {
    conversations,
    activeConversationId,
    userSearchResults,
    isSearchingUsers,
    setActiveConversationId,
    searchUsers,
    startConversation,
    addPersonToConversation,
    renameConversation,
    renameConversationMember,
    removeConversationMember,
    deleteConversation,
  };
}
