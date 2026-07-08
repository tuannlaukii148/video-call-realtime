import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { MessageEditHistoryItem } from "@/services/chatService";

interface MessageEditHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  edits: MessageEditHistoryItem[];
}

export function MessageEditHistoryDialog({
  open,
  onOpenChange,
  edits,
}: MessageEditHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-3xl border-outline-variant/20 bg-surface-container-lowest p-0">
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-on-surface">Lịch sử chỉnh sửa</DialogTitle>
            <DialogDescription>Các cập nhật nội dung gần đây cho tin nhắn này.</DialogDescription>
          </DialogHeader>

          <div className="mt-5 max-h-96 space-y-3 overflow-auto pr-1">
            {edits.map((edit) => (
              <div key={edit.editId} className="rounded-2xl bg-surface-container-high px-4 py-3">
                <p className="text-xs uppercase tracking-[0.14em] text-on-surface-variant">
                  v{edit.fromVersion} đến v{edit.toVersion}
                </p>
                <p className="mt-2 text-sm text-on-surface-variant line-through">{edit.previousContent}</p>
                <p className="mt-2 text-sm text-on-surface">{edit.newContent}</p>
              </div>
            ))}
            {edits.length === 0 ? (
              <p className="text-sm text-on-surface-variant">Không có lịch sử chỉnh sửa.</p>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
