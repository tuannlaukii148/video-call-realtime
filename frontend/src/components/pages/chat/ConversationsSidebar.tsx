import { useEffect, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ConversationItem, UserSearchResult } from "@/services/chatService";
import type { PresenceEntry } from "@/stores/messageStore";

interface ConversationsSidebarProps {
  conversations: ConversationItem[];
  activeConversationId: string | null;
  userSearchResults: UserSearchResult[];
  isSearchingUsers: boolean;
  presenceByUserId: Record<string, PresenceEntry>;
  onSelectConversation: (conversationId: string) => void;
  onSearchUsers: (email: string) => void;
  onStartConversation: (payload: { email?: string; userId?: string }) => unknown;
}

const formatPreviewTime = (timestamp: string | undefined) => {
  if (!timestamp) {
    return "";
  }
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const getConversationPresence = (
  conversation: ConversationItem,
  presenceByUserId: Record<string, PresenceEntry>,
) => {
  if (conversation.type === "group") {
    return conversation.participants.some(
      (participant) => presenceByUserId[participant.id]?.status === "online",
    );
  }

  const directParticipant = conversation.participants[0] || conversation.host;
  return directParticipant
    ? presenceByUserId[directParticipant.id]?.status === "online"
    : false;
};

export function ConversationsSidebar({
  conversations,
  activeConversationId,
  userSearchResults,
  isSearchingUsers,
  presenceByUserId,
  onSelectConversation,
  onSearchUsers,
  onStartConversation,
}: ConversationsSidebarProps) {
  const [query, setQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      onSearchUsers(query);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [onSearchUsers, query]);

  return (
    <section className="w-full h-full bg-surface-container-low border-r border-outline-variant/30 flex flex-col">
      <div className="p-6 border-b border-outline-variant/20">
        <h2 className="font-headline-md text-headline-md text-primary mb-6">
          Tin nhắn
        </h2>
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant size-4" />
          <Input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm qua email..."
            className="w-full pl-10 pr-10 py-3 bg-surface-container-highest rounded-2xl border-none focus:ring-2 focus:ring-primary/20 transition-all font-body-base text-sm h-auto"
          />
          {isSearchingUsers ? (
            <LoaderCircle className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-on-surface-variant" />
          ) : null}
        </div>

        {query.trim() ? (
          <div className="mt-4 space-y-2">
            {userSearchResults.length === 0 && !isSearchingUsers ? (
              <p className="text-xs text-on-surface-variant">Không có người dùng phù hợp.</p>
            ) : null}
            {userSearchResults.map((user) => (
              <button
                key={user.userId}
                type="button"
                onClick={() => {
                  onStartConversation({ userId: user.userId });
                  setQuery("");
                }}
                className="w-full flex items-center gap-3 text-left rounded-xl px-3 py-2 hover:bg-surface-container-high"
              >
                <Avatar className="w-10 h-10 after:hidden">
                  <AvatarImage src={user.avatar || undefined} alt={user.fullName} className="w-10 h-10 rounded-full object-cover" />
                  <AvatarFallback>{user.fullName.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-body-bold truncate">{user.fullName}</p>
                  <p className="text-xs text-on-surface-variant truncate">{user.email}</p>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <ScrollArea className="flex-1 px-3 pb-6">
        <div className="space-y-1 pt-3">
          {conversations.map((conversation) => {
            const primaryParticipant = conversation.participants[0] || conversation.host;
            const isOnline = getConversationPresence(conversation, presenceByUserId);
            const isActive = conversation.conversationId === activeConversationId;

            return (
              <button
                key={conversation.conversationId}
                type="button"
                onClick={() => onSelectConversation(conversation.conversationId)}
                className={cn(
                  "w-full text-left p-3 rounded-xl cursor-pointer transition-all group",
                  isActive ? "bg-primary-container/10 border-l-4 border-primary" : "hover:bg-surface-container-high",
                )}
              >
                <div className="flex gap-3">
                  <div className="relative flex-shrink-0">
                    <Avatar className="w-12 h-12 shadow-sm after:hidden">
                      <AvatarImage
                        src={primaryParticipant?.avatar || undefined}
                        alt={conversation.title}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-full object-cover shadow-sm"
                      />
                      <AvatarFallback>{conversation.title.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white",
                        isOnline ? "bg-green-500" : "bg-gray-400",
                      )}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-0.5 gap-2">
                      <span className={cn("font-body-bold text-sm truncate", isActive ? "text-primary" : "")}>
                        {conversation.title}
                      </span>
                      <span className={cn("text-[10px] font-label-caps shrink-0", isActive ? "text-primary/70" : "text-on-surface-variant")}>
                        {formatPreviewTime(conversation.latestMessage?.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant font-medium truncate">
                      {conversation.latestMessage?.content || conversation.description || "Chưa có tin nhắn nào"}
                    </p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/60 truncate">
                        {conversation.type === "group"
                          ? `${conversation.participantCount} người tham gia`
                          : primaryParticipant?.email || `${conversation.participantCount} người tham gia`}
                      </span>
                      {conversation.unreadCount > 0 ? (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </section>
  );
}
