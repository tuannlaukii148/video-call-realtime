import api from "@/lib/axios";

export interface Recording {
  _id: string;
  room_id: string;
  owner_id: string;
  title: string;
  description?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  mime_type: string;
  size_bytes: number;
  duration_seconds?: number | null;
  status: "processing" | "ready" | "failed";
  recorded_at: string;
  created_at: string;
  room?: {
    _id: string;
    room_code: string;
    title: string;
    status: string;
  } | null;
  owner?: {
    _id: string;
    full_name: string;
    avatar?: string;
    email?: string;
  } | null;
}

export interface RecordingResponse {
  success: boolean;
  recording?: Recording;
  recordings?: Recording[];
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const recordingService = {
  listRecordings: async (options?: {
    page?: number;
    limit?: number;
    status?: Recording["status"];
    roomCode?: string;
  }): Promise<RecordingResponse> => {
    const res = await api.get("/recordings", { params: options });
    return res.data;
  },

  listRoomRecordings: async (
    roomCode: string,
    options?: { page?: number; limit?: number; status?: Recording["status"] }
  ): Promise<RecordingResponse> => {
    const res = await api.get(`/recordings/rooms/${roomCode}`, { params: options });
    return res.data;
  },

  uploadRecording: async (
    roomCode: string,
    data: {
      video?: Blob;
      thumbnail?: Blob;
      title?: string;
      description?: string;
      duration_seconds?: number;
      file_url?: string;
      thumbnail_url?: string;
    }
  ): Promise<RecordingResponse> => {
    const formData = new FormData();

    if (data.video) formData.append("video", data.video);
    if (data.thumbnail) formData.append("thumbnail", data.thumbnail);
    if (data.title) formData.append("title", data.title);
    if (data.description) formData.append("description", data.description);
    if (data.duration_seconds !== undefined) {
      formData.append("duration_seconds", String(data.duration_seconds));
    }
    if (data.file_url) formData.append("file_url", data.file_url);
    if (data.thumbnail_url) formData.append("thumbnail_url", data.thumbnail_url);

    const res = await api.post(`/recordings/${roomCode}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  getRecording: async (recordingId: string): Promise<RecordingResponse> => {
    const res = await api.get(`/recordings/${recordingId}`);
    return res.data;
  },

  updateRecording: async (
    recordingId: string,
    data: Partial<Pick<Recording, "title" | "description" | "thumbnail_url" | "duration_seconds" | "status">>
  ): Promise<RecordingResponse> => {
    const res = await api.patch(`/recordings/${recordingId}`, data);
    return res.data;
  },

  deleteRecording: async (recordingId: string): Promise<RecordingResponse> => {
    const res = await api.delete(`/recordings/${recordingId}`);
    return res.data;
  },

  startLiveKitRecording: async (roomCode: string): Promise<any> => {
    const res = await api.post(`/recordings/rooms/${roomCode}/record/start`);
    return res.data;
  },

  stopLiveKitRecording: async (roomCode: string): Promise<any> => {
    const res = await api.post(`/recordings/rooms/${roomCode}/record/stop`);
    return res.data;
  },

  getLiveKitRecordingStatus: async (roomCode: string): Promise<any> => {
    const res = await api.get(`/recordings/rooms/${roomCode}/record/status`);
    return res.data;
  },
};
