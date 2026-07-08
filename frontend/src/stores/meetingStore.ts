import { create } from "zustand";
import { Participant, WaitingUser, ChatMessage } from "@/types";

interface MeetingState {
  roomCode: string | null;
  status: 'idle' | 'waiting' | 'in-room' | 'ended';
  participants: Participant[];
  hostId: string | null;
  memberId: string | null;
  isHost: boolean;
  messages: ChatMessage[];
  waitingList: WaitingUser[];
  screenSharingUserId: string | null;
  selectedFilter: "original" | "warm" | "mono" | "cool" | "golden";
  isRecording: boolean;
  recorderName: string | null;

  setRoomCode: (code: string | null) => void;
  setStatus: (status: 'idle' | 'waiting' | 'in-room' | 'ended') => void;
  setHostId: (id: string | null) => void;
  setIsHost: (v: boolean) => void;
  setMemberId: (id: string | null) => void;
  setIsRecording: (v: boolean) => void;
  setRecorderName: (name: string | null) => void;

  addParticipant: (p: Participant) => void;
  removeParticipant: (userId: string) => void;
  updateParticipantStream: (userId: string, stream: MediaStream) => void;
  updateParticipantMedia: (userId: string, patch: { isAudioMuted?: boolean; isVideoMuted?: boolean }) => void;
  updateParticipantFilter: (userId: string, videoFilter: "original" | "warm" | "mono" | "cool" | "golden") => void;
  updateParticipantScreenStream: (userId: string, stream: MediaStream) => void;
  clearParticipantScreenStream: (userId: string) => void;

  addMessage: (msg: ChatMessage) => void;
  upsertMessage: (msg: ChatMessage) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  prependMessages: (msgs: ChatMessage[]) => void;

  setWaitingList: (list: WaitingUser[]) => void;
  addWaitingUser: (user: WaitingUser) => void;
  removeWaitingUser: (userId: string) => void;

  setScreenSharingUserId: (userId: string | null) => void;
  setSelectedFilter: (key: "original" | "warm" | "mono" | "cool" | "golden") => void;

  reset: () => void;
}

const initialState = {
  roomCode: null,
  status: 'idle' as const,
  participants: [],
  hostId: null,
  isHost: false,
  memberId: null,
  messages: [],
  waitingList: [],
  screenSharingUserId: null,
  selectedFilter: 'original' as const,
  isRecording: false,
  recorderName: null,
};

export const useMeetingStore = create<MeetingState>((set) => ({
  ...initialState,

  setRoomCode: (code) => set({ roomCode: code }),
  setStatus: (status) => set({ status }),
  setHostId: (hostId) => set({ hostId }),
  setIsHost: (v) => set({ isHost: v }),
  setMemberId: (memberId) => set({ memberId }),
  setIsRecording: (isRecording) => set({ isRecording }),
  setRecorderName: (recorderName) => set({ recorderName }),

  addParticipant: (p) => set((state) => {
    // Only add if not exist
    if (!state.participants.find(x => x.id === p.id)) {
      return { participants: [...state.participants, p] };
    }
    return state;
  }),

  setMessages: (msgs) => set({ messages: msgs }),
  prependMessages: (msgs) => set((state) => ({ messages: [...msgs, ...state.messages] })),

  setWaitingList: (list) => set({ waitingList: list }),
  addWaitingUser: (user) => set((state) => {
    if (!state.waitingList.find(u => u.id === user.id)) {
      return { waitingList: [...state.waitingList, user] };
    }
    return state;
  }),

  removeParticipant: (userId) => set((state) => ({
    participants: state.participants.filter(p => p.id !== userId),
    // Clear screen sharing if the user who left was sharing
    screenSharingUserId: state.screenSharingUserId === userId ? null : state.screenSharingUserId,
  })),

  updateParticipantStream: (userId, stream) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === userId ? { ...p, stream } : p
    )
  })),

  updateParticipantMedia: (userId, patch) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === userId ? { ...p, ...patch } : p
    )
  })),

  updateParticipantFilter: (userId, videoFilter) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === userId ? { ...p, videoFilter } : p
    )
  })),

  updateParticipantScreenStream: (userId, screenStream) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === userId ? { ...p, screenStream } : p
    )
  })),

  clearParticipantScreenStream: (userId) => set((state) => ({
    participants: state.participants.map(p =>
      p.id === userId ? { ...p, screenStream: undefined } : p
    )
  })),

  addMessage: (msg) => set((state) => {
    // Deduplicate by id, messageId, or clientId
    const exists = state.messages.some((m) => {
      if (!m) return false;
      if (m.id && msg.id && m.id === msg.id) return true;
      if ((m as any).messageId && (msg as any).messageId && (m as any).messageId === (msg as any).messageId) return true;
      const mc = (m as any).clientId || (m as any).client_id || null;
      const nc = (msg as any).clientId || (msg as any).client_id || null;
      if (mc && nc && mc === nc) return true;
      return false;
    });
    if (exists) return state;

    return { messages: [...state.messages, msg] };
  }),
  upsertMessage: (msg) => set((state) => {
    const incomingId = (msg as any).id || null;
    const incomingMessageId = (msg as any).messageId || (msg as any)._id || null;
    const incomingClientId = (msg as any).clientId || (msg as any).client_id || null;

    const existingIndex = state.messages.findIndex((m) => {
      if (!m) return false;
      const mId = (m as any).id || null;
      const mMessageId = (m as any).messageId || (m as any)._id || null;
      const mClientId = (m as any).clientId || (m as any).client_id || null;

      if (incomingId && mId && incomingId === mId) return true;
      if (incomingMessageId && mMessageId && incomingMessageId === mMessageId) return true;
      if (incomingClientId && mClientId && incomingClientId === mClientId) return true;
      return false;
    });

    if (existingIndex !== -1) {
      const next = [...state.messages];
      const existing = next[existingIndex];
      // Preserve optimistic local id to avoid React key churn
      const preserveId = (existing as any).id && String((existing as any).id).startsWith('local-');
      const merged = { ...existing, ...msg };
      if (preserveId) {
        merged.id = (existing as any).id;
      }
      next[existingIndex] = merged;
      return { messages: next };
    }

    return { messages: [...state.messages, msg] };
  }),

  removeWaitingUser: (userId) => set((state) => ({
    waitingList: state.waitingList.filter(u => u.id !== userId)
  })),

  setScreenSharingUserId: (userId) => set({ screenSharingUserId: userId }),

  setSelectedFilter: (key) => set({ selectedFilter: key }),

  reset: () => set(initialState),
}));
