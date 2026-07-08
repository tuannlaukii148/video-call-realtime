import type { ReactNode } from "react";

interface LobbyControlProps {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function LobbyControl({ icon, label, active = false, onClick }: LobbyControlProps) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 group">
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90 ${active
          ? "bg-primary text-white shadow-lg shadow-primary/20"
          : "bg-surface-container-highest text-on-surface-variant hover:bg-surface-variant"
          }`}
      >
        {icon}
      </div>
      <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
        {label}
      </span>
    </button>
  );
}
