import { create } from "zustand";
import { persist } from "zustand/middleware";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { AuthState } from "@/types/store";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      loading: false,
      isAuthenticated: false,

      clearState: () => {
        set({ accessToken: null, refreshToken: null, user: null, loading: false });
      },

      signUp: async (fullname: string, email: string, password: string) => {
        try {
          set({ loading: true });
          await authService.signUp(fullname, email, password);
          toast.success("Sign Up successfully!");
          return { success: true };
        } catch (error: any) {
          console.log(error);
          toast.error(error.response?.data?.message || "Sign Up unsuccessfully!");
          return { success: false, error: error.response?.data };
        } finally {
          set({ loading: false });
        }
      },

      signIn: async (email: string, password: string) => {
        try {
          set({ loading: true });
          const response = await authService.signIn(email, password);

          if (response.success && response.data) {
            set({
              accessToken: response.data.access_token || response.data.accessToken,
              refreshToken: response.data.refresh_token || response.data.refreshToken,
              user: response.data.user
            });
            toast.success("Sign In successfully!");
            return { success: true };
          } else if (response.access_token || response.accessToken) {
            set({
              accessToken: response.access_token || response.accessToken,
              refreshToken: response.refresh_token || response.refreshToken,
              user: response.user
            });
            toast.success("Sign In successfully!");
            return { success: true };
          } else {
            toast.error(response.message || "Sign In failed");
            return { success: false, error: response };
          }
        } catch (error: any) {
          console.log(error);
          toast.error(error.response?.data?.message || "Sign In unsuccessfully!");
          return { success: false, error: error.response?.data };
        } finally {
          set({ loading: false });
        }
      },

      signInWithGoogle: async (id_token: string) => {
        try {
          set({ loading: true });
          const response = await authService.googleAuth(id_token);

          if (response.success && response.accessToken) {
            set({
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              user: response.user
            });
            toast.success("Đăng nhập bằng Google thành công!");
            return { success: true };
          } else {
            toast.error(response.message || "Đăng nhập Google thất bại");
            return { success: false, error: response };
          }
        } catch (error: any) {
          console.error(error);
          toast.error(error.response?.data?.message || "Đăng nhập Google thất bại!");
          return { success: false, error: error.response?.data };
        } finally {
          set({ loading: false });
        }
      },

      logout: async () => {
        try {
          set({ loading: true });
          const refreshToken = get().refreshToken;
          const { disconnectSocket } = await import("@/socket/socket");
          disconnectSocket();
          await authService.logout(refreshToken).catch(() => { });
        } finally {
          get().clearState();
          set({ loading: false });
          toast.success("Logged out successfully");
        }
      },

      fetchProfile: async () => {
        try {
          const response = await authService.getMe();
          const user = response.data?.user || response.user || response;
          if (user && user.email) set({ user });
        } catch (error) {
          console.error("Failed to fetch profile", error);
        }
      },

      updateProfile: async (data) => {
        try {
          set({ loading: true });
          const response = await authService.updateMe(data);
          const user = response.data?.user || response.user || response;
          if (user && user.email) {
            set({ user: { ...get().user, ...user } });
            toast.success("Profile updated successfully!");
          }
        } catch (error: any) {
          console.error(error);
          toast.error(error.response?.data?.message || "Failed to update profile");
        } finally {
          set({ loading: false });
        }
      }
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user
      }),
    }
  )
);
