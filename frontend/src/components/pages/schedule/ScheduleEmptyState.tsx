import { Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScheduleEmptyStateProps {
  onSchedule: () => void;
}

export function ScheduleEmptyState({ onSchedule }: ScheduleEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center">
        <Calendar size={32} className="text-on-surface-variant/40" />
      </div>
      <div className="space-y-1">
        <p className="font-bold text-on-surface">No meetings this month</p>
        <p className="text-sm text-on-surface-variant/60">
          Schedule a session to see it appear here.
        </p>
      </div>
      <Button
        onClick={onSchedule}
        className="mt-2 h-11 px-6 bg-primary text-white rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all"
      >
        <Plus size={18} className="mr-2" />
        Schedule Meeting
      </Button>
    </div>
  );
}
