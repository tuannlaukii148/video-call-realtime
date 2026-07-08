import { create } from "zustand";

export interface RecordingClip {
  id: string;
  title: string;
  roomId: string | null;
  url: string;
  mimeType: string;
  size: number;
  durationMs: number;
  createdAt: string;
}

interface RecordingState {
  currentRecording: RecordingClip | null;
  setRecording: (recording: RecordingClip | null) => void;
  clearRecording: () => void;
}

export const useRecordingStore = create<RecordingState>((set, get) => ({
  currentRecording: null,

  setRecording: (recording) => {
    const currentRecording = get().currentRecording;
    if (currentRecording?.url && currentRecording.url !== recording?.url) {
      URL.revokeObjectURL(currentRecording.url);
    }

    set({ currentRecording: recording });
  },

  clearRecording: () => {
    const currentRecording = get().currentRecording;
    if (currentRecording?.url) {
      URL.revokeObjectURL(currentRecording.url);
    }

    set({ currentRecording: null });
  },
}));