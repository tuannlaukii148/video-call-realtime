import { useState, useCallback, useEffect } from "react";
import { recordingService, type Recording, type RecordingResponse } from "@/services/recordingService";
import { toast } from "sonner";

interface UseRecordingsOptions {
  roomCode?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export function useRecordings(initialOptions?: UseRecordingsOptions) {
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 12,
    total: 0,
    pages: 0,
  });

  const fetchRecordings = useCallback(async (options?: UseRecordingsOptions) => {
    setLoading(true);
    setError(null);
    try {
      const res: RecordingResponse = await recordingService.listRecordings({
        page: options?.page || 1,
        limit: options?.limit || 12,
        roomCode: options?.roomCode || undefined,
      });

      let filtered = res.recordings || [];

      // Client-side date filtering (if backend doesn't support it)
      if (options?.dateFrom) {
        const from = new Date(options.dateFrom);
        from.setHours(0, 0, 0, 0);
        filtered = filtered.filter((r) => new Date(r.recorded_at) >= from);
      }
      if (options?.dateTo) {
        const to = new Date(options.dateTo);
        to.setHours(23, 59, 59, 999);
        filtered = filtered.filter((r) => new Date(r.recorded_at) <= to);
      }

      setRecordings(filtered);
      if (res.pagination) {
        setPagination(res.pagination);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load recordings";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const removeRecording = useCallback(async (recordingId: string) => {
    try {
      await recordingService.deleteRecording(recordingId);
      setRecordings((prev) => prev.filter((r) => r._id !== recordingId));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      toast.success("Recording deleted");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to delete recording";
      toast.error(message);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchRecordings(initialOptions);
  }, []); // Only on mount; refetch manually via fetchRecordings

  return {
    recordings,
    loading,
    error,
    pagination,
    fetchRecordings,
    removeRecording,
  };
}
