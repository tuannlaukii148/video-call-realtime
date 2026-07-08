import React from "react";

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  badge?: boolean;
}

const NavItem = ({ icon, label, active = false, onClick, badge = false }: NavItemProps) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-4 w-full py-3 px-6 rounded-r-full transition-all duration-200 group relative ${
        active
          ? "bg-background text-primary font-bold shadow-sm"
          : "text-on-surface-variant hover:bg-white/50 hover:translate-x-1"
      }`}
    >
      <span
        className={`${active ? "text-primary" : "text-on-surface-variant group-hover:text-primary"}`}
      >
        {icon}
      </span>
      <span className="text-sm">{label}</span>
      {badge && (
        <span className="absolute right-6 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-500/50" />
      )}
    </button>
  );
};

export default NavItem;
