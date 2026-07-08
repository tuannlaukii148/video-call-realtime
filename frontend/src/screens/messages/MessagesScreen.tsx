import { useMemo, useState } from "react";
import SideBar from "@/components/layout/SideBar";
import { CreateRoomDialog } from "@/components/pages/dashboard/room/CreateRoomDialog";
import { AddPersonDialog } from "@/components/pages/chat/AddPersonDialog";
import { ChatWindow } from "@/components/pages/chat/ChatWindow";
import { ConversationsSidebar } from "@/components/pages/chat/ConversationsSidebar";
import { ConversationInfoDialog } from "@/components/pages/chat/ConversationInfoDialog";
import { MessageEditHistoryDialog } from "@/components/pages/chat/MessageEditHistoryDialog";
import { MessageForwardDialog } from "@/components/pages/chat/MessageForwardDialog";
import { MessageReactionDialog } from "@/components/pages/chat/MessageReactionDialog";
import { useConversations } from "@/hooks/chat/useConversations";
import { useMessages } from "@/hooks/chat/useMessages";
import { usePresence } from "@/hooks/chat/usePresence";
import { useSocket } from "@/hooks/useSocket";
import { useMessageStore } from "@/stores/messageStore";
import { useAuthStore } from "@/stores/useAuthStore";
import type { ChatMessage, MessageEditHistoryItem, MessageReactionUser, ReactionEmoji } from "@/services/chatService";
import { toast } from "sonner";
import { useNavigate } from "react-router";

export function MessagesScreen() {
  useSocket();
  const navigate = useNavigate();

  const authUser = useAuthStore((state) => state.user);
  const {
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
  } = useConversations();
  const typingByConversationId = useMessageStore((state) => state.typingByConversationId);
  const presenceByUserId = useMessageStore((state) => state.presenceByUserId);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.conversationId === activeConversationId) || null,
    [activeConversationId, conversations]
  );

  const participantIds = useMemo(() => {
    const ids = new Set<string>();
    for (const conversation of conversations) {
      for (const participant of conversation.participants) {
        ids.add(participant.id);
      }
      if (conversation.host?.id) {
        ids.add(conversation.host.id);
      }
    }
    if (authUser?._id) {
      ids.delete(authUser._id);
    }
    return [...ids];
  }, [authUser?._id, conversations]);

  usePresence(participantIds);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [showAddPersonDialog, setShowAddPersonDialog] = useState(false);
  const [showConversationInfo, setShowConversationInfo] = useState(false);
  const [forwardMessageTarget, setForwardMessageTarget] = useState<ChatMessage | null>(null);
  const [editHistory, setEditHistory] = useState<MessageEditHistoryItem[]>([]);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [reactionUsers, setReactionUsers] = useState<MessageReactionUser[]>([]);
  const [reactionEmoji, setReactionEmoji] = useState<ReactionEmoji | undefined>(undefined);
  const [showReactionUsers, setShowReactionUsers] = useState(false);

  const {
    messages,
    hasMore,
    loadMore,
    composerState,
    sendMessage,
    setTypingState,
    startReply,
    startEdit,
    clearComposerState,
    deleteMessage,
    toggleReaction,
    forwardMessage,
    loadEditHistory,
    loadReactionUsers,
  } = useMessages(activeConversationId);

  return (
    <div className="flex min-h-screen bg-surface">
      <SideBar onNewMeeting={() => setShowCreateDialog(true)} />

      <main className="lg:ml-64 flex-1 flex h-screen overflow-hidden pt-14 lg:pt-0 min-w-0">
        {/* ── ConversationsSidebar: full-width on mobile (list view), fixed-width on desktop ── */}
        <div className={`
          w-full lg:w-80 h-full flex-shrink-0
          ${mobileView === 'chat' ? 'hidden lg:flex' : 'flex'}
        `}>
          <ConversationsSidebar
            conversations={conversations}
            activeConversationId={activeConversationId}
            userSearchResults={userSearchResults}
            isSearchingUsers={isSearchingUsers}
            presenceByUserId={presenceByUserId}
            onSelectConversation={(id) => {
              setActiveConversationId(id);
              setMobileView('chat'); // switch to chat view on mobile
            }}
            onSearchUsers={searchUsers}
            onStartConversation={startConversation}
          />
        </div>

        {/* ── ChatWindow: hidden on mobile (list view), full-width on mobile (chat view) ── */}
        <div className={`
          flex-1 h-full min-w-0
          ${mobileView === 'list' ? 'hidden lg:flex' : 'flex'}
          flex-col
        `}>
          {/* Mobile back button */}
          {mobileView === 'chat' && activeConversation && (
            <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-outline-variant/20 bg-surface-container-low shrink-0">
              <button
                onClick={() => setMobileView('list')}
                className="flex items-center gap-2 text-primary font-semibold text-sm"
                aria-label="Back to conversations"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Tin nhắn
              </button>
            </div>
          )}
          <ChatWindow
          conversation={activeConversation}
          messages={messages}
          typing={activeConversationId ? typingByConversationId[activeConversationId] || null : null}
          currentUserId={authUser?._id || null}
          presenceByUserId={presenceByUserId}
          hasMore={hasMore}
          composerState={composerState}
          onLoadMore={loadMore}
          onSendMessage={sendMessage}
          onTypingChange={setTypingState}
          onCancelComposerState={clearComposerState}
          onReplyMessage={startReply}
          onEditMessage={startEdit}
          onDeleteMessage={deleteMessage}
          onForwardMessage={(message) => setForwardMessageTarget(message)}
          onToggleReaction={toggleReaction}
          onShowEditHistory={async (message) => {
            const edits = await loadEditHistory(message.messageId);
            setEditHistory(edits);
            setShowEditHistory(true);
          }}
          onShowReactions={async (message, emoji) => {
            const reactions = await loadReactionUsers(message.messageId, emoji);
            setReactionUsers(reactions);
            setReactionEmoji(emoji);
            setShowReactionUsers(true);
          }}
            onOpenAddPerson={() => setShowAddPersonDialog(true)}
            onOpenConversationInfo={() => setShowConversationInfo(true)}
          />
        </div>
      </main>

      <CreateRoomDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      <AddPersonDialog
        open={showAddPersonDialog}
        onOpenChange={setShowAddPersonDialog}
        conversation={activeConversation}
        onAddPerson={async (payload) => {
          if (!activeConversationId) {
            return;
          }
          await addPersonToConversation(activeConversationId, payload);
        }}
      />

      <ConversationInfoDialog
        open={showConversationInfo}
        onOpenChange={setShowConversationInfo}
        conversation={activeConversation}
        onRenameConversation={async (title) => {
          if (!activeConversationId) {
            return;
          }
          await renameConversation(activeConversationId, title);
        }}
        onRenameMember={async (userId, nickname) => {
          if (!activeConversationId) {
            return;
          }
          await renameConversationMember(activeConversationId, userId, nickname);
        }}
        onRemoveMember={async (userId) => {
          if (!activeConversationId) {
            return;
          }
          await removeConversationMember(activeConversationId, userId);
        }}
        onDeleteConversation={async () => {
          if (!activeConversationId) {
            return;
          }
          await deleteConversation(activeConversationId);
        }}
      />

      <MessageForwardDialog
        open={Boolean(forwardMessageTarget)}
        onOpenChange={(open) => !open && setForwardMessageTarget(null)}
        message={forwardMessageTarget}
        conversations={conversations}
        currentConversationId={activeConversationId}
        onForward={async (targetConversationId) => {
          if (!forwardMessageTarget) {
            return;
          }
          await forwardMessage(forwardMessageTarget.messageId, targetConversationId);
          setForwardMessageTarget(null);
        }}
      />

      <MessageEditHistoryDialog
        open={showEditHistory}
        onOpenChange={setShowEditHistory}
        edits={editHistory}
      />

      <MessageReactionDialog
        open={showReactionUsers}
        onOpenChange={setShowReactionUsers}
        emoji={reactionEmoji}
        reactions={reactionUsers}
      />
    </div>
  );
}
