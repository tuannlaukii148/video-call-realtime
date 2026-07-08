import { Archive } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArchivesEmptyStateProps {
  hasFilters: boolean;
  onClear: () => void;
}

export function ArchivesEmptyState({ hasFilters, onClear }: ArchivesEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center gap-4">
      <div className="w-20 h-20 rounded-3xl bg-surface-container flex items-center justify-center">
        <Archive size={40} className="text-on-surface-variant/30" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-on-surface text-lg">
          {hasFilters ? "No recordings found" : "No recordings yet"}
        </p>
        <p className="text-sm text-on-surface-variant/60 max-w-sm">
          {hasFilters
            ? "Try adjusting your search or filters."
            : "Recordings from your meetings will appear here."}
        </p>
      </div>
      {hasFilters && (
        <Button
          onClick={onClear}
          variant="outline"
          className="mt-2 rounded-full px-6 font-bold"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
