import { useEffect } from "react";
import { registerCurrentBrowserForMeetingReminders } from "@/lib/firebaseMessaging";
import { useAuthStore } from "@/stores/useAuthStore";

export function useFcmMeetingReminders() {
  const accessToken = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!accessToken) return;

    registerCurrentBrowserForMeetingReminders().catch((error) => {
      console.warn("Failed to register FCM meeting reminders:", error);
    });
  }, [accessToken]);
}
