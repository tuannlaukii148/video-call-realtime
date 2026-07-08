import api from "@/lib/axios";
import type { CreateRoomPayload, RoomResponse, JoinRoomResponse, Room, ScheduledMeeting } from "@/types";

export const roomService = {
  getMyRooms: async (): Promise<{ success: boolean; rooms: ScheduledMeeting[] }> => {
    const res = await api.get("/rooms");
    return res.data;
  },
  createRoom: async (payload: CreateRoomPayload): Promise<RoomResponse> => {
    const res = await api.post("/rooms", payload);
    return res.data;
  },

  getRoomInfo: async (roomCode: string): Promise<{ success: boolean; room: Room }> => {
    const res = await api.get(`/rooms/${roomCode}`);
    return res.data;
  },

  joinRoom: async (roomCode: string): Promise<JoinRoomResponse> => {
    const res = await api.post(`/rooms/${roomCode}/join`);
    return res.data;
  },

  approveUser: async (roomCode: string, userId: string) => {
    const res = await api.post(`/rooms/${roomCode}/approve/${userId}`);
    return res.data;
  },

  rejectUser: async (roomCode: string, userId: string) => {
    const res = await api.post(`/rooms/${roomCode}/reject/${userId}`);
    return res.data;
  },

  kickUser: async (roomCode: string, userId: string) => {
    const res = await api.post(`/rooms/${roomCode}/kick/${userId}`);
    return res.data;
  },

  getRoomParticipants: async (roomCode: string) => {
    const res = await api.get(`/rooms/${roomCode}/participants`);
    return res.data;
  },

  transferHost: async (roomCode: string, newHostId: string) => {
    const res = await api.put(`/rooms/${roomCode}/transfer-host`, {
      new_host_id: newHostId,
    });
    return res.data;
  },

  endRoom: async (roomCode: string) => {
    const res = await api.put(`/rooms/${roomCode}/end`);
    return res.data;
  },
  deleteRoom: async (roomCode: string) => {
    const res = await api.delete(`/rooms/${roomCode}`);
    return res.data;
  },

  inviteUser: async (roomCode: string, userId: string): Promise<{ success: boolean; message: string; online: boolean }> => {
    const res = await api.post(`/rooms/${roomCode}/invite`, { userId });
    return res.data;
  },
};
