import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  Copy,
  Check,
  ShieldCheck,
  Users,
  Video,
  LogIn,
} from "lucide-react";
import { toast } from "sonner";
import type { ScheduledMeeting } from "@/types";

interface MeetingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meeting: ScheduledMeeting | null;
}

export function MeetingDetailDialog({
  open,
  onOpenChange,
  meeting,
}: MeetingDetailDialogProps) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [timeDiffMinutes, setTimeDiffMinutes] = useState<number | null>(null);

  useEffect(() => {
    if (!meeting?.started_at) return;

    const calc = () => {
      const diff = (new Date(meeting.started_at!).getTime() - Date.now()) / 60000;
      setTimeDiffMinutes(diff);
    };

    calc();
    const id = setInterval(calc, 30000);
    return () => clearInterval(id);
  }, [meeting?.started_at]);

  if (!meeting) return null;

  const isActive = meeting.status === "active" || meeting.status === "waiting";
  const isTooEarly = timeDiffMinutes !== null && timeDiffMinutes > 15;
  const canJoin = isActive || (timeDiffMinutes !== null && timeDiffMinutes <= 15 && timeDiffMinutes > -60);
  const startsSoon = timeDiffMinutes !== null && timeDiffMinutes > 0 && timeDiffMinutes <= 15;

  const hostName =
    typeof meeting.host_id === "object"
      ? meeting.host_id.full_name
      : "Host";

  const dateStr = meeting.started_at
    ? new Date(meeting.started_at).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "—";

  const timeStr = meeting.started_at
    ? new Date(meeting.started_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(meeting.room_code);
    setCopied(true);
    toast.success("Room code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = () => {
    onOpenChange(false);
    navigate(`/lobby?code=${meeting.room_code}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-surface-container-lowest rounded-3xl border-outline-variant/10 p-0 overflow-hidden">
        {/* Header stripe */}
        <div
          className={`p-8 ${
            isActive
              ? "bg-gradient-to-br from-primary to-primary-container"
              : "bg-gradient-to-br from-indigo-600 to-blue-700"
          } text-white`}
        >
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <DialogTitle className="text-xl font-extrabold tracking-tight text-white leading-tight">
                  {meeting.title}
                </DialogTitle>
                <p className="text-white/70 text-sm">{hostName}</p>
              </div>
              {isActive && (
                <Badge className="bg-white/20 text-white border-none text-xs font-bold uppercase tracking-widest shrink-0">
                  Live
                </Badge>
              )}
              {startsSoon && !isActive && (
                <Badge className="bg-white/20 text-white border-none text-xs font-bold uppercase tracking-widest shrink-0">
                  Soon
                </Badge>
              )}
            </div>
          </DialogHeader>
        </div>

        <div className="p-8 space-y-6">
          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-on-surface-variant">
              <Calendar size={18} className="text-primary shrink-0" />
              <span className="text-sm font-medium">{dateStr}</span>
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant">
              <Clock size={18} className="text-primary shrink-0" />
              <span className="text-sm font-medium">{timeStr}</span>
              {timeDiffMinutes !== null && timeDiffMinutes > 0 && timeDiffMinutes <= 60 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-md font-bold">
                  Starts in {Math.ceil(timeDiffMinutes)}m
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 text-on-surface-variant">
              <Users size={18} className="text-primary shrink-0" />
              <span className="text-sm font-medium">
                Max {meeting.settings?.max_participants ?? 100} participants
              </span>
            </div>
            {meeting.settings?.require_approval && (
              <div className="flex items-center gap-3 text-on-surface-variant">
                <ShieldCheck size={18} className="text-blue-500 shrink-0" />
                <span className="text-sm font-medium">Requires host approval</span>
              </div>
            )}
          </div>

          {/* Description */}
          {meeting.description && (
            <p className="text-sm text-on-surface-variant bg-surface-container rounded-2xl px-4 py-3 leading-relaxed">
              {meeting.description}
            </p>
          )}

          {/* Room code */}
          <div className="flex items-center justify-between bg-surface-container rounded-2xl px-5 py-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 mb-1">
                Room Code
              </p>
              <span className="font-mono text-lg font-extrabold text-on-surface tracking-wider">
                {meeting.room_code}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 rounded-xl hover:bg-surface-container-high transition-colors text-on-surface-variant"
            >
              {copied ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
            </button>
          </div>

          {/* Join button */}
          <Button
            onClick={handleJoin}
            disabled={!canJoin || isTooEarly}
            className={`w-full h-14 rounded-full font-bold text-base transition-all active:scale-95 flex items-center justify-center gap-2 ${
              canJoin && !isTooEarly
                ? "bg-primary text-white hover:shadow-lg shadow-primary/20 hover:scale-[1.02]"
                : "bg-surface-container text-on-surface-variant opacity-50 cursor-not-allowed"
            }`}
          >
            {isTooEarly ? (
              <>
                <Clock size={20} />
                Starts in {Math.ceil(timeDiffMinutes!)}m
              </>
            ) : (
              <>
                <LogIn size={20} />
                Join Meeting
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
