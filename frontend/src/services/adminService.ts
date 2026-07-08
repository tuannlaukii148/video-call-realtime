import api from "@/lib/axios";

export interface AdminStats {
  totalUsers: number;
  totalActiveMeetings: number;
  totalMeetingsToday: number;
  totalMeetings: number;
}

export interface AdminUser {
  _id: string;
  full_name: string;
  email: string;
  avatar: string | null;
  email_verified: boolean;
  role: string;
  created_at: string;
}

export interface AdminMeeting {
  _id: string;
  room_code: string;
  title: string;
  status: "waiting" | "active" | "ended";
  host_id: {
    _id: string;
    full_name: string;
    email: string;
    avatar: string | null;
  };
  participant_count: number;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  description?: string;
}

export interface ActiveMeetingParticipant {
  _id: string;
  full_name: string;
  email: string;
  avatar: string | null;
  joined_at: string;
}

export interface ActiveMeeting extends AdminMeeting {
  participants: ActiveMeetingParticipant[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface MeetingHistory {
  _id: string;
  status: string;
  joined_at: string | null;
  left_at: string | null;
  room: {
    _id: string;
    title: string;
    room_code: string;
    status: string;
    started_at: string | null;
    ended_at: string | null;
  } | null;
}

export const adminService = {
  getStats: async (): Promise<{ success: boolean; stats: AdminStats }> => {
    const res = await api.get("/admin/stats");
    return res.data;
  },

  getUsers: async (
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{
    success: boolean;
    users: AdminUser[];
    pagination: Pagination;
  }> => {
    const res = await api.get("/admin/users", {
      params: { page, limit, search },
    });
    return res.data;
  },

  getUserById: async (
    id: string
  ): Promise<{
    success: boolean;
    user: AdminUser;
    meetingHistory: MeetingHistory[];
    stats: { totalMeetingsJoined: number; totalMeetingsHosted: number };
  }> => {
    const res = await api.get(`/admin/users/${id}`);
    return res.data;
  },

  getMeetings: async (
    status = "",
    page = 1,
    limit = 10,
    search = ""
  ): Promise<{
    success: boolean;
    meetings: AdminMeeting[];
    pagination: Pagination;
  }> => {
    const res = await api.get("/admin/meetings", {
      params: { status, page, limit, search },
    });
    return res.data;
  },

  getActiveMeetings: async (): Promise<{
    success: boolean;
    meetings: ActiveMeeting[];
  }> => {
    const res = await api.get("/admin/meetings/active");
    return res.data;
  },

  forceDeleteMeeting: async (
    roomCode: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/admin/meetings/${roomCode}`);
    return res.data;
  },

  createUser: async (
    data: Partial<AdminUser> & { password?: string }
  ): Promise<{ success: boolean; user: AdminUser }> => {
    const res = await api.post("/admin/users", data);
    return res.data;
  },

  updateUser: async (
    id: string,
    data: Partial<AdminUser> & { password?: string }
  ): Promise<{ success: boolean; user: AdminUser }> => {
    const res = await api.put(`/admin/users/${id}`, data);
    return res.data;
  },

  deleteUser: async (
    id: string
  ): Promise<{ success: boolean; message: string }> => {
    const res = await api.delete(`/admin/users/${id}`);
    return res.data;
  },
};
