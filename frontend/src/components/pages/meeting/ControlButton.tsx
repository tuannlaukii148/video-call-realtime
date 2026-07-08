import type { ReactNode } from "react";

interface ControlButtonProps {
  icon: ReactNode;
  label?: string;
  active?: boolean;
  badge?: number;
  className?: string;
  onClick?: () => void;
}

export function ControlButton({ icon, label, active = false, badge, className, onClick }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={`relative shrink-0 h-11 w-11 md:h-14 md:w-14 rounded-full flex items-center justify-center transition-all active:scale-90 border border-outline-variant/20 ${
        active ? "bg-secondary-container text-primary border-primary/20" : "bg-surface-container-highest text-on-surface-variant hover:bg-orange-100"
      } ${className ?? ""}`}
    >
      {icon}
      {label && <span className="ml-2 font-bold text-sm hidden md:inline">{label}</span>}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-primary text-white text-[9px] md:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
          {badge}
        </span>
      )}
    </button>
  );
}
