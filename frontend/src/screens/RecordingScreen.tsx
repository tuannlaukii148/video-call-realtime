import { useEffect, useMemo, useRef } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  CalendarClock,
  CirclePlay,
  Download,
  Film,
  Mic,
  Monitor,
  Play,
  Radio,
  RotateCcw,
  Square,
  Timer,
  Video,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { useRecordingStore, type RecordingClip } from "@/stores/recordingStore";

type RecordingLocationState = {
  recording?: RecordingClip;
};

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function formatDate(createdAt: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(createdAt));
}

export function RecordingScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentRecording = useRecordingStore((state) => state.currentRecording);
  const setRecording = useRecordingStore((state) => state.setRecording);

  const locationRecording = (location.state as RecordingLocationState | null)?.recording;
  const recording = locationRecording ?? currentRecording;

  useEffect(() => {
    if (locationRecording) {
      setRecording(locationRecording);
    }
  }, [locationRecording, setRecording]);

  useEffect(() => {
    if (videoRef.current && recording?.url) {
      videoRef.current.src = recording.url;
      videoRef.current.load();
    }
  }, [recording]);

  const fileName = useMemo(() => {
    if (!recording) {
      return "recording.webm";
    }

    return `${recording.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "recording"}.webm`;
  }, [recording]);

  const handleDownload = () => {
    if (!recording) {
      return;
    }

    const link = document.createElement("a");
    link.href = recording.url;
    link.download = fileName;
    link.click();
  };

  const goBackToMeeting = () => {
    if (recording?.roomId) {
      navigate(`/meeting/${recording.roomId}`);
      return;
    }

    navigate("/lobby");
  };

  return (
    <div className="min-h-screen bg-[#0f0b08] text-white overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background: "radial-gradient(circle at top left, rgba(249,115,22,0.24), transparent 36%), radial-gradient(circle at top right, rgba(245,158,11,0.16), transparent 24%), linear-gradient(180deg, rgba(15,11,8,1), rgba(28,18,12,1))",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: 0.15,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-2xl">
          <div>
            <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-100">
              <Radio size={12} />
              Recording Playback
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              {recording?.title ?? "No recording available"}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="rounded-full border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              onClick={goBackToMeeting}
            >
              <ArrowLeft size={16} />
              Back to meeting
            </Button>
            {recording && (
              <Button
                className="rounded-full bg-orange-500 text-white hover:bg-orange-600"
                onClick={handleDownload}
              >
                <Download size={16} />
                Download
              </Button>
            )}
          </div>
        </header>

        {!recording ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-1 items-center justify-center"
          >
            <div className="max-w-xl rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-2xl">
              <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-500/15 text-orange-200">
                <Film size={34} />
              </div>
              <h2 className="text-3xl font-black tracking-tight text-white">Nothing recorded yet</h2>
              <p className="mt-3 text-sm leading-6 text-white/70">
                Start a recording from the meeting screen, then come back here to review the clip.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Button className="rounded-full bg-orange-500 text-white hover:bg-orange-600" onClick={goBackToMeeting}>
                  Return to meeting
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid flex-1 gap-6 lg:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.8fr)]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              className="overflow-hidden rounded-[2rem] border border-white/10 bg-black/35 shadow-2xl backdrop-blur-2xl"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-orange-200/70">
                    Clip Preview
                  </p>
                  <h2 className="text-xl font-bold text-white">Recorded video</h2>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-100">
                  <Play size={14} />
                  Ready to watch
                </div>
              </div>

              <div className="relative aspect-video bg-black">
                <video
                  ref={videoRef}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
                <div className="pointer-events-none absolute inset-x-4 top-4 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-xl">
                    <CirclePlay size={12} />
                    Playback
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/85 backdrop-blur-xl">
                    <Square size={12} />
                    {formatDuration(recording.durationMs)}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.aside
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 }}
              className="flex flex-col gap-4"
            >
              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-200">
                    <Video size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">Recording details</p>
                    <p className="text-xs text-white/55">Stored locally in the browser session</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 text-sm text-white/78">
                  <InfoRow icon={<Timer size={16} />} label="Duration" value={formatDuration(recording.durationMs)} />
                  <InfoRow icon={<CalendarClock size={16} />} label="Captured" value={formatDate(recording.createdAt)} />
                  <InfoRow icon={<Mic size={16} />} label="Audio" value="Included from the meeting stream" />
                  <InfoRow icon={<Monitor size={16} />} label="Source" value={recording.roomId ?? "Current meeting"} />
                </div>
              </section>

              <section className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur-2xl">
                <p className="text-sm font-bold text-white">Actions</p>
                <div className="mt-4 flex flex-col gap-3">
                  <Button className="justify-start rounded-2xl bg-orange-500 text-white hover:bg-orange-600" onClick={handleDownload}>
                    <Download size={16} />
                    Download recording
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start rounded-2xl border-white/15 bg-white/5 text-white hover:bg-white/10 hover:text-white"
                    onClick={goBackToMeeting}
                  >
                    <RotateCcw size={16} />
                    Back to meeting
                  </Button>
                </div>
              </section>
            </motion.aside>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-orange-200">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">{label}</p>
        <p className="truncate text-sm text-white">{value}</p>
      </div>
    </div>
  );
}