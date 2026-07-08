import React, { useState } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  Radio,
  LogOut,
  Menu,
  X,
  ShieldCheck,
  Home,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { motion, AnimatePresence } from "motion/react";

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: "overview", label: "Tổng quan", icon: <LayoutDashboard size={20} /> },
  { id: "users", label: "Người dùng", icon: <Users size={20} /> },
  { id: "meetings", label: "Cuộc họp", icon: <CalendarDays size={20} /> },
  { id: "live", label: "Đang diễn ra", icon: <Radio size={20} /> },
];

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleTab = (id: string) => {
    onTabChange(id);
    setMobileOpen(false);
  };

  const SidebarContent = (
    <aside className="h-full w-64 flex flex-col bg-surface-container-low border-r border-outline-variant/10 text-on-surface">
      {/* Logo */}
      <div className="p-6 flex items-center gap-3 border-b border-outline-variant/10">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-primary/30">
          <ShieldCheck size={20} className="text-white" />
        </div>
        <div>
          <h2 className="font-bold text-base leading-tight">Admin Panel</h2>
          <p className="text-xs text-on-surface-variant font-medium">WebCall System</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTab(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-200 ${
              activeTab === item.id
                ? "bg-background text-primary font-bold shadow-sm scale-[1.02]"
                : "text-on-surface-variant font-medium hover:bg-white/50 hover:text-primary hover:translate-x-1"
            }`}
          >
            {item.icon}
            {item.label}
            {item.id === "live" && (
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        ))}
      </nav>

      {/* Footer actions */}
      <div className="p-4 border-t border-outline-variant/10 space-y-2">
        <button
          onClick={() => navigate("/")}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-on-surface-variant hover:text-primary hover:bg-white/50 transition-colors"
        >
          <Home size={20} />
          Dashboard người dùng
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-error hover:text-error/80 hover:bg-error/10 transition-colors"
        >
          <LogOut size={20} />
          Đăng xuất
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:block h-screen w-64 fixed left-0 top-0 z-40">
        {SidebarContent}
      </div>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-md text-on-surface"
        aria-label="Open admin menu"
      >
        <Menu size={22} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-[70] transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="relative h-full">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface-variant"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
          {SidebarContent}
        </div>
      </div>
    </>
  );
}
