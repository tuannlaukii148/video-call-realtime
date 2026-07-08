import { Info, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { ConversationItem } from "@/services/chatService";
import type { PresenceEntry } from "@/stores/messageStore";

interface ChatHeaderProps {
  conversation: ConversationItem | null;
  currentUserId: string | null;
  presenceByUserId: Record<string, PresenceEntry>;
  onOpenAddPerson: () => void;
  onOpenConversationInfo: () => void;
}

const getStatusLabel = (
  conversation: ConversationItem | null,
  currentUserId: string | null,
  presenceByUserId: Record<string, PresenceEntry>
) => {
  if (!conversation) {
    return "Chọn một cuộc trò chuyện";
  }

  const onlineParticipants = conversation.participants.filter((participant) => {
    if (participant.id === currentUserId) {
      return true;
    }
    return presenceByUserId[participant.id]?.status === "online";
  });

  if (onlineParticipants.length > 0) {
    return `${onlineParticipants.length} người đang hoạt động`;
  }

  return `${conversation.participantCount} người tham gia`;
};

export function ChatHeader({
  conversation,
  currentUserId,
  presenceByUserId,
  onOpenAddPerson,
  onOpenConversationInfo,
}: ChatHeaderProps) {
  const participants = conversation?.participants || [];
  const canAddPerson = Boolean(
    conversation &&
    (conversation.type === "direct" || conversation.currentUserRole === "owner")
  );

  return (
    <header className="sticky top-0 z-20 flex h-16 md:h-20 shrink-0 items-center justify-between border-b border-outline-variant/30 bg-surface/95 px-4 md:px-8 backdrop-blur-xl">
      <div className="flex items-center gap-4 min-w-0">
        <div className="flex -space-x-3">
          {participants.slice(0, 3).map((participant) => (
            <Avatar
              key={participant.id}
              className="w-10 h-10 rounded-full border-2 border-white object-cover after:hidden"
            >
              <AvatarImage
                src={participant.avatar || undefined}
                alt={participant.fullName}
                referrerPolicy="no-referrer"
                className="w-10 h-10 rounded-full border-2 border-white object-cover"
              />
              <AvatarFallback>{participant.fullName.slice(0, 2)}</AvatarFallback>
            </Avatar>
          ))}
          {conversation && conversation.participantCount > 3 ? (
            <div className="w-10 h-10 rounded-full border-2 border-white bg-surface-container-highest flex items-center justify-center text-[10px] font-bold">
              +{conversation.participantCount - 3}
            </div>
          ) : null}
        </div>
        <div className="min-w-0">
          <h3 className="font-headline-md text-xl text-on-surface truncate">
            {conversation?.title || "Tin nhắn"}
          </h3>
          <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {getStatusLabel(conversation, currentUserId, presenceByUserId)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onOpenAddPerson}
          className="p-2.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant disabled:opacity-40"
          disabled={!canAddPerson}
        >
          <UserPlus className="size-5" />
        </button>
        <button
          type="button"
          onClick={onOpenConversationInfo}
          className="p-2.5 rounded-full hover:bg-surface-container-high transition-colors text-on-surface-variant"
          disabled={!conversation}
        >
          <Info className="size-5" />
        </button>
      </div>
    </header>
  );
}
