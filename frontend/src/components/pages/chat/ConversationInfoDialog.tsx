import { useEffect, useState } from "react";
import { Crown, Trash2, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { ConversationItem } from "@/services/chatService";

interface ConversationInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationItem | null;
  onRenameConversation: (title: string) => Promise<void>;
  onRenameMember: (userId: string, nickname: string | null) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onDeleteConversation: () => Promise<void>;
}

export function ConversationInfoDialog({
  open,
  onOpenChange,
  conversation,
  onRenameConversation,
  onRenameMember,
  onRemoveMember,
  onDeleteConversation,
}: ConversationInfoDialogProps) {
  const [title, setTitle] = useState("");
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open || !conversation) {
      setError(null);
      setPendingKey(null);
      return;
    }

    setTitle(conversation.title);
    setNicknames(
      Object.fromEntries(
        conversation.participants.map((participant) => [participant.id, participant.nickname || ""])
      )
    );
  }, [conversation, open]);

  const canManage = conversation?.type === "group" && conversation.currentUserRole === "owner";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-outline-variant/20 bg-surface-container-lowest p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-on-surface">Chi tiết cuộc trò chuyện</DialogTitle>
            <DialogDescription>
              {canManage ? "Quản lý tên nhóm và thành viên." : "Xem người tham gia nhóm."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-5">
            {conversation?.type === "group" ? (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                  Tên nhóm
                </label>
                <div className="flex gap-2">
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    disabled={!canManage}
                    className="h-11 rounded-2xl bg-surface-container-highest px-4"
                  />
                  {canManage ? (
                    <Button
                      onClick={async () => {
                        try {
                          setError(null);
                          setPendingKey("title");
                          await onRenameConversation(title.trim());
                        } catch (submitError) {
                          setError(submitError instanceof Error ? submitError.message : "Lỗi khi đổi tên nhóm");
                        } finally {
                          setPendingKey(null);
                        }
                      }}
                      disabled={pendingKey === "title" || title.trim().length < 3}
                    >
                      Lưu
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="space-y-3">
              {conversation?.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="rounded-2xl bg-surface-container-high px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-11 w-11 after:hidden">
                      <AvatarImage src={participant.avatar || undefined} alt={participant.fullName} className="rounded-full object-cover" />
                      <AvatarFallback>{participant.fullName.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-on-surface">
                          {participant.nickname || participant.fullName}
                        </p>
                        {participant.role === "owner" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                            <Crown className="size-3" />
                            Chủ sở hữu
                          </span>
                        ) : null}
                      </div>
                      <p className="truncate text-xs text-on-surface-variant">{participant.email}</p>
                    </div>
                  </div>

                  {canManage && participant.role !== "owner" ? (
                    <div className="mt-3 flex items-center gap-2">
                      <Input
                        value={nicknames[participant.id] || ""}
                        onChange={(event) =>
                          setNicknames((current) => ({
                            ...current,
                            [participant.id]: event.target.value,
                          }))
                        }
                        placeholder="Biệt danh"
                        className="h-10 rounded-xl bg-surface-container-highest px-3"
                      />
                      <Button
                        variant="outline"
                        onClick={async () => {
                          try {
                            setError(null);
                            setPendingKey(`nick:${participant.id}`);
                            await onRenameMember(participant.id, (nicknames[participant.id] || "").trim() || null);
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : "Lỗi khi cập nhật biệt danh");
                          } finally {
                            setPendingKey(null);
                          }
                        }}
                        disabled={pendingKey === `nick:${participant.id}`}
                      >
                        Lưu
                      </Button>
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={async () => {
                          const confirmed = window.confirm(`Xóa ${participant.fullName} khỏi nhóm này?`);
                          if (!confirmed) {
                            return;
                          }
                          try {
                            setError(null);
                            setPendingKey(`remove:${participant.id}`);
                            await onRemoveMember(participant.id);
                          } catch (submitError) {
                            setError(submitError instanceof Error ? submitError.message : "Lỗi khi xóa thành viên");
                          } finally {
                            setPendingKey(null);
                          }
                        }}
                        disabled={pendingKey === `remove:${participant.id}`}
                      >
                        <UserMinus className="size-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            {canManage ? (
              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-sm font-semibold text-on-surface">Xóa nhóm</p>
                <p className="mt-1 text-xs text-on-surface-variant">
                  Thao tác này sẽ xóa cuộc trò chuyện nhóm cho tất cả thành viên.
                </p>
                <Button
                  variant="destructive"
                  className="mt-3"
                  onClick={async () => {
                    const confirmed = window.confirm(`Xóa nhóm "${conversation?.title}"?`);
                    if (!confirmed) {
                      return;
                    }
                    try {
                      setError(null);
                      setPendingKey("delete");
                      await onDeleteConversation();
                      onOpenChange(false);
                    } catch (submitError) {
                      setError(submitError instanceof Error ? submitError.message : "Lỗi khi xóa nhóm");
                    } finally {
                      setPendingKey(null);
                    }
                  }}
                  disabled={pendingKey === "delete"}
                >
                  <Trash2 className="size-4" />
                  Xóa nhóm
                </Button>
              </div>
            ) : null}

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>

        <DialogFooter className="rounded-b-3xl">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
