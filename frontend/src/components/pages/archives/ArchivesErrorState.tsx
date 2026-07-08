import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArchivesErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ArchivesErrorState({ message, onRetry }: ArchivesErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
        <Video size={40} className="text-error/40" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-on-surface text-lg">Something went wrong</p>
        <p className="text-sm text-on-surface-variant/60 max-w-sm">{message}</p>
      </div>
      <Button
        onClick={onRetry}
        className="mt-2 rounded-full px-6 font-bold bg-primary text-white"
      >
        Try again
      </Button>
    </div>
  );
}
