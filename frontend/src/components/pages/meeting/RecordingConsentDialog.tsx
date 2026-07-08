import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Video } from "lucide-react";

interface RecordingConsentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordingConsentDialog({
  open,
  onOpenChange,
}: RecordingConsentDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm rounded-3xl border-outline-variant/20 bg-white/95 backdrop-blur-xl shadow-2xl">
        <DialogHeader className="flex flex-col items-center text-center pt-2">
          {/* Icon */}
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <Video size={28} className="text-red-600" />
          </div>

          <DialogTitle className="text-xl font-bold text-orange-950 tracking-tight">
            Meeting này đang được ghi hình
          </DialogTitle>

          <DialogDescription className="text-on-surface-variant/80 text-sm leading-relaxed mt-3 max-w-[280px]">
            Bằng việc tiếp tục ở lại Meeting này, bạn đồng ý với việc bị ghi hình. Host đã bắt đầu ghi hình phiên này.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center pt-2 pb-1">
          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-full px-10 h-11 font-bold bg-gradient-to-r from-primary to-primary-container text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            Đã hiểu
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
