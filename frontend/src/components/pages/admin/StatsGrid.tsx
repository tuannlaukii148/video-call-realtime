import { motion } from "motion/react";
import { Users, Radio, CalendarDays, CalendarCheck, Loader2 } from "lucide-react";
import { AdminStats } from "@/services/adminService";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
  delay?: number;
}

function StatCard({ icon, label, value, sub, gradient, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`rounded-2xl p-6 ${gradient} shadow-sm border border-outline-variant/20 flex flex-col gap-3 editorial-shadow`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold uppercase tracking-wider">
          {icon}
        </span>
      </div>
      <div>
        <p className="text-4xl font-extrabold tracking-tight">
          {value}
        </p>
        {sub && <p className="text-xs opacity-80 mt-1">{sub}</p>}
      </div>
    </motion.div>
  );
}

interface StatsGridProps {
  stats: AdminStats | null;
  loading: boolean;
}

export function StatsGrid({ stats, loading }: StatsGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl p-6 bg-surface-container-high animate-pulse h-36"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        icon={<Users size={20} />}
        label="Tổng người dùng"
        value={stats?.totalUsers ?? 0}
        sub="Tài khoản user"
        gradient="bg-primary/5 text-primary"
        delay={0}
      />
      <StatCard
        icon={<Radio size={20} />}
        label="Đang diễn ra"
        value={stats?.totalActiveMeetings ?? 0}
        sub="Phòng họp active"
        gradient="bg-emerald-50 text-emerald-700"
        delay={0.05}
      />
      <StatCard
        icon={<CalendarDays size={20} />}
        label="Họp hôm nay"
        value={stats?.totalMeetingsToday ?? 0}
        sub="Cuộc họp trong ngày"
        gradient="bg-blue-50 text-blue-700"
        delay={0.1}
      />
      <StatCard
        icon={<CalendarCheck size={20} />}
        label="Tổng cuộc họp"
        value={stats?.totalMeetings ?? 0}
        sub="Toàn bộ lịch sử"
        gradient="bg-orange-50 text-orange-700"
        delay={0.15}
      />
    </div>
  );
}
