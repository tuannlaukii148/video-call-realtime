import type { ReactNode } from "react";

interface StatusCardProps {
  icon: ReactNode;
  title: string;
  value: string;
  variant: string;
}

export function StatusCard({ icon, title, value, variant }: StatusCardProps) {
  return (
    <div className={`rounded-[2rem] p-6 border border-outline-variant/10 bg-surface-container-highest shadow-sm ${variant}`}>
      <div className="flex items-center justify-between mb-6 text-on-surface-variant">
        <span className="text-sm font-semibold">{title}</span>
        <div className="w-10 h-10 rounded-2xl bg-white/80 flex items-center justify-center text-current">
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-on-surface">{value}</p>
    </div>
  );
}
