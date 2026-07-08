import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Square, Loader2 } from "lucide-react";

interface StopRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isProcessing: boolean;
  formattedDuration: string;
}

export function StopRecordingDialog({
  open,
  onOpenChange,
  onConfirm,
  isProcessing,
  formattedDuration,
}: StopRecordingDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-3xl border-outline-variant/20 bg-white/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="text-left">
          <DialogTitle className="text-xl font-bold text-orange-950 tracking-tight">
            Dừng ghi hình?
          </DialogTitle>
          <DialogDescription className="text-on-surface-variant/80 text-sm leading-relaxed mt-2">
            Bản ghi sẽ được lưu và có sẵn trong danh sách bản ghi của bạn.
          </DialogDescription>
        </DialogHeader>

        {/* Duration info */}
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 rounded-2xl border border-red-100">
          <div className="relative flex items-center justify-center">
            <span className="absolute w-2.5 h-2.5 bg-red-400/40 rounded-full animate-ping" />
            <span className="relative w-2 h-2 bg-red-500 rounded-full" />
          </div>
          <span className="text-sm font-medium text-red-700">
            Thời gian ghi hình:
          </span>
          <span className="text-sm font-mono font-bold text-red-800 tabular-nums">
            {formattedDuration}
          </span>
        </div>

        <DialogFooter className="flex flex-row justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            className="rounded-full px-6 font-bold text-on-surface-variant"
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="rounded-full px-6 font-bold bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all"
          >
            {isProcessing ? (
              <>
                <Loader2 size={16} className="animate-spin mr-2" />
                Đang dừng...
              </>
            ) : (
              <>
                <Square size={14} className="mr-2 fill-current" />
                Dừng ghi hình
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
