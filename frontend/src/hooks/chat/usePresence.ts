import { useEffect } from "react";
import { getSocket } from "@/socket/socket";
import { PRESENCE_EVENTS } from "@/socket/events";
import { useMessageStore } from "@/stores/messageStore";

export function usePresence(userIds: string[]) {
  const setPresence = useMessageStore((state) => state.setPresence);
  const idsKey = [...userIds].sort().join(",");

  useEffect(() => {
    const normalized = [...new Set(userIds.filter(Boolean))];
    if (normalized.length === 0) {
      return;
    }

    const socket = getSocket();

    const handleSnapshot = (payload: {
      users: Array<{ userId: string; status: "online" | "offline"; lastSeenAt: string | null }>;
    }) => {
      setPresence(payload.users);
    };

    const handleOnline = (payload: { userId: string; status: "online"; lastSeenAt: null }) => {
      setPresence([payload]);
    };

    const handleOffline = (payload: { userId: string; status: "offline"; lastSeenAt: string | null }) => {
      setPresence([payload]);
    };

    socket.on(PRESENCE_EVENTS.SNAPSHOT, handleSnapshot);
    socket.on(PRESENCE_EVENTS.ONLINE, handleOnline);
    socket.on(PRESENCE_EVENTS.OFFLINE, handleOffline);
    socket.emit(PRESENCE_EVENTS.SUBSCRIBE, { userIds: normalized });

    return () => {
      socket.emit(PRESENCE_EVENTS.UNSUBSCRIBE, { userIds: normalized });
      socket.off(PRESENCE_EVENTS.SNAPSHOT, handleSnapshot);
      socket.off(PRESENCE_EVENTS.ONLINE, handleOnline);
      socket.off(PRESENCE_EVENTS.OFFLINE, handleOffline);
    };
  }, [idsKey]);
}
