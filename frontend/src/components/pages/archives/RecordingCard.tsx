import { useNavigate } from "react-router";
import { Play, Trash2, Clock, Video, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Recording } from "@/services/recordingService";

interface RecordingCardProps {
  recording: Recording;
  onDelete: (recording: Recording) => void;
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return "--:--";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const STATUS_CONFIG = {
  ready: {
    label: "Ready",
    className: "bg-emerald-100 text-emerald-700 border-emerald-200",
  },
  processing: {
    label: "Processing",
    className: "bg-amber-100 text-amber-700 border-amber-200",
  },
  failed: {
    label: "Failed",
    className: "bg-red-100 text-red-700 border-red-200",
  },
} as const;

export function RecordingCard({ recording, onDelete }: RecordingCardProps) {
  const navigate = useNavigate();
  const isPlayable = recording.status === "ready";
  const statusCfg = STATUS_CONFIG[recording.status] || STATUS_CONFIG.processing;

  const handleClick = () => {
    if (isPlayable) {
      navigate(`/archives/${recording._id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm overflow-hidden transition-all duration-300 ${
        isPlayable
          ? "cursor-pointer hover:shadow-lg hover:scale-[1.02] hover:border-primary/20"
          : "opacity-75 cursor-not-allowed"
      }`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-stone-900 overflow-hidden">
        {recording.thumbnail_url ? (
          <img
            src={recording.thumbnail_url}
            alt={recording.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-stone-800 to-stone-900">
            <Video size={40} className="text-stone-600" />
          </div>
        )}

        {/* Play overlay */}
        {isPlayable && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <div className="w-14 h-14 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-xl transform scale-75 group-hover:scale-100 transition-transform duration-300">
              <Play size={24} className="text-primary ml-1" fill="currentColor" />
            </div>
          </div>
        )}

        {/* Processing spinner overlay */}
        {recording.status === "processing" && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <Loader2 size={32} className="text-white animate-spin" />
          </div>
        )}

        {/* Duration badge */}
        <span className="absolute bottom-2 right-2 bg-black/70 text-white text-[11px] px-2 py-0.5 rounded-md backdrop-blur-sm font-mono font-bold">
          {formatDuration(recording.duration_seconds)}
        </span>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-on-surface text-sm leading-tight line-clamp-2 flex-1">
            {recording.title || "Untitled Recording"}
          </h3>
          <Badge
            variant="outline"
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${statusCfg.className}`}
          >
            {recording.status === "processing" && (
              <Loader2 size={10} className="mr-1 animate-spin" />
            )}
            {statusCfg.label}
          </Badge>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-on-surface-variant/60">
            {recording.room?.room_code && (
              <span className="text-xs font-mono font-bold bg-surface-container px-2 py-0.5 rounded">
                {recording.room.room_code}
              </span>
            )}
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span className="text-xs">{formatDate(recording.recorded_at)}</span>
            </div>
          </div>

          {/* Delete button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(recording);
            }}
            className="p-2 rounded-full text-on-surface-variant/40 hover:text-error hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
            aria-label={`Delete recording ${recording.title}`}
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Owner info */}
        {recording.owner && (
          <p className="text-xs text-on-surface-variant/50 truncate">
            by {recording.owner.full_name}
          </p>
        )}
      </div>
    </div>
  );
}
