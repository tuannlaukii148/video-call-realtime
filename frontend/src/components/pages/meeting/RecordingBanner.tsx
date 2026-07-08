import { AnimatePresence, motion } from "motion/react";

interface RecordingBannerProps {
  isRecording: boolean;
  formattedDuration: string;
}

export function RecordingBanner({
  isRecording,
  formattedDuration,
}: RecordingBannerProps) {
  return (
    <AnimatePresence>
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 rounded-full border border-red-200"
        >
          {/* Pulsing red dot */}
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
          </span>

          {/* Duration */}
          <span className="text-xs font-bold font-mono text-red-700 tabular-nums tracking-tight">
            {formattedDuration}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
