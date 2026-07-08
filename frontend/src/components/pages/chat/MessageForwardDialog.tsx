import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ChatMessage, ConversationItem } from "@/services/chatService";

interface MessageForwardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage | null;
  conversations: ConversationItem[];
  currentConversationId: string | null;
  onForward: (targetConversationId: string) => Promise<void>;
}

export function MessageForwardDialog({
  open,
  onOpenChange,
  message,
  conversations,
  currentConversationId,
  onForward,
}: MessageForwardDialogProps) {
  const [query, setQuery] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);

  const filtered = useMemo(
    () =>
      conversations.filter((conversation) => {
        if (conversation.conversationId === currentConversationId) {
          return false;
        }
        const haystack = `${conversation.title} ${conversation.description}`.toLowerCase();
        return haystack.includes(query.trim().toLowerCase());
      }),
    [conversations, currentConversationId, query]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-outline-variant/20 bg-surface-container-lowest p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-on-surface">Chuyển tiếp tin nhắn</DialogTitle>
            <DialogDescription className="truncate">
              {message?.content || "Chọn nơi gửi tin nhắn này."}
            </DialogDescription>
          </DialogHeader>

          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm kiếm cuộc trò chuyện"
            className="mt-4 h-11 rounded-2xl bg-surface-container-highest px-4"
          />

          <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
            {filtered.map((conversation) => (
              <button
                key={conversation.conversationId}
                type="button"
                onClick={async () => {
                  try {
                    setPendingId(conversation.conversationId);
                    await onForward(conversation.conversationId);
                    onOpenChange(false);
                  } finally {
                    setPendingId(null);
                  }
                }}
                disabled={pendingId === conversation.conversationId}
                className="w-full rounded-2xl bg-surface-container-high px-4 py-3 text-left hover:bg-surface-container-highest disabled:opacity-60"
              >
                <p className="truncate text-sm font-semibold text-on-surface">{conversation.title}</p>
                <p className="mt-1 truncate text-xs text-on-surface-variant">{conversation.description || `${conversation.participantCount} người tham gia`}</p>
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="mt-4 text-sm text-on-surface-variant">Không có cuộc trò chuyện phù hợp.</p>
          ) : null}

          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
