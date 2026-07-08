import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Mail,
  Calendar,
  Users,
  Video,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
} from "lucide-react";
import { adminService, AdminUser, MeetingHistory } from "@/services/adminService";

interface UserDetailModalProps {
  userId: string | null;
  onClose: () => void;
}

export function UserDetailModal({ userId, onClose }: UserDetailModalProps) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [history, setHistory] = useState<MeetingHistory[]>([]);
  const [stats, setStats] = useState<{
    totalMeetingsJoined: number;
    totalMeetingsHosted: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const load = async () => {
      setLoading(true);
      try {
        const res = await adminService.getUserById(userId);
        setUser(res.user);
        setHistory(res.meetingHistory);
        setStats(res.stats);
      } catch (err) {
        console.error("UserDetailModal load error:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId]);

  const formatDate = (d?: string | null) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const ROOM_STATUS_LABEL: Record<string, { label: string; cls: string }> = {
    active: { label: "Đang họp", cls: "bg-emerald-500/15 text-emerald-600" },
    waiting: { label: "Chờ", cls: "bg-amber-500/15 text-amber-600" },
    ended: { label: "Đã kết thúc", cls: "bg-outline-variant/30 text-on-surface-variant" },
  };

  return (
    <AnimatePresence>
      {userId && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80]"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 z-[90] flex items-center justify-center p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-surface rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-outline-variant/10">
                <h2 className="text-lg font-bold text-on-surface">
                  Thông tin người dùng
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-surface-container transition-colors text-on-surface-variant dark:text-on-surface-variant/70"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Body */}
              <div className="overflow-y-auto flex-1 p-6 space-y-6">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-3 text-on-surface-variant/70">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm">Đang tải thông tin...</p>
                  </div>
                ) : user ? (
                  <>
                    {/* User profile */}
                    <div className="flex items-start gap-4">
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          className="w-16 h-16 rounded-2xl object-cover shrink-0 shadow"
                          alt={user.full_name}
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center shrink-0 shadow">
                          <span className="text-2xl font-bold text-white">
                            {user.full_name?.[0]?.toUpperCase() ?? "?"}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-on-surface truncate">
                          {user.full_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Mail className="w-3.5 h-3.5 text-on-surface-variant/70 shrink-0" />
                          <span className="text-sm text-on-surface-variant dark:text-on-surface-variant/70 truncate">
                            {user.email}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-2">
                          {user.email_verified ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-1 rounded-full">
                              <CheckCircle2 className="w-3 h-3" />
                              Email đã xác thực
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2.5 py-1 rounded-full">
                              <XCircle className="w-3 h-3" />
                              Chưa xác thực
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Info rows */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-surface-container-low rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-on-surface-variant/70 mb-1">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs uppercase tracking-wider font-semibold">Ngày tạo</span>
                        </div>
                        <p className="font-bold text-on-surface text-sm">
                          {formatDate(user.created_at)}
                        </p>
                      </div>
                      <div className="bg-surface-container-low rounded-2xl p-4">
                        <div className="flex items-center gap-2 text-on-surface-variant/70 mb-1">
                          <Users className="w-4 h-4" />
                          <span className="text-xs uppercase tracking-wider font-semibold">Đã tham gia</span>
                        </div>
                        <p className="font-bold text-on-surface text-sm">
                          {stats?.totalMeetingsJoined ?? 0} cuộc họp
                        </p>
                      </div>
                      <div className="bg-surface-container-low rounded-2xl p-4 col-span-2">
                        <div className="flex items-center gap-2 text-on-surface-variant/70 mb-1">
                          <Video className="w-4 h-4" />
                          <span className="text-xs uppercase tracking-wider font-semibold">Đã tổ chức</span>
                        </div>
                        <p className="font-bold text-on-surface text-sm">
                          {stats?.totalMeetingsHosted ?? 0} phòng họp
                        </p>
                      </div>
                    </div>

                    {/* Meeting history */}
                    <div>
                      <h4 className="font-bold text-on-surface mb-3 text-sm uppercase tracking-wider">
                        Lịch sử tham gia (10 gần nhất)
                      </h4>
                      {history.length === 0 ? (
                        <div className="text-center py-8 text-on-surface-variant/70 bg-surface-container-low rounded-2xl">
                          <Video className="w-8 h-8 mx-auto mb-2 opacity-40" />
                          <p className="text-sm">Chưa tham gia cuộc họp nào</p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {history.map((h) => {
                            const roomStatus = h.room?.status ?? "ended";
                            const cfg = ROOM_STATUS_LABEL[roomStatus] ?? ROOM_STATUS_LABEL.ended;
                            return (
                              <div
                                key={h._id}
                                className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low gap-3"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm text-on-surface truncate">
                                    {h.room?.title ?? "Không rõ"}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <code className="text-[10px] text-on-surface-variant/70 font-mono">
                                      {h.room?.room_code}
                                    </code>
                                    {h.joined_at && (
                                      <span className="text-[10px] text-on-surface-variant/70 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(h.joined_at)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <span className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${cfg.cls}`}>
                                  {cfg.label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-on-surface-variant/70">
                    <XCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Không tìm thấy thông tin người dùng</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
