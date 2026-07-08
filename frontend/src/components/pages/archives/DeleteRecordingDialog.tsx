import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import type { Recording } from "@/services/recordingService";

interface DeleteRecordingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recording: Recording | null;
  onConfirm: () => void;
  isDeleting: boolean;
}

export function DeleteRecordingDialog({
  open,
  onOpenChange,
  recording,
  onConfirm,
  isDeleting,
}: DeleteRecordingDialogProps) {
  if (!recording) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-2">
            <Trash2 size={24} className="text-error" />
          </div>
          <DialogTitle className="text-center text-lg">Delete Recording</DialogTitle>
          <DialogDescription className="text-center">
            Are you sure you want to delete{" "}
            <span className="font-bold text-on-surface">
              "{recording.title || "Untitled Recording"}"
            </span>
            ? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex gap-3 sm:justify-center pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="rounded-full px-6"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-full px-6"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
