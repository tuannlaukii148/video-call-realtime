import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  Send,
  X,
  Info,
  Paperclip,
  Smile,
  CornerUpLeft,
  Pencil,
  Trash2,
  Undo
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMeetingStore } from "@/stores/meetingStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { chatService } from "@/services/chatService";
import EmojiPicker from "@/components/ui/EmojiPicker";
import type { ChatMessage } from "@/types";

interface ChatPanelProps {
  roomCode: string;
  onClose: () => void;
  sendMessage: (content: string | any) => void;
  editMessage: (messageId: string, content: string, expectedVersion: number) => void;
  deleteMessage: (messageId: string, expectedVersion: number) => void;
  addReaction: (messageId: string, emoji: string) => void;
  removeReaction: (messageId: string, emoji: string) => void;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

export function ChatPanel({
  roomCode,
  onClose,
  sendMessage,
  editMessage,
  deleteMessage,
  addReaction,
  removeReaction,
}: ChatPanelProps) {
  const myUserId = useAuthStore((s) => s.user?._id);
  const isHost = useMeetingStore((s) => s.isHost);
  const messages = useMeetingStore((s) => s.messages);

  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [activeReactionMenu, setActiveReactionMenu] = useState<string | null>(null);

  const [pendingAttachment, setPendingAttachment] = useState<{
    filename: string;
    size: number;
    mimeType: string;
    previewUrl: string;
    uploading: boolean;
    error?: string | null;
    file?: {
      url: string;
      filename: string;
      storedFilename?: string;
      mime_type?: string;
      size?: number;
    };
  } | null>(null);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      isNearBottomRef.current = entry.isIntersecting;
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isNearBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment?.previewUrl]);

  const clearPendingAttachment = () => {
    setPendingAttachment((current) => {
      if (current?.previewUrl) {
        URL.revokeObjectURL(current.previewUrl);
      }
      return null;
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSend = () => {
    if (editingMessage) {
      if (!input.trim()) return;
      editMessage(editingMessage.id, input.trim(), editingMessage.version || 1);
      setEditingMessage(null);
      setInput("");
      return;
    }

    if (pendingAttachment) {
      if (pendingAttachment.uploading || pendingAttachment.error || !pendingAttachment.file) return;

      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const payload: any = {
        type: "file",
        content: pendingAttachment.file.filename || pendingAttachment.file.url || '',
        attachment: pendingAttachment.file,
        clientId,
      };

      if (replyingTo) {
        payload.replyToMessageId = replyingTo.id;
        payload.replyTo = {
          messageId: replyingTo.id,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type || 'text',
          timestamp: replyingTo.timestamp,
        };
      }

      sendMessage(payload);
      clearPendingAttachment();
      setReplyingTo(null);
      setInput("");
      isNearBottomRef.current = true;
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
      return;
    }

    if (!input.trim()) return;

    if (replyingTo) {
      const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      sendMessage({
        type: "text",
        content: input.trim(),
        clientId,
        replyToMessageId: replyingTo.id,
        replyTo: {
          messageId: replyingTo.id,
          senderId: replyingTo.senderId,
          senderName: replyingTo.senderName,
          content: replyingTo.content,
          type: replyingTo.type || 'text',
          timestamp: replyingTo.timestamp,
        },
      });
      setReplyingTo(null);
    } else {
      sendMessage(input);
    }

    setInput("");
    isNearBottomRef.current = true;
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const startEdit = (msg: ChatMessage) => {
    setReplyingTo(null);
    setEditingMessage(msg);
    setInput(msg.content);
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInput("");
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  return (
    <motion.aside
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="fixed inset-y-0 right-0 md:relative w-full md:w-96 flex flex-col bg-surface-container-low md:rounded-[2rem] shadow-2xl md:shadow-sm overflow-hidden border-l md:border border-outline-variant/10 z-[120] pointer-events-auto h-full"
    >
      {/* Header */}
      <div className="p-6 bg-surface-container-high flex justify-between items-center border-b border-outline-variant/10">
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-on-surface">Chat Meeting</h3>
          {messages.length > 0 && (
            <span className="text-[10px] font-bold text-on-surface-variant/50 bg-surface-container px-2 py-0.5 rounded-full">
              {messages.length}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-on-surface-variant hover:text-primary transition-colors" aria-label="Close chat">
          <X size={20} />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <ScrollArea className="h-[calc(100vh-24rem)]">
        <div className="p-4 h-full px-6 py-4 flex flex-col gap-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <MessageSquare size={24} className="text-on-surface-variant/30 mb-2" />
              <p className="text-xs text-on-surface-variant/40">Chưa có tin nhắn nào</p>
              <p className="text-[10px] text-on-surface-variant/30 mt-1">Gửi tin nhắn để bắt đầu cuộc trò chuyện</p>
            </div>
          ) : (
            messages.map((msg) => {
              if (msg.type === "system") return <SystemMessage key={msg.id} content={msg.content} />;
              const isSelf = msg.senderId === myUserId;
              const canDelete = isSelf || isHost;
              const isDeleted = Boolean(msg.deletedForEveryoneAt);

              return (
                <div key={msg.id} className="group relative flex flex-col">
                  {/* Hover action menu */}
                  {!isDeleted && (
                    <div className="absolute top-[-10px] right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex items-center bg-white/95 border border-outline-variant/20 rounded-full shadow-md px-1.5 py-0.5 gap-1.5">
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="text-on-surface-variant/70 hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors"
                        title="Reply"
                      >
                        <CornerUpLeft size={13} />
                      </button>

                      <div className="relative">
                        <button
                          onClick={() => setActiveReactionMenu(activeReactionMenu === msg.id ? null : msg.id)}
                          className="text-on-surface-variant/70 hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors"
                          title="React"
                        >
                          <Smile size={13} />
                        </button>
                        {activeReactionMenu === msg.id && (
                          <div className="absolute bottom-6 right-[-20px] bg-white border border-outline-variant/20 rounded-full shadow-xl px-2 py-1 flex items-center gap-1.5 z-30">
                            {QUICK_REACTIONS.map((emoji) => (
                              <button
                                key={emoji}
                                onClick={() => {
                                  const alreadyReacted = msg.myReactions?.includes(emoji);
                                  if (alreadyReacted) {
                                    removeReaction(msg.id, emoji);
                                  } else {
                                    addReaction(msg.id, emoji);
                                  }
                                  setActiveReactionMenu(null);
                                }}
                                className={cn(
                                  "hover:scale-125 transition-transform text-base",
                                  msg.myReactions?.includes(emoji) && "bg-primary/10 rounded-md px-0.5"
                                )}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {isSelf && (
                        <button
                          onClick={() => startEdit(msg)}
                          className="text-on-surface-variant/70 hover:text-primary p-1 rounded-full hover:bg-surface-container transition-colors"
                          title="Edit"
                        >
                          <Pencil size={13} />
                        </button>
                      )}

                      {canDelete && (
                        <button
                          onClick={() => deleteMessage(msg.id, msg.version || 1)}
                          className="text-error/70 hover:text-error p-1 rounded-full hover:bg-error/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  )}

                  <ChatBubble
                    name={msg.senderName}
                    time={new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    message={msg.content}
                    type={msg.type}
                    attachment={msg.attachment}
                    isSelf={isSelf}
                    isEdited={msg.isEdited}
                    replyTo={msg.replyTo}
                    reactionCounts={msg.reactionCounts}
                    myReactions={msg.myReactions}
                    isDeleted={isDeleted}
                    onReactionClick={(emoji) => {
                      const alreadyReacted = msg.myReactions?.includes(emoji);
                      if (alreadyReacted) {
                        removeReaction(msg.id, emoji);
                      } else {
                        addReaction(msg.id, emoji);
                      }
                    }}
                  />
                </div>
              );
            })
          )}
          <div ref={bottomRef} className="h-8 shrink-0" />
        </div>
      </ScrollArea>

      {/* Input composer area */}
      <div className="p-4 bg-surface-container-low border-t border-outline-variant/10 flex flex-col gap-2">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="bg-surface-container p-2.5 rounded-2xl border border-outline-variant/10 flex items-start justify-between gap-2 text-xs">
            <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
              <span className="font-bold text-primary block truncate">Đang trả lời {replyingTo.senderName}</span>
              <span className="text-on-surface-variant/70 block truncate text-[11px]">
                {replyingTo.type === 'file' ? '[File]' : replyingTo.content}
              </span>
            </div>
            <button onClick={cancelReply} className="text-on-surface-variant/60 hover:text-primary transition-colors shrink-0">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Edit Preview */}
        {editingMessage && (
          <div className="bg-primary/5 p-2.5 rounded-2xl border border-primary/20 flex items-start justify-between gap-2 text-xs">
            <div className="flex-1 min-w-0 border-l-2 border-primary pl-2">
              <span className="font-bold text-primary block">Đang chỉnh sửa tin nhắn</span>
              <span className="text-on-surface-variant/70 block truncate text-[11px] mt-0.5">
                {editingMessage.content}
              </span>
            </div>
            <button onClick={cancelEdit} className="text-on-surface-variant/60 hover:text-primary transition-colors shrink-0">
              <Undo size={14} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Paperclip + Emoji toggle */}
          <div className="flex items-center gap-2 mr-1">
            {!editingMessage && (
              <label onClick={() => { try { fileInputRef.current?.click(); } catch (e) {} }} className="relative w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant/60 bg-surface-container-highest cursor-pointer overflow-hidden pointer-events-auto">
                <Paperclip size={16} />
                <input
                  ref={fileInputRef}
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer pointer-events-auto"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    const previewUrl = URL.createObjectURL(f);
                    setPendingAttachment({
                      filename: f.name,
                      size: f.size,
                      mimeType: f.type || 'application/octet-stream',
                      previewUrl,
                      uploading: true,
                      error: null,
                    });

                    const form = new FormData();
                    form.append('file', f);
                    try {
                      const res = await chatService.uploadChatFile(form);
                      const file = res.file;
                      setPendingAttachment((current) => current ? ({
                        ...current,
                        uploading: false,
                        file,
                      }) : null);
                    } catch (err: any) {
                      console.error('Upload failed', err);
                      setPendingAttachment((current) => current ? ({
                        ...current,
                        uploading: false,
                        error: 'Upload failed',
                      }) : null);
                    } finally {
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                />
              </label>
            )}

            <button onClick={() => setShowEmojiPicker((s) => !s)} className="w-9 h-9 rounded-xl flex items-center justify-center text-on-surface-variant/60 bg-surface-container-highest pointer-events-auto" aria-label="Emoji picker">
              <Smile size={16} />
            </button>
          </div>

          {/* Composer Input & File attachment UI */}
          <div className="relative flex-1">
            {showEmojiPicker && (
              <div className="absolute bottom-14 left-0 z-50">
                <EmojiPicker
                  onSelect={(emo) => {
                    if (editingMessage) {
                      setInput((prev) => prev + emo);
                    } else {
                      sendMessage({ type: 'emoji', content: emo, emoji: emo });
                    }
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}

            {pendingAttachment && (
              <div className="mb-2 p-3 bg-surface-container rounded-lg border border-outline-variant/10 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-14 h-14 rounded-xl bg-surface-container-highest overflow-hidden shrink-0 border border-outline-variant/10 flex items-center justify-center">
                    {pendingAttachment.mimeType.startsWith('image/') ? (
                      <img src={pendingAttachment.previewUrl} alt={pendingAttachment.filename} className="w-full h-full object-cover" />
                    ) : (
                      <Paperclip size={16} className="text-on-surface-variant/60" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-on-surface">{pendingAttachment.filename}</div>
                    <div className="text-xs text-on-surface-variant/60">
                      {pendingAttachment.size} bytes
                    </div>
                    <div className="mt-1 text-xs">
                      {pendingAttachment.error ? (
                        <span className="text-error font-medium">{pendingAttachment.error}</span>
                      ) : pendingAttachment.uploading ? (
                        <span>Đang tải lên...</span>
                      ) : (
                        <span>Sẵn sàng gửi</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button type="button" className="px-3 py-1.5 rounded-lg bg-surface-container-highest text-sm" onClick={clearPendingAttachment}>Hủy</button>
                  <button
                    type="button"
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm flex items-center gap-2",
                      pendingAttachment.uploading || Boolean(pendingAttachment.error) || !pendingAttachment.file
                        ? "bg-surface-container-highest text-on-surface-variant/40 cursor-not-allowed"
                        : "bg-primary text-white hover:bg-primary/90",
                    )}
                    onClick={handleSend}
                    disabled={pendingAttachment.uploading || Boolean(pendingAttachment.error) || !pendingAttachment.file}
                  >
                    <Send size={14} />
                    Gửi tệp
                  </button>
                </div>
              </div>
            )}

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              className={cn(
                "flex-1 min-h-[44px] max-h-[120px] w-full resize-none bg-surface-container-highest",
                "border-none rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 focus:outline-none",
                "placeholder:text-on-surface-variant/40"
              )}
              placeholder={editingMessage ? "Chỉnh sửa tin nhắn..." : "Gửi tin nhắn..."}
              aria-label="Chat message input"
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!input.trim() && !pendingAttachment}
            className={cn(
              "shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all",
              (input.trim() || pendingAttachment)
                ? "bg-primary text-white shadow-sm hover:bg-primary/90 active:scale-95"
                : "bg-surface-container-highest text-on-surface-variant/30 cursor-not-allowed"
            )}
            aria-label="Send message"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

/* ====================== Sub-components ====================== */

interface ChatBubbleProps {
  name: string;
  time: string;
  message: string;
  type?: string;
  attachment?: any;
  isSelf?: boolean;
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: any;
  reactionCounts?: Array<{ emoji: string; count: number }>;
  myReactions?: string[];
  onReactionClick: (emoji: string) => void;
}

function ChatBubble({
  name,
  time,
  message,
  type,
  attachment,
  isSelf = false,
  isEdited = false,
  isDeleted = false,
  replyTo,
  reactionCounts = [],
  myReactions = [],
  onReactionClick,
}: ChatBubbleProps) {
  const parsedAttachment = (() => {
    const candidate = attachment && typeof attachment === "object" ? attachment : null;
    if (candidate) return candidate;

    if (typeof message === "string") {
      try {
        const parsed = JSON.parse(message);
        if (parsed && typeof parsed === 'object') {
          return parsed;
        }
      } catch {
        // not JSON, ignore
      }
    }
    return null;
  })();

  const looksLikeFileUrl = typeof message === "string" && /^https?:\/\//i.test(message);
  const fileUrl = parsedAttachment?.url || (looksLikeFileUrl ? message : null);
  const fileLabel = parsedAttachment?.filename || parsedAttachment?.name || parsedAttachment?.storedFilename || (looksLikeFileUrl ? message.split("/").pop() || message : message);
  const isImage = Boolean(
    parsedAttachment?.mime_type?.startsWith("image/") ||
      (fileUrl && /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i.test(String(fileUrl)))
  );

  return (
    <div className={cn("flex flex-col gap-1 w-full max-w-[240px]", isSelf ? "self-end items-end" : "self-start items-start")}>
      {/* Sender name & time */}
      <div className="flex justify-between w-full items-end px-1">
        {!isSelf && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">
            {name}
          </span>
        )}
        <span className="text-[10px] text-on-surface-variant/40 uppercase tracking-widest ml-auto">
          {time}
        </span>
        {isSelf && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary ml-1.5">
            Bạn
          </span>
        )}
      </div>

      {/* Reply Snapshot quote */}
      {replyTo && !isDeleted && (
        <div className={cn(
          "px-2.5 py-1.5 rounded-2xl text-[11px] border border-outline-variant/10 w-full mb-0.5 truncate bg-surface-container-highest/60 opacity-80",
          isSelf ? "rounded-br-none text-right" : "rounded-bl-none text-left"
        )}>
          <span className="font-semibold text-primary block">Đang trả lời {replyTo.senderName}</span>
          <span className="truncate block mt-0.5">
            {replyTo.type === 'file' ? '[File]' : replyTo.content}
          </span>
        </div>
      )}

      {/* Main message bubble content */}
      <div
        className={cn(
          "p-4 rounded-3xl text-sm shadow-sm border w-full break-words whitespace-pre-wrap relative",
          isDeleted
            ? "bg-surface-container-high/60 text-on-surface-variant/50 border-outline-variant/10 rounded-2xl italic"
            : isSelf
              ? "bg-primary text-white rounded-tr-none border-primary"
              : "bg-white text-on-surface rounded-tl-none border-outline-variant/10",
        )}
      >
        {isDeleted ? (
          <span>Tin nhắn này đã bị xóa</span>
        ) : (
          (() => {
            if (type === 'emoji') {
              return <span className="text-2xl leading-none">{message}</span>;
            }

            if (type === 'file' || parsedAttachment || looksLikeFileUrl) {
              const caption = (typeof message === 'string' && message.trim() && message.trim() !== fileLabel) ? message.trim() : null;
              return (
                <div className="flex flex-col gap-2">
                  {isImage && fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="block max-w-full overflow-hidden rounded-xl">
                      <img src={fileUrl} alt={fileLabel} className="max-h-36 w-full object-cover border border-white/20 hover:scale-[1.02] transition-transform" />
                    </a>
                  ) : null}

                  {caption && (
                    <div className="text-sm leading-snug break-words">{caption}</div>
                  )}

                  {fileUrl ? (
                    <a href={fileUrl} target="_blank" rel="noreferrer" className="underline break-all font-medium hover:text-white/95">
                      {fileLabel}
                    </a>
                  ) : (
                    <div className="font-medium break-all">{fileLabel || 'Tệp đính kèm'}</div>
                  )}
                </div>
              );
            }

            if (typeof message === "string") {
              try {
                const parsed = JSON.parse(message);
                if (parsed && typeof parsed === "object" && parsed.url) {
                  return (
                    <a href={parsed.url} target="_blank" rel="noreferrer" className="underline break-all">
                      {parsed.filename || parsed.name || parsed.storedFilename || parsed.url}
                    </a>
                  );
                }
              } catch {
                // ignore
              }
              return message.trim();
            }
            return "";
          })()
        )}

        {/* Edited indicator */}
        {isEdited && !isDeleted && (
          <span className={cn(
            "text-[9px] block mt-1 select-none",
            isSelf ? "text-white/60 text-right" : "text-on-surface-variant/40 text-left"
          )}>
            (đã chỉnh sửa)
          </span>
        )}
      </div>

      {/* Emoji reactions badge list */}
      {!isDeleted && reactionCounts.length > 0 && (
        <div className={cn("flex flex-wrap gap-1 mt-1", isSelf ? "justify-end" : "justify-start")}>
          {reactionCounts.map((entry) => {
            const hasReacted = myReactions.includes(entry.emoji);
            return (
              <button
                key={entry.emoji}
                onClick={() => onReactionClick(entry.emoji)}
                className={cn(
                  "flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-all hover:scale-105 active:scale-95 shadow-sm",
                  hasReacted
                    ? "bg-primary/10 text-primary border-primary/20 font-semibold"
                    : "bg-surface-container text-on-surface border-outline-variant/15"
                )}
              >
                <span>{entry.emoji}</span>
                <span>{entry.count}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SystemMessage({ content }: { content: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-2">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container rounded-full">
        <Info size={12} className="text-on-surface-variant/50 shrink-0" />
        <span className="text-[11px] text-on-surface-variant/60 font-medium">
          {content}
        </span>
      </div>
    </div>
  );
}
