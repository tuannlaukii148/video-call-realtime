import React, { useState } from "react";
import { motion } from "motion/react";
import {
  LayoutDashboard,
  Calendar as CalendarIcon,
  Plus,
  ChevronLeft,
  ChevronRight,
  PlayCircle,
  Star,
  Bot,
  LogIn,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router";
import SideBar from "@/components/layout/SideBar";
import MeetingCard from "@/components/pages/dashboard/MeetingCard";
import { CreateRoomDialog } from "@/components/pages/dashboard/room/CreateRoomDialog";
import { JoinRoomDialog } from "@/components/pages/dashboard/room/JoinRoomDialog";
import { ScheduleMeetingDialog } from "@/components/pages/dashboard/room/ScheduleMeetingDialog";
import { useUpcomingMeetings } from "@/hooks/dashboard/useUpcomingMeetings";
import { useMeetingReminder } from "@/hooks/dashboard/useMeetingReminder";
import { useFcmMeetingReminders } from "@/hooks/dashboard/useFcmMeetingReminders";
import { useAuthStore } from "@/stores/useAuthStore";
import { roomService } from "@/services/roomService";
import { toast } from "sonner";

export function DashboardScreen() {
  const navigate = useNavigate();
  const authUser = useAuthStore((state) => state.user);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [deletingRoomCode, setDeletingRoomCode] = useState<string | null>(null);

  const { meetings, loading, refetch } = useUpcomingMeetings();
  useMeetingReminder(meetings);
  useFcmMeetingReminders();

  const handleDeleteMeeting = async (roomCode: string) => {
    const confirmed = window.confirm(
      "Delete this meeting permanently? This will remove the room and all related data."
    );
    if (!confirmed) return;

    setDeletingRoomCode(roomCode);
    try {
      await roomService.deleteRoom(roomCode);
      toast.success("Meeting deleted successfully");
      await refetch();
    } catch (error) {
      toast.error("Failed to delete meeting");
    } finally {
      setDeletingRoomCode(null);
    }
  };

  const currentUserId = authUser?._id?.toString();

  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const today = new Date();
  const isCurrentMonth = today.getMonth() === month && today.getFullYear() === year;

  const hasMeeting = (day: number) => {
    return meetings.some((m) => {
      if (!m.started_at) return false;
      const mDate = new Date(m.started_at);
      return (
        mDate.getDate() === day &&
        mDate.getMonth() === month &&
        mDate.getFullYear() === year
      );
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <SideBar
        onNewMeeting={() => setShowCreateDialog(true)}
      />
      {/* Main Content */}
      <main className="lg:ml-64 flex-1 pt-16 lg:pt-0 px-4 md:px-8 lg:px-12 py-6 lg:py-12 bg-surface min-h-screen">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 lg:mb-12">
          <div className="space-y-2">
            <span className="text-primary font-semibold tracking-widest uppercase text-xs">
              Dashboard
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface">
              Tổng quan
            </h1>
            <p className="text-on-surface-variant max-w-md text-lg">
              Quản lý, lên lịch và tham gia các buổi họp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={() => setShowJoinDialog(true)}
              className="h-14 px-8 bg-surface-container-highest text-on-surface rounded-full font-bold shadow-sm hover:bg-surface-container-high hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 group border border-outline-variant/20"
            >
              <LogIn
                className="group-hover:translate-x-0.5 transition-transform"
                size={20}
              />
              Tham gia phòng họp
            </Button>
            <Button
              onClick={() => setShowScheduleDialog(true)}
              className="h-14 px-8 bg-linear-to-r from-primary to-primary-container text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 group"
            >
              <Plus
                className="group-hover:rotate-90 transition-transform"
                size={20}
              />
              Lên lịch họp
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-8">
          {/* Left Column: Calendar & Recordings */}
          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant/10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-bold text-on-surface capitalize">
                  {currentDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" })}
                </h3>
                <div className="flex gap-2">
                  <button onClick={handlePrevMonth} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <button onClick={handleNextMonth} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center mb-4">
                {["CN", "T2", "T3", "T4", "T5", "T6", "T7"].map((d, i) => (
                  <span
                    key={`${d}-${i}`}
                    className="text-xs font-bold text-on-surface-variant/50"
                  >
                    {d}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-2 text-center">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                  <div key={`empty-${i}`} />
                ))}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const isToday = isCurrentMonth && day === today.getDate();
                  const dayHasMeeting = hasMeeting(day);

                  return (
                    <button
                      key={day}
                      className={`p-2 rounded-xl text-sm font-medium transition-colors ${isToday
                        ? "bg-primary text-white font-bold shadow-md shadow-primary/20"
                        : "hover:bg-primary-fixed"
                        } ${dayHasMeeting && !isToday ? "text-primary font-bold" : ""}`}
                    >
                      {day}
                      {dayHasMeeting && (
                        <div
                          className={`w-1 h-1 mx-auto mt-0.5 rounded-full ${isToday ? "bg-white" : "bg-primary"
                            }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>


          </div>

          {/* Right Column: Meetings */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-on-surface">
                Cuộc họp sắp tới
              </h2>
            </div>

            <div className="space-y-4">
              {loading ? (
                <div className="text-center py-8 text-on-surface-variant">Đang tải cuộc họp...</div>
              ) : meetings.length === 0 ? (
                <div className="text-center py-8 text-on-surface-variant bg-surface-container-low rounded-3xl border border-dashed border-outline-variant/30">
                  <CalendarIcon size={32} className="mx-auto mb-3 opacity-50" />
                  <p>Chưa có cuộc họp nào</p>
                </div>
              ) : (
                meetings.slice(0, 4).map((meeting) => (
                  <MeetingCard
                    key={meeting.room_code}
                    meeting={meeting}
                    currentUserId={currentUserId}
                    isDeleting={deletingRoomCode === meeting.room_code}
                    onJoin={(code) => navigate(`/lobby?code=${code}`)}
                    onDelete={(code) => handleDeleteMeeting(code)}
                  />
                ))
              )}
            </div>

          </div>
        </div>
      </main>

      {/* Dialogs */}
      <CreateRoomDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
      <ScheduleMeetingDialog
        open={showScheduleDialog}
        onOpenChange={setShowScheduleDialog}
        onScheduled={refetch}
      />
      <JoinRoomDialog
        open={showJoinDialog}
        onOpenChange={setShowJoinDialog}
      />
    </div>
  );
}
