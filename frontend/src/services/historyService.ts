import api from "@/lib/axios";

export interface RoomHistory {
  _id: string;
  room_code: string;
  title: string;
  host_id: string;
  host_name: string;
  created_at: string;
  ended_at?: string;
  participant_count: number;
  duration?: number;
}

export interface HistoryResponse {
  success: boolean;
  rooms?: RoomHistory[];
  messages?: any[];
  events?: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const historyService = {
  /**
   * Get list of past rooms/meetings
   */
  getRoomHistory: async (options?: { page?: number; limit?: number }): Promise<HistoryResponse> => {
    const params = {
      page: options?.page || 1,
      limit: options?.limit || 50,
    };
    const res = await api.get("/history/rooms", { params });
    return res.data;
  },

  /**
   * Get messages/chat history for a specific room
   */
  getRoomMessages: async (
    roomCode: string,
    options?: { page?: number; limit?: number }
  ): Promise<HistoryResponse> => {
    const params = {
      page: options?.page || 1,
      limit: options?.limit || 50,
    };
    const res = await api.get(`/history/rooms/${roomCode}/messages`, { params });
    return res.data;
  },

  /**
   * Get event logs for a specific room
   */
  getRoomEvents: async (
    roomCode: string,
    options?: { page?: number; limit?: number }
  ): Promise<HistoryResponse> => {
    const params = {
      page: options?.page || 1,
      limit: options?.limit || 50,
    };
    const res = await api.get(`/history/rooms/${roomCode}/events`, { params });
    return res.data;
  },
};
