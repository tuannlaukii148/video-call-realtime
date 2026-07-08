import api from "@/lib/axios";
import { User } from "@/types/user";

const normalizeUser = (user: any): User => ({
  _id: user._id,
  full_name: user.full_name ?? user.fullName ?? "",
  email: user.email,
  avatar: user.avatar ?? null,
  role: user.role ?? "user",
  createdAt: user.created_at ?? user.createdAt,
  updatedAt: user.updated_at ?? user.updatedAt,
});

export const authService = {
  signUp: async (full_name: string, email: string, password: string) => {
    const res = await api.post(
      "/auth/register",
      {
        full_name,
        email,
        password,
      }
    );

    return {
      ...res.data,
      user: res.data.user ? normalizeUser(res.data.user) : null,
      accessToken: res.data.accessToken ?? res.data.access_token ?? null,
      refreshToken: res.data.refreshToken ?? res.data.refresh_token ?? null,
    };
  },

  signIn: async (email: string, password: string) => {
    const res = await api.post(
      "/auth/login",
      {
        email,
        password,
      }
    );

    return {
      ...res.data,
      user: res.data.user ? normalizeUser(res.data.user) : null,
      accessToken: res.data.accessToken ?? res.data.access_token ?? null,
      refreshToken: res.data.refreshToken ?? res.data.refresh_token ?? null,
    };
  },

  logout: async (refreshToken?: string | null) => {
    const res = await api.post("/auth/logout", refreshToken ? { refresh_token: refreshToken } : {});
    return res.data;
  },

  refreshToken: async (refresh_token: string) => {
    const res = await api.post("/auth/refresh-token", { refresh_token });
    return res.data;
  },

  getMe: async () => {
    const res = await api.get("/auth/me");
    return res.data;
  },

  updateMe: async (data: Record<string, any>) => {
    const res = await api.put("/auth/me", data);
    return res.data;
  },

  verifyEmail: async (token: string) => {
    const res = await api.get(`/auth/verify-email?token=${encodeURIComponent(token)}`);
    return res.data;
  },

  resendVerification: async (email: string) => {
    const res = await api.post("/auth/resend-verification", { email });
    return res.data;
  },

  forgotPassword: async (email: string) => {
    const res = await api.post("/auth/forgot-password", { email });
    return res.data;
  },

  resetPassword: async (token: string, password: string) => {
    const res = await api.post("/auth/reset-password", { token, password });
    return res.data;
  },

  searchUsers: async (email: string): Promise<{ success: boolean; users: Array<{ _id: string; full_name: string; email: string; avatar: string | null }> }> => {
    const res = await api.get(`/auth/users/search?email=${encodeURIComponent(email)}`);
    return res.data;
  },
  googleAuth: async (id_token: string) => {
    const res = await api.post("/auth/google", { id_token });
    return {
      ...res.data,
      user: res.data.user ? normalizeUser(res.data.user) : null,
      accessToken: res.data.accessToken ?? res.data.access_token ?? null,
      refreshToken: res.data.refreshToken ?? res.data.refresh_token ?? null,
    };
  },
};
