import { useState, useEffect, useCallback } from "react";
import { roomService } from "@/services/roomService";
import type { ScheduledMeeting } from "@/types";
import { toast } from "sonner";

export function useUpcomingMeetings() {
  const [meetings, setMeetings] = useState<ScheduledMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    try {
      setError(null);
      const res = await roomService.getMyRooms();
      if (res.success) {
        setMeetings(res.rooms);
      }
    } catch (err: unknown) {
      console.error("Failed to fetch scheduled meetings:", err);
      // We don't want to show toast error on interval polling
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    fetchMeetings();

    // Poll every 60 seconds to keep list updated
    const interval = setInterval(() => {
      fetchMeetings();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchMeetings]);

  return {
    meetings,
    loading,
    error,
    refetch: fetchMeetings,
  };
}
