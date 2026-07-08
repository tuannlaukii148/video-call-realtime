import { useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  Search,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Video,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SideBar from "@/components/layout/SideBar";
import { CreateRoomDialog } from "@/components/pages/dashboard/room/CreateRoomDialog";
import { RecordingCard } from "@/components/pages/archives/RecordingCard";
import { DeleteRecordingDialog } from "@/components/pages/archives/DeleteRecordingDialog";
import { ArchivesLoadingSkeleton } from "@/components/pages/archives/ArchivesLoadingSkeleton";
import { ArchivesEmptyState } from "@/components/pages/archives/ArchivesEmptyState";
import { ArchivesErrorState } from "@/components/pages/archives/ArchivesErrorState";
import { useRecordings } from "@/hooks/recordings/useRecordings";
import type { Recording } from "@/services/recordingService";

export function ArchivesScreen() {
  const { recordings, loading, error, pagination, fetchRecordings, removeRecording } =
    useRecordings();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [searchCode, setSearchCode] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Recording | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSearch = useCallback(() => {
    fetchRecordings({
      roomCode: searchCode.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
    });
  }, [searchCode, dateFrom, dateTo, fetchRecordings]);

  const handleClearFilters = useCallback(() => {
    setSearchCode("");
    setDateFrom("");
    setDateTo("");
    fetchRecordings({ page: 1 });
  }, [fetchRecordings]);

  const handlePageChange = useCallback(
    (page: number) => {
      fetchRecordings({
        roomCode: searchCode.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
      });
    },
    [searchCode, dateFrom, dateTo, fetchRecordings]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await removeRecording(deleteTarget._id);
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, removeRecording]);

  const hasActiveFilters = searchCode.trim() || dateFrom || dateTo;

  return (
    <div className="flex min-h-screen">
      <SideBar onNewMeeting={() => setShowCreateDialog(true)} />

      <main className="lg:ml-64 flex-1 pt-16 lg:pt-0 px-4 md:px-8 lg:px-12 py-6 lg:py-12 bg-surface min-h-screen">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 lg:mb-10">
          <div className="space-y-2">
            <span className="text-primary font-semibold tracking-widest uppercase text-xs">
              Thư viện
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface">
              Lưu trữ
            </h1>
            <p className="text-on-surface-variant max-w-md">
              Xem và quản lý các bản ghi meeting của bạn.
            </p>
          </div>
          {pagination.total > 0 && (
            <div className="flex items-center gap-2 bg-surface-container rounded-full px-4 py-2">
              <Video size={16} className="text-on-surface-variant" />
              <span className="text-sm font-bold text-on-surface">
                {pagination.total} bản ghi
              </span>
            </div>
          )}
        </header>

        {/* Filters Bar */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 p-5 mb-8 shadow-sm"
        >
          <div className="flex flex-wrap items-end gap-4">
            {/* Room code search */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1.5 block">
                Tìm kiếm theo mã phòng
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40"
                />
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="e.g. ABC123"
                  className="w-full pl-10 pr-4 py-2.5 bg-surface-container rounded-xl text-sm font-medium text-on-surface placeholder:text-on-surface-variant/30 border border-outline-variant/10 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            {/* Date from */}
            <div className="min-w-[160px]">
              <label className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1.5 block">
                Từ ngày
              </label>
              <div className="relative">
                <CalendarDays
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none"
                />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-surface-container rounded-xl text-sm font-medium text-on-surface border border-outline-variant/10 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            {/* Date to */}
            <div className="min-w-[160px]">
              <label className="text-xs font-bold text-on-surface-variant/60 uppercase tracking-wider mb-1.5 block">
                Đến ngày
              </label>
              <div className="relative">
                <CalendarDays
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40 pointer-events-none"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 bg-surface-container rounded-xl text-sm font-medium text-on-surface border border-outline-variant/10 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleSearch}
                className="h-11 px-6 bg-primary text-white rounded-full font-bold hover:scale-[1.02] active:scale-95 transition-all"
              >
                <Search size={16} className="mr-2" />
                Tìm kiếm
              </Button>
              {hasActiveFilters && (
                <Button
                  onClick={handleClearFilters}
                  variant="outline"
                  className="h-11 px-4 rounded-full font-bold border-outline-variant/20"
                >
                  <X size={16} className="mr-1" />
                  Xóa lọc
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          <ArchivesLoadingSkeleton />
        ) : error ? (
          <ArchivesErrorState message={error} onRetry={() => fetchRecordings({ page: 1 })} />
        ) : recordings.length === 0 ? (
          <ArchivesEmptyState hasFilters={!!hasActiveFilters} onClear={handleClearFilters} />
        ) : (
          <>
            {/* Recording Grid */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {recordings.map((recording) => (
                <RecordingCard
                  key={recording._id}
                  recording={recording}
                  onDelete={setDeleteTarget}
                />
              ))}
            </motion.div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-10">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="rounded-full px-4"
                >
                  <ChevronLeft size={16} className="mr-1" />
                  Trước
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                    .filter((p) => {
                      // Show first, last, current ± 1
                      return (
                        p === 1 ||
                        p === pagination.pages ||
                        Math.abs(p - pagination.page) <= 1
                      );
                    })
                    .map((p, idx, arr) => (
                      <span key={p} className="flex items-center gap-1">
                        {idx > 0 && arr[idx - 1] !== p - 1 && (
                          <span className="text-on-surface-variant/40 text-xs px-1">…</span>
                        )}
                        <button
                          onClick={() => handlePageChange(p)}
                          className={`w-9 h-9 rounded-full text-sm font-bold transition-all ${
                            p === pagination.page
                              ? "bg-primary text-white"
                              : "text-on-surface-variant hover:bg-surface-container"
                          }`}
                        >
                          {p}
                        </button>
                      </span>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.pages}
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="rounded-full px-4"
                >
                  Sau
                  <ChevronRight size={16} className="ml-1" />
                </Button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Dialogs */}
      <CreateRoomDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />

      {/* Delete Dialog */}
      <DeleteRecordingDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        recording={deleteTarget}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
      />
    </div>
  );
}


