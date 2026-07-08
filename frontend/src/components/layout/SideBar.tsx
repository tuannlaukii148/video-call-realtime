import {
  Archive,
  CalendarIcon,
  Flame,
  HelpCircle,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Settings,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";
import React, { useState } from "react";
import NavItem from "./NavItem";
import { Button } from "@base-ui/react/button";
import { useNavigate, useLocation } from "react-router";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMessageStore } from "@/stores/messageStore";

interface SideBarProps {
  onNewMeeting?: () => void;
}

const SideBar = ({ onNewMeeting }: SideBarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const conversations = useMessageStore((state) => state.conversations);
  const hasUnread = conversations.some((c) => c.unreadCount > 0);

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleNewMeeting = () => {
    onNewMeeting?.();
    setMobileOpen(false);
  };

  const SidebarContent = (
    <aside className="h-full w-64 flex flex-col bg-surface-container-low border-r border-outline-variant/10">
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white shrink-0">
          <img src="/logo/logo.png" alt="WebCall Logo" className="w-10 h-10 rounded-lg object-cover" />
        </div>
        <div>
          <h2 className="font-bold text-lg text-primary leading-tight">WebCall</h2>
          <p className="text-xs text-on-surface-variant/70 font-medium">Họp trực tuyến</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <NavItem
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={isActive("/")}
          onClick={() => handleNav("/")}
        />
        <NavItem
          icon={<CalendarIcon size={20} />}
          label="Lịch trình"
          active={isActive("/schedule")}
          onClick={() => handleNav("/schedule")}
        />
        <NavItem
          icon={<MessageSquare size={20} />}
          label="Tin nhắn"
          onClick={() => handleNav("/messages")}
          active={isActive("/messages")}
          badge={hasUnread}
        />
        <NavItem
          icon={<Archive size={20} />}
          label="Lưu trữ"
          active={isActive("/archives")}
          onClick={() => handleNav("/archives")}
        />
      </nav>

      <div className="px-6 mb-6">
        <Button
          onClick={handleNewMeeting}
          className="w-full h-12 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
        >
          <Plus size={20} />
          Tạo phòng họp
        </Button>
      </div>

      <div className="p-6 space-y-3 border-t border-outline-variant/10">
        {user?.role === "admin" && (
          <button
            onClick={() => { navigate("/admin"); setMobileOpen(false); }}
            className="flex items-center gap-3 text-primary hover:text-primary/80 transition-colors w-full py-1"
          >
            <ShieldCheck size={18} />
            <span className="text-sm font-bold">Admin Dashboard</span>
          </button>
        )}
        <button className="flex items-center gap-3 text-on-surface-variant hover:text-primary transition-colors w-full py-1">
          <HelpCircle size={18} />
          <span className="text-sm font-medium">Hỗ trợ</span>
        </button>
        <button
          onClick={() => { navigate("/profile"); setMobileOpen(false); }}
          className="flex items-center gap-3 text-on-surface-variant hover:text-primary transition-colors w-full py-1"
        >
          <Settings size={18} />
          <span className="text-sm font-medium">Cá nhân</span>
        </button>
        <button
          onClick={logout}
          className="flex items-center gap-3 text-error hover:opacity-80 transition-colors w-full pt-2"
        >
          <span className="text-sm font-bold">Đăng xuất</span>
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* ── Desktop: fixed sidebar ─────────────────────────────── */}
      <div className="hidden lg:block h-screen w-64 fixed left-0 top-0 z-40">
        {SidebarContent}
      </div>

      {/* ── Mobile: hamburger button (top-left) ───────────────── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-surface-container-low border border-outline-variant/20 rounded-xl shadow-md text-on-surface"
        aria-label="Open menu"
      >
        <Menu size={22} />
      </button>

      {/* ── Mobile: overlay backdrop ──────────────────────────── */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile: sliding Drawer ────────────────────────────── */}
      <div
        className={`lg:hidden fixed top-0 left-0 h-full w-72 z-[70] transform transition-transform duration-300 ease-in-out ${mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        <div className="relative h-full">
          {/* Close button */}
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
};

export default SideBar;
