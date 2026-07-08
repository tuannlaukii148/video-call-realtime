import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MessageReactionUser, ReactionEmoji } from "@/services/chatService";

interface MessageReactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  emoji?: ReactionEmoji;
  reactions: MessageReactionUser[];
}

export function MessageReactionDialog({
  open,
  onOpenChange,
  emoji,
  reactions,
}: MessageReactionDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-outline-variant/20 bg-surface-container-lowest p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-on-surface">Cảm xúc</DialogTitle>
            <DialogDescription>
              {emoji ? `Những người đã thả cảm xúc với ${emoji}.` : "Những người đã thả cảm xúc vào tin nhắn này."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 max-h-80 space-y-2 overflow-auto pr-1">
            {reactions.map((reaction) => (
              <div key={reaction.reactionId} className="rounded-2xl bg-surface-container-high px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-on-surface">{reaction.userName}</p>
                  <p className="truncate text-xs text-on-surface-variant">{reaction.userEmail}</p>
                </div>
                <span className="text-lg">{reaction.emoji}</span>
              </div>
            ))}
            {reactions.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Chưa có cảm xúc nào.</p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
