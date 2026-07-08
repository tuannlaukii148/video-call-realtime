import { MessageSquare } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatTime } from "@/utils/dateFormat";
import type { ChatMessage } from "@/services/chatService";

export function ChatBubble({ message }: { message: ChatMessage }) {
  if (message.type === "system") {
    return (
      <div className="flex justify-center">
        <span className="text-[11px] text-on-surface-variant/50 bg-surface-container px-3 py-1 rounded-full italic">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 group">
      <Avatar className="w-7 h-7 shrink-0 mt-0.5">
        <AvatarFallback className="bg-surface-container-high text-on-surface-variant text-[11px] font-bold">
          {message.sender_name?.[0]?.toUpperCase() || "?"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-bold text-on-surface truncate">
            {message.sender_name}
          </span>
          <span className="text-[10px] text-on-surface-variant/40 shrink-0">
            {formatTime(message.timestamp)}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant leading-relaxed break-words mt-0.5">
          {message.content}
        </p>
      </div>
    </div>
  );
}
