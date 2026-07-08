import api from "@/lib/axios";

export const notificationService = {
  registerFcmToken: async (token: string, platform: "web" | "android" | "ios" | "unknown" = "web") => {
    const res = await api.post("/notifications/fcm-token", { token, platform });
    return res.data;
  },

  removeFcmToken: async (token: string, platform: "web" | "android" | "ios" | "unknown" = "web") => {
    const res = await api.delete("/notifications/fcm-token", { data: { token, platform } });
    return res.data;
  },
};
