import { useState } from "react";
import type { ConversationItem, ChatMessage } from "@/services/chatService";
import type { ComposerState } from "@/hooks/chat/useMessages";
import type { PresenceEntry } from "@/stores/messageStore";
import { ChatHeader } from "./ChatHeader";
import { ChatTabs } from "./ChatTabs";
import { MessageInput } from "./MessageInput";
import { MessageThread } from "./MessageThread";
import { cn } from "@/lib/utils";
import { File, Download, FolderOpen } from "lucide-react";

interface ChatWindowProps {
  conversation: ConversationItem | null;
  messages: ChatMessage[];
  typing: { userId: string; userName: string } | null;
  currentUserId: string | null;
  presenceByUserId: Record<string, PresenceEntry>;
  hasMore: boolean;
  composerState: ComposerState;
  onLoadMore: () => void;
  onSendMessage: (content: string | { type: import("@/services/chatService").MessageType; content?: string; file?: any; stickerId?: string; emoji?: string }) => void | Promise<void>;
  onTypingChange: (typing: boolean) => void;
  onCancelComposerState: () => void;
  onReplyMessage: (message: ChatMessage) => void;
  onEditMessage: (message: ChatMessage) => void;
  onDeleteMessage: (message: ChatMessage, mode: "for_me" | "for_everyone") => void | Promise<void>;
  onForwardMessage: (message: ChatMessage) => void;
  onToggleReaction: (message: ChatMessage, emoji: "like" | "love" | "haha" | "wow" | "sad" | "angry") => void | Promise<void>;
  onShowEditHistory: (message: ChatMessage) => void;
  onShowReactions: (message: ChatMessage, emoji?: "like" | "love" | "haha" | "wow" | "sad" | "angry") => void;
  onOpenAddPerson: () => void;
  onOpenConversationInfo: () => void;
}

export function ChatWindow({
  conversation,
  messages,
  typing,
  currentUserId,
  presenceByUserId,
  hasMore,
  composerState,
  onLoadMore,
  onSendMessage,
  onTypingChange,
  onCancelComposerState,
  onReplyMessage,
  onEditMessage,
  onDeleteMessage,
  onForwardMessage,
  onToggleReaction,
  onShowEditHistory,
  onShowReactions,
  onOpenAddPerson,
  onOpenConversationInfo,
}: ChatWindowProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "files">("chat");

  const fileMessages = messages.filter((msg) => {
    if (msg.type === "file") return true;
    const attachment = (msg as any).attachment;
    if (attachment && typeof attachment === "object" && attachment.url) return true;
    if (typeof msg.content === "string") {
      try {
        const parsed = JSON.parse(msg.content);
        if (parsed && typeof parsed === "object" && parsed.url) return true;
      } catch {
        // ignore
      }
    }
    return false;
  });

  const sharedFiles = fileMessages.map((msg) => {
    const attachment = (msg as any).attachment;
    const parsedAttachment = (() => {
      if (attachment && typeof attachment === "object" && attachment.url) {
        return attachment;
      }
      if (typeof msg.content === "string") {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed && typeof parsed === "object" && parsed.url) {
            return parsed;
          }
        } catch {
          // ignore
        }
      }
      return null;
    })();

    const fileUrl = parsedAttachment?.url || (typeof msg.content === "string" && /^https?:\/\//i.test(msg.content) ? msg.content : null);
    const fileName = parsedAttachment?.filename || parsedAttachment?.name || parsedAttachment?.storedFilename || "Tệp đính kèm";
    const mimeType = parsedAttachment?.mime_type || parsedAttachment?.contentType || "";
    const isImage = Boolean(
      mimeType.startsWith("image/") ||
      (fileUrl && /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(fileUrl)))
    );

    return {
      messageId: msg.messageId,
      senderName: msg.senderName,
      timestamp: msg.timestamp,
      fileUrl,
      fileName,
      mimeType,
      size: parsedAttachment?.size || 0,
      isImage,
    };
  }).filter((file) => file.fileUrl);

  const images = sharedFiles.filter((f) => f.isImage);
  const docs = sharedFiles.filter((f) => !f.isImage);

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-surface-lowest">
      <ChatHeader
        conversation={conversation}
        currentUserId={currentUserId}
        presenceByUserId={presenceByUserId}
        onOpenAddPerson={onOpenAddPerson}
        onOpenConversationInfo={onOpenConversationInfo}
      />
      <ChatTabs activeTab={activeTab} onTabChange={setActiveTab} />
      
      {activeTab === "chat" ? (
        <>
          <MessageThread
            conversationId={conversation?.conversationId || null}
            messages={messages}
            typing={typing}
            currentUserId={currentUserId}
            hasMore={hasMore}
            onLoadMore={onLoadMore}
            onReplyMessage={onReplyMessage}
            onEditMessage={onEditMessage}
            onDeleteMessage={onDeleteMessage}
            onForwardMessage={onForwardMessage}
            onToggleReaction={onToggleReaction}
            onShowEditHistory={onShowEditHistory}
            onShowReactions={onShowReactions}
          />
          <MessageInput
            disabled={!conversation}
            composerState={composerState}
            onSend={onSendMessage}
            onTypingChange={onTypingChange}
            onCancelComposerState={onCancelComposerState}
          />
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-8 bg-surface-lowest">
          <div className="max-w-4xl mx-auto space-y-8">
            {sharedFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant/70 mb-4 shadow-inner animate-in fade-in zoom-in duration-300">
                  <FolderOpen className="size-8" />
                </div>
                <h3 className="text-lg font-bold text-on-surface">Chưa có tệp chia sẻ</h3>
                <p className="text-sm text-on-surface-variant max-w-sm mt-1">
                  Các hình ảnh, tài liệu và tệp tin được gửi trong cuộc hội thoại này sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <>
                {images.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant/80">
                      Hình ảnh & Phương tiện ({images.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {images.map((file) => (
                        <div
                          key={file.messageId}
                          className="group relative aspect-square rounded-2xl overflow-hidden border border-outline-variant/15 bg-surface-container-low hover:shadow-md transition-all duration-200"
                        >
                          <img
                            src={file.fileUrl!}
                            alt={file.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-between p-3">
                            <button
                              type="button"
                              className="self-end p-1.5 rounded-full bg-white/20 hover:bg-white/35 text-white transition-colors"
                              onClick={() => window.open(file.fileUrl!, "_blank")}
                              title="Tải xuống"
                            >
                              <Download className="size-4" />
                            </button>
                            <div className="min-w-0">
                              <p className="text-white text-xs font-semibold truncate">{file.fileName}</p>
                              <p className="text-white/75 text-[10px] truncate">Gửi bởi {file.senderName}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {docs.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-on-surface-variant/80">
                      Tài liệu & Tệp tin ({docs.length})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {docs.map((file) => (
                        <a
                          key={file.messageId}
                          href={file.fileUrl!}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-4 p-4 rounded-2xl border border-outline-variant/35 bg-surface-container-low hover:bg-surface-container-high hover:border-primary/20 transition-all duration-200 group shadow-sm"
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                            <File className="size-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-on-surface group-hover:text-primary transition-colors">
                              {file.fileName}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-on-surface-variant/80 mt-1">
                              <span>{file.size ? `${(file.size / 1024).toFixed(1)} KB` : "Xem tệp"}</span>
                              <span>•</span>
                              <span className="truncate">Gửi bởi {file.senderName}</span>
                            </div>
                          </div>
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-on-surface-variant group-hover:bg-primary/15 group-hover:text-primary transition-all">
                            <Download className="size-4" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
