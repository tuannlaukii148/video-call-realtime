import { useEffect, useState } from "react";
import { Check, LoaderCircle, Search, UserPlus } from "lucide-react";
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
import { chatService, type ConversationItem, type UserSearchResult } from "@/services/chatService";

interface AddPersonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversation: ConversationItem | null;
  onAddPerson: (payload: { userIds: string[]; title?: string }) => Promise<void>;
}

export function AddPersonDialog({
  open,
  onOpenChange,
  conversation,
  onAddPerson,
}: AddPersonDialogProps) {
  const [query, setQuery] = useState("");
  const [groupTitle, setGroupTitle] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setGroupTitle("");
      setResults([]);
      setSelectedUsers([]);
      setIsSubmitting(false);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const existingIds = new Set(conversation?.participants.map((participant) => participant.id) || []);
    const selectedIds = new Set(selectedUsers.map((user) => user.userId));
    const timer = window.setTimeout(() => {
      const run = async () => {
        if (!query.trim()) {
          setResults([]);
          return;
        }

        setIsSearching(true);
        try {
          const response = await chatService.searchUsers(query.trim());
          setResults(
            response.users.filter((user) => !existingIds.has(user.userId) && !selectedIds.has(user.userId))
          );
        } catch (searchError) {
          console.error("Failed to search users", searchError);
        } finally {
          setIsSearching(false);
        }
      };

      run().catch(() => undefined);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [conversation?.conversationId, conversation?.participants, open, query, selectedUsers]);

  const requiresTitle = conversation?.type === "direct";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-outline-variant/20 bg-surface-container-lowest p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-on-surface">Thêm người</DialogTitle>
            <DialogDescription>
              {requiresTitle
                ? "Chọn một hoặc nhiều người và tạo một nhóm có tên."
                : "Thêm một hoặc nhiều thành viên mới vào nhóm này."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            {requiresTitle ? (
              <div className="space-y-2">
                <label className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                  Tên nhóm
                </label>
                <Input
                  value={groupTitle}
                  onChange={(event) => setGroupTitle(event.target.value)}
                  placeholder="Nhập tên nhóm"
                  className="h-11 rounded-2xl bg-surface-container-highest px-4"
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                Tìm kiếm qua email
              </label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-on-surface-variant" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="name@example.com"
                  className="h-11 rounded-2xl bg-surface-container-highest pl-11 pr-10"
                />
                {isSearching ? (
                  <LoaderCircle className="absolute right-4 top-1/2 size-4 -translate-y-1/2 animate-spin text-on-surface-variant" />
                ) : null}
              </div>
            </div>

            <div className="max-h-72 space-y-2 overflow-y-auto">
              {selectedUsers.length > 0 ? (
                <div className="rounded-2xl bg-surface-container-high px-4 py-3">
                  <p className="mb-3 text-xs font-medium uppercase tracking-[0.14em] text-on-surface-variant">
                    Đã chọn
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUsers.map((user) => (
                      <button
                        key={user.userId}
                        type="button"
                        onClick={() => {
                          setSelectedUsers((current) => current.filter((entry) => entry.userId !== user.userId));
                          setResults((current) => [user, ...current]);
                        }}
                        className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary"
                      >
                        {user.fullName}
                        <span className="text-sm leading-none">x</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {!query.trim() ? (
                <p className="rounded-2xl bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">
                  Tìm kiếm người dùng để thêm.
                </p>
              ) : null}
              {query.trim() && !isSearching && results.length === 0 ? (
                <p className="rounded-2xl bg-surface-container-high px-4 py-3 text-sm text-on-surface-variant">
                  Không tìm thấy người dùng phù hợp.
                </p>
              ) : null}
              {results.map((user) => (
                <button
                  key={user.userId}
                  type="button"
                  onClick={() => {
                    setSelectedUsers((current) => [...current, user]);
                    setResults((current) => current.filter((entry) => entry.userId !== user.userId));
                  }}
                  className="flex w-full items-center gap-3 rounded-2xl bg-surface-container-high px-3 py-3 text-left transition-colors hover:bg-surface-container-highest"
                >
                  <Avatar className="h-11 w-11 after:hidden">
                    <AvatarImage src={user.avatar || undefined} alt={user.fullName} className="rounded-full object-cover" />
                    <AvatarFallback>{user.fullName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-on-surface">{user.fullName}</p>
                    <p className="truncate text-xs text-on-surface-variant">{user.email}</p>
                  </div>
                  <span className="inline-flex h-9 min-w-9 items-center justify-center rounded-full bg-primary px-3 text-xs font-semibold text-white">
                    <UserPlus className="size-4" />
                  </span>
                </button>
              ))}
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>
        </div>
        <DialogFooter className="rounded-b-3xl">
          <Button
            onClick={async () => {
              try {
                setError(null);
                if (requiresTitle && groupTitle.trim().length < 3) {
                  setError("Tên nhóm phải có ít nhất 3 ký tự.");
                  return;
                }
                if (selectedUsers.length === 0) {
                  setError("Chọn ít nhất một người.");
                  return;
                }
                setIsSubmitting(true);
                await onAddPerson({
                  userIds: selectedUsers.map((user) => user.userId),
                  title: requiresTitle ? groupTitle.trim() : undefined,
                });
                onOpenChange(false);
              } catch (submitError) {
                setError(submitError instanceof Error ? submitError.message : "Lỗi khi thêm người");
              } finally {
                setIsSubmitting(false);
              }
            }}
            disabled={isSubmitting || selectedUsers.length === 0}
          >
            {isSubmitting ? <LoaderCircle className="size-4 animate-spin" /> : <Check className="size-4" />}
            Thêm {selectedUsers.length > 0 ? selectedUsers.length : ""} người
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
