import React, { useEffect, useState, useCallback } from "react";
import { motion } from "motion/react";
import {
  Search,
  RefreshCw,
  Users,
  Radio,
  ChevronLeft,
  ChevronRight,
  Eye,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { useAdminStore } from "@/stores/useAdminStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { AdminSidebar } from "@/components/layout/AdminSidebar";
import { StatsGrid } from "@/components/pages/admin/StatsGrid";
import { MeetingTable } from "@/components/pages/admin/MeetingTable";
import { UserDetailModal } from "@/components/pages/admin/UserDetailModal";
import { UserFormModal } from "@/components/pages/admin/UserFormModal";
import { adminService, AdminUser } from "@/services/adminService";

// ─── Tab: Overview ─────────────────────────────────────────────────────────────
function OverviewTab() {
  const { stats, statsLoading, fetchStats, activeMeetings, activeMeetingsLoading, fetchActiveMeetings } =
    useAdminStore();

  useEffect(() => {
    fetchStats();
    fetchActiveMeetings();
  }, []);

  const formatTime = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div>
      <StatsGrid stats={stats} loading={statsLoading} />

      {/* Active meetings live view */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-outline-variant/20 bg-surface overflow-hidden shadow-sm"
      >
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="font-bold text-on-surface">Phòng đang hoạt động</h2>
            </div>
            <p className="text-sm text-on-surface-variant mt-0.5">Realtime overview</p>
          </div>
          <button
            onClick={() => { fetchStats(); fetchActiveMeetings(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm hover:bg-surface-container-high transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {activeMeetingsLoading ? (
          <div className="flex items-center justify-center py-16 gap-3 text-on-surface-variant">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Đang tải...</span>
          </div>
        ) : activeMeetings.length === 0 ? (
          <div className="text-center py-16 text-on-surface-variant">
            <Radio className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Không có phòng nào đang hoạt động</p>
            <p className="text-xs mt-1">Các phòng active sẽ xuất hiện ở đây</p>
          </div>
        ) : (
          <div className="divide-y divide-outline-variant/10">
            {activeMeetings.map((m, i) => (
              <motion.div
                key={m._id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center gap-4 p-5 hover:bg-surface-container-low transition-colors"
              >
                {/* Status dot */}
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />

                {/* Room info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-on-surface truncate">
                      {m.title}
                    </p>
                    <code className="text-[10px] font-mono bg-surface-container px-2 py-0.5 rounded-lg text-on-surface-variant dark:text-on-surface-variant shrink-0">
                      {m.room_code}
                    </code>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    Host: {m.host_id?.full_name ?? "Unknown"} · Bắt đầu lúc {formatTime(m.started_at)}
                  </p>
                </div>

                {/* Participants */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex -space-x-2">
                    {m.participants.slice(0, 4).map((p) => (
                      p.avatar ? (
                        <img
                          key={p._id?.toString()}
                          src={p.avatar}
                          className="w-7 h-7 rounded-full border-2 border-surface object-cover"
                          title={p.full_name}
                          alt=""
                        />
                      ) : (
                        <div
                          key={p._id?.toString()}
                          className="w-7 h-7 rounded-full border-2 border-surface bg-primary/20 flex items-center justify-center"
                          title={p.full_name}
                        >
                          <span className="text-[10px] font-bold text-primary">
                            {p.full_name?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                      )
                    ))}
                    {m.participant_count > 4 && (
                      <div className="w-7 h-7 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center">
                        <span className="text-[10px] font-bold text-on-surface-variant">
                          +{m.participant_count - 4}
                        </span>
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-on-surface-variant dark:text-on-surface-variant">
                    {m.participant_count}
                  </span>
                  <Users className="w-4 h-4 text-on-surface-variant" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Tab: Users ─────────────────────────────────────────────────────────────────
function UsersTab() {
  const {
    users,
    usersPagination,
    usersLoading,
    usersSearch,
    fetchUsers,
    setUsersSearch,
  } = useAdminStore();

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState(usersSearch);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [userToEdit, setUserToEdit] = useState<AdminUser | null>(null);

  useEffect(() => {
    fetchUsers(1, 10, "");
  }, []);

  const handleSearch = () => {
    setUsersSearch(localSearch);
    fetchUsers(1, 10, localSearch);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSearch();
  };

  const handlePage = (page: number) => {
    fetchUsers(page, 10, usersSearch);
  };

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN");
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc email..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container border border-outline-variant/20 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-on-surface-variant"
          />
        </div>
        <button
          onClick={handleSearch}
          className="px-4 py-2.5 rounded-xl bg-surface-container-high text-on-surface font-semibold text-sm hover:bg-surface-container-highest transition-colors"
        >
          Tìm kiếm
        </button>
        <button
          onClick={() => {
            setUserToEdit(null);
            setIsFormOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <Users className="w-4 h-4" />
          Thêm người dùng
        </button>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-outline-variant/20 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-surface-container-low">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Người dùng</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Email</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Xác thực</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold text-on-surface-variant uppercase tracking-wider">Ngày tạo</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold text-on-surface-variant uppercase tracking-wider">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {usersLoading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-on-surface-variant">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm">Đang tải...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-on-surface-variant">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Không tìm thấy người dùng nào</p>
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <motion.tr
                    key={u._id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-surface-container-low transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {u.avatar ? (
                          <img
                            src={u.avatar}
                            className="w-9 h-9 rounded-xl object-cover shrink-0"
                            alt=""
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">
                              {u.full_name?.[0]?.toUpperCase() ?? "?"}
                            </span>
                          </div>
                        )}
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {u.full_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant dark:text-on-surface-variant">{u.email}</td>
                    <td className="px-5 py-4">
                      {u.email_verified ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          Đã xác thực
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                          <XCircle className="w-3 h-3" />
                          Chưa xác thực
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-on-surface-variant text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUserId(u._id)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
                          title="Xem chi tiết"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setUserToEdit(u);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                          title="Chỉnh sửa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                        </button>
                        <button
                          onClick={async () => {
                            if (window.confirm(`Bạn có chắc chắn muốn xóa người dùng ${u.full_name}?\nHành động này sẽ xóa tất cả phòng họp do người này làm host.`)) {
                              try {
                                await adminService.deleteUser(u._id);
                                fetchUsers(usersPagination?.page || 1, 10, usersSearch);
                              } catch (err: any) {
                                alert(err.response?.data?.message || "Lỗi khi xóa người dùng.");
                              }
                            }
                          }}
                          className="p-1.5 rounded-lg text-error hover:bg-error/10 transition-colors"
                          title="Xóa"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {usersPagination && usersPagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-on-surface-variant dark:text-on-surface-variant">
          <p>
            Hiển thị {(usersPagination.page - 1) * usersPagination.limit + 1}–
            {Math.min(usersPagination.page * usersPagination.limit, usersPagination.total)} / {usersPagination.total} người dùng
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePage(usersPagination.page - 1)}
              disabled={usersPagination.page <= 1}
              className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-on-surface">
              {usersPagination.page} / {usersPagination.totalPages}
            </span>
            <button
              onClick={() => handlePage(usersPagination.page + 1)}
              disabled={usersPagination.page >= usersPagination.totalPages}
              className="p-2 rounded-lg hover:bg-surface-container disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <UserDetailModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
      />

      <UserFormModal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        user={userToEdit}
        onSuccess={() => {
          setIsFormOpen(false);
          fetchUsers(usersPagination?.page || 1, 10, usersSearch);
        }}
      />
    </div>
  );
}

// ─── Tab: Meetings ──────────────────────────────────────────────────────────────
function MeetingsTab() {
  const {
    meetings,
    meetingsPagination,
    meetingsLoading,
    meetingsStatusFilter,
    meetingsSearch,
    fetchMeetings,
    forceDeleteMeeting,
    setMeetingsStatusFilter,
    setMeetingsSearch,
  } = useAdminStore();

  useEffect(() => {
    fetchMeetings("", 1, 10, "");
  }, []);

  const handleStatusChange = (status: string) => {
    setMeetingsStatusFilter(status);
    fetchMeetings(status, 1, 10, meetingsSearch);
  };

  const handleSearchChange = (search: string) => {
    setMeetingsSearch(search);
    fetchMeetings(meetingsStatusFilter, 1, 10, search);
  };

  const handlePage = (page: number) => {
    fetchMeetings(meetingsStatusFilter, page, 10, meetingsSearch);
  };

  return (
    <MeetingTable
      meetings={meetings}
      pagination={meetingsPagination}
      loading={meetingsLoading}
      statusFilter={meetingsStatusFilter}
      searchValue={meetingsSearch}
      onStatusFilterChange={handleStatusChange}
      onSearchChange={handleSearchChange}
      onPageChange={handlePage}
      onForceDelete={forceDeleteMeeting}
    />
  );
}

// ─── Tab: Live ──────────────────────────────────────────────────────────────────
function LiveTab() {
  const { activeMeetings, activeMeetingsLoading, fetchActiveMeetings } = useAdminStore();

  useEffect(() => {
    fetchActiveMeetings();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActiveMeetings, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (d: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  };

  const calcDuration = (startedAt: string | null) => {
    if (!startedAt) return "—";
    const diff = Date.now() - new Date(startedAt).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    return `${hrs}h${mins % 60}m`;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold text-on-surface">
            {activeMeetings.length} phòng đang hoạt động
          </span>
        </div>
        <button
          onClick={fetchActiveMeetings}
          disabled={activeMeetingsLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container text-on-surface text-sm hover:bg-surface-container-high disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${activeMeetingsLoading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {activeMeetingsLoading ? (
        <div className="flex items-center justify-center py-20 gap-3 text-on-surface-variant">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Đang tải...</span>
        </div>
      ) : activeMeetings.length === 0 ? (
        <div className="text-center py-20 text-on-surface-variant rounded-2xl border border-dashed border-outline-variant/20">
          <Radio className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-semibold">Chưa có phòng nào đang diễn ra</p>
          <p className="text-sm mt-1">Tự động cập nhật mỗi 30 giây</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {activeMeetings.map((m, i) => (
            <motion.div
              key={m._id}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-2xl border border-emerald-200 dark:border-emerald-500/20 bg-surface p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="font-bold text-on-surface">{m.title}</h3>
                  </div>
                  <code className="text-xs font-mono text-on-surface-variant mt-0.5">
                    {m.room_code}
                  </code>
                </div>
                <span className="shrink-0 text-xs font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 px-2.5 py-1 rounded-full">
                  {calcDuration(m.started_at)}
                </span>
              </div>

              <div className="text-xs text-on-surface-variant dark:text-on-surface-variant mb-3">
                Host: <span className="font-semibold text-on-surface">{m.host_id?.full_name}</span>
                {" · "}Bắt đầu lúc {formatTime(m.started_at)}
              </div>

              {/* Participants avatars */}
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {m.participants.slice(0, 5).map((p) => (
                    p.avatar ? (
                      <img
                        key={p._id?.toString()}
                        src={p.avatar}
                        className="w-8 h-8 rounded-full border-2 border-surface object-cover"
                        title={p.full_name}
                        alt=""
                      />
                    ) : (
                      <div
                        key={p._id?.toString()}
                        className="w-8 h-8 rounded-full border-2 border-surface bg-primary/20 flex items-center justify-center"
                        title={p.full_name}
                      >
                        <span className="text-[10px] font-bold text-primary">
                          {p.full_name?.[0]?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                    )
                  ))}
                  {m.participant_count > 5 && (
                    <div className="w-8 h-8 rounded-full border-2 border-surface bg-surface-container-high flex items-center justify-center">
                      <span className="text-[10px] font-bold text-on-surface-variant">
                        +{m.participant_count - 5}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-sm text-on-surface-variant dark:text-on-surface-variant font-semibold">
                  {m.participant_count} người tham gia
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Screen ───────────────────────────────────────────────────────────────
const TAB_TITLES: Record<string, { title: string; sub: string }> = {
  overview: { title: "Tổng quan hệ thống", sub: "Dashboard quản lý toàn bộ platform" },
  users: { title: "Quản lý người dùng", sub: "Xem và quản lý tài khoản user" },
  meetings: { title: "Quản lý cuộc họp", sub: "Toàn bộ lịch sử và trạng thái phòng họp" },
  live: { title: "Phòng đang diễn ra", sub: "Theo dõi realtime các buổi họp đang active" },
};

export function AdminDashboardScreen() {
  const [activeTab, setActiveTab] = useState("overview");
  const user = useAuthStore((s) => s.user);

  const tabInfo = TAB_TITLES[activeTab] ?? TAB_TITLES.overview;

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <AdminSidebar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main content */}
      <main className="lg:ml-64 flex-1 flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-30 bg-surface/80 backdrop-blur border-b border-outline-variant/20 px-6 lg:px-10 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                  Admin Panel
                </span>
              </div>
              <h1 className="text-xl font-extrabold text-on-surface mt-0.5">
                {tabInfo.title}
              </h1>
              <p className="text-xs text-on-surface-variant mt-0.5">{tabInfo.sub}</p>
            </div>

            {/* Admin badge */}
            <div className="hidden sm:flex items-center gap-3 bg-surface-container-low rounded-xl px-4 py-2.5">
              {user?.avatar ? (
                <img src={user.avatar} className="w-8 h-8 rounded-lg object-cover" alt="" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">
                    {user?.full_name?.[0]?.toUpperCase() ?? "A"}
                  </span>
                </div>
              )}
              <div>
                <p className="text-sm font-semibold text-on-surface leading-tight">
                  {user?.full_name ?? "Admin"}
                </p>
                <p className="text-[10px] text-on-surface-variant font-medium">Administrator</p>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 px-6 lg:px-10 py-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "overview" && <OverviewTab />}
            {activeTab === "users" && <UsersTab />}
            {activeTab === "meetings" && <MeetingsTab />}
            {activeTab === "live" && <LiveTab />}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
