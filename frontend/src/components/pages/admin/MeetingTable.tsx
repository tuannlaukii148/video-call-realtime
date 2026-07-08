import React, { useState } from "react";
import { motion } from "motion/react";
import {
  Search,
  Filter,
  Trash2,
  Users,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { AdminMeeting, Pagination } from "@/services/adminService";
import { Button } from "@/components/ui/button";

const STATUS_CONFIG = {
  active: {
    label: "Đang họp",
    icon: <Radio className="w-3 h-3" />,
    cls: "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20",
    dotCls: "bg-emerald-500 animate-pulse",
  },
  waiting: {
    label: "Chờ bắt đầu",
    icon: <Clock className="w-3 h-3" />,
    cls: "bg-amber-500/15 text-amber-600 border border-amber-500/20",
    dotCls: "bg-amber-400",
  },
  ended: {
    label: "Đã kết thúc",
    icon: <CheckCircle2 className="w-3 h-3" />,
    cls: "bg-outline-variant/30 text-on-surface-variant border border-outline-variant/40",
    dotCls: "bg-outline-variant",
  },
} as const;

function Radio(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="2" />
      <path d="M4.93 19.07A10 10 0 0 1 4.93 4.93" />
      <path d="M19.07 19.07A10 10 0 0 0 19.07 4.93" />
      <path d="M7.76 16.24a6 6 0 0 1 0-8.49" />
      <path d="M16.24 16.24a6 6 0 0 0 0-8.49" />
    </svg>
  );
}

interface MeetingTableProps {
  meetings: AdminMeeting[];
  pagination: Pagination | null;
  loading: boolean;
  statusFilter: string;
  searchValue: string;
  onStatusFilterChange: (status: string) => void;
  onSearchChange: (search: string) => void;
  onPageChange: (page: number) => void;
  onForceDelete: (roomCode: string) => Promise<boolean>;
}

export function MeetingTable({
  meetings,
  pagination,
  loading,
  statusFilter,
  searchValue,
  onStatusFilterChange,
  onSearchChange,
  onPageChange,
  onForceDelete,
}: MeetingTableProps) {
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(searchValue);

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearchChange(localSearch);
    }
  };

  const handleDelete = async (roomCode: string, title: string) => {
    if (!window.confirm(`Xóa vĩnh viễn phòng "${title}" (${roomCode})?\nHành động này không thể hoàn tác.`)) return;
    setDeletingCode(roomCode);
    await onForceDelete(roomCode);
    setDeletingCode(null);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã phòng..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onBlur={() => onSearchChange(localSearch)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant/70 text-on-surface"
          />
        </div>
        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {(["", "active", "waiting", "ended"] as const).map((s) => (
            <button
              key={s}
              onClick={() => onStatusFilterChange(s)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all ${statusFilter === s
                ? "bg-primary text-white shadow"
                : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                }`}
            >
              {s === "" ? "Tất cả" : STATUS_CONFIG[s]?.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Tên phòng</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Mã</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Host</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Trạng thái</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Participants</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Bắt đầu</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Đang tải...</p>
                  </td>
                </tr>
              ) : meetings.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-slate-400">
                    <XCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Không có cuộc họp nào</p>
                  </td>
                </tr>
              ) : (
                meetings.map((m, i) => {
                  const cfg = STATUS_CONFIG[m.status] ?? STATUS_CONFIG.ended;
                  const isDeleting = deletingCode === m.room_code;
                  return (
                    <motion.tr
                      key={m._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.03 }}
                      className="hover:bg-surface-container-low transition-colors"
                    >
                      <td className="px-5 py-4 font-semibold text-on-surface max-w-[180px] truncate">
                        {m.title}
                      </td>
                      <td className="px-5 py-4">
                        <code className="text-xs bg-surface-container px-2 py-1 rounded-lg font-mono tracking-wider text-on-surface-variant">
                          {m.room_code}
                        </code>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {m.host_id?.avatar ? (
                            <img
                              src={m.host_id.avatar}
                              className="w-7 h-7 rounded-full object-cover shrink-0"
                              alt=""
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                              <span className="text-[10px] font-bold text-primary">
                                {m.host_id?.full_name?.[0]?.toUpperCase() ?? "?"}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-on-surface truncate max-w-[120px]">
                            {m.host_id?.full_name ?? "Unknown"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotCls}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                          <Users className="w-3.5 h-3.5" />
                          {m.participant_count}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-on-surface-variant text-xs whitespace-nowrap">
                        {formatDate(m.started_at)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => handleDelete(m.room_code, m.title)}
                          disabled={isDeleting}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20 disabled:opacity-50 transition-colors"
                        >
                          {isDeleting ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="w-3.5 h-3.5" />
                          )}
                          Xóa
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-on-surface-variant">
          <p>
            Hiển thị {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} / {pagination.total} cuộc họp
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-on-surface">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
