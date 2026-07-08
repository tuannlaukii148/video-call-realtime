import { create } from "zustand";
import {
  adminService,
  AdminStats,
  AdminUser,
  AdminMeeting,
  ActiveMeeting,
  Pagination,
} from "@/services/adminService";
import { toast } from "sonner";

interface AdminState {
  // Stats
  stats: AdminStats | null;
  statsLoading: boolean;

  // Users
  users: AdminUser[];
  usersPagination: Pagination | null;
  usersLoading: boolean;
  usersSearch: string;

  // All Meetings
  meetings: AdminMeeting[];
  meetingsPagination: Pagination | null;
  meetingsLoading: boolean;
  meetingsStatusFilter: string;
  meetingsSearch: string;

  // Active Meetings
  activeMeetings: ActiveMeeting[];
  activeMeetingsLoading: boolean;

  // Actions
  fetchStats: () => Promise<void>;
  fetchUsers: (page?: number, limit?: number, search?: string) => Promise<void>;
  fetchMeetings: (
    status?: string,
    page?: number,
    limit?: number,
    search?: string
  ) => Promise<void>;
  fetchActiveMeetings: () => Promise<void>;
  forceDeleteMeeting: (roomCode: string) => Promise<boolean>;
  setUsersSearch: (search: string) => void;
  setMeetingsStatusFilter: (status: string) => void;
  setMeetingsSearch: (search: string) => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  statsLoading: false,

  users: [],
  usersPagination: null,
  usersLoading: false,
  usersSearch: "",

  meetings: [],
  meetingsPagination: null,
  meetingsLoading: false,
  meetingsStatusFilter: "",
  meetingsSearch: "",

  activeMeetings: [],
  activeMeetingsLoading: false,

  fetchStats: async () => {
    set({ statsLoading: true });
    try {
      const res = await adminService.getStats();
      set({ stats: res.stats });
    } catch (err: any) {
      console.error("fetchStats error:", err);
    } finally {
      set({ statsLoading: false });
    }
  },

  fetchUsers: async (page = 1, limit = 10, search?: string) => {
    const q = search !== undefined ? search : get().usersSearch;
    set({ usersLoading: true });
    try {
      const res = await adminService.getUsers(page, limit, q);
      set({ users: res.users, usersPagination: res.pagination });
    } catch (err: any) {
      toast.error("Không thể tải danh sách người dùng");
      console.error("fetchUsers error:", err);
    } finally {
      set({ usersLoading: false });
    }
  },

  fetchMeetings: async (status?: string, page = 1, limit = 10, search?: string) => {
    const st = status !== undefined ? status : get().meetingsStatusFilter;
    const q = search !== undefined ? search : get().meetingsSearch;
    set({ meetingsLoading: true });
    try {
      const res = await adminService.getMeetings(st, page, limit, q);
      set({ meetings: res.meetings, meetingsPagination: res.pagination });
    } catch (err: any) {
      toast.error("Không thể tải danh sách cuộc họp");
      console.error("fetchMeetings error:", err);
    } finally {
      set({ meetingsLoading: false });
    }
  },

  fetchActiveMeetings: async () => {
    set({ activeMeetingsLoading: true });
    try {
      const res = await adminService.getActiveMeetings();
      set({ activeMeetings: res.meetings });
    } catch (err: any) {
      console.error("fetchActiveMeetings error:", err);
    } finally {
      set({ activeMeetingsLoading: false });
    }
  },

  forceDeleteMeeting: async (roomCode: string) => {
    try {
      await adminService.forceDeleteMeeting(roomCode);
      toast.success(`Đã xóa phòng họp ${roomCode}`);
      // Refresh meetings list
      const { meetingsStatusFilter, meetingsPagination, meetingsSearch } = get();
      await get().fetchMeetings(
        meetingsStatusFilter,
        meetingsPagination?.page ?? 1,
        meetingsPagination?.limit ?? 10,
        meetingsSearch
      );
      await get().fetchStats();
      return true;
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Không thể xóa phòng họp");
      return false;
    }
  },

  setUsersSearch: (search: string) => set({ usersSearch: search }),
  setMeetingsStatusFilter: (status: string) => set({ meetingsStatusFilter: status }),
  setMeetingsSearch: (search: string) => set({ meetingsSearch: search }),
}));
