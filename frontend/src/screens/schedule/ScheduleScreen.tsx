import { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventContentArg } from "@fullcalendar/core";
import { motion } from "motion/react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import SideBar from "@/components/layout/SideBar";
import { CreateRoomDialog } from "@/components/pages/dashboard/room/CreateRoomDialog";
import { ScheduleMeetingDialog } from "@/components/pages/dashboard/room/ScheduleMeetingDialog";
import { MeetingDetailDialog } from "@/components/pages/schedule/MeetingDetailDialog";
import { CalendarEventContent } from "@/components/pages/schedule/CalendarEventContent";
import { ScheduleEmptyState } from "@/components/pages/schedule/ScheduleEmptyState";
import { useUpcomingMeetings } from "@/hooks/dashboard/useUpcomingMeetings";
import type { ScheduledMeeting } from "@/types";

export function ScheduleScreen() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<ScheduledMeeting | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { meetings, loading, refetch } = useUpcomingMeetings();

  // Filter: only meetings with started_at and not ended (REQ-03, REQ-12)
  const calendarMeetings = useMemo(
    () => meetings.filter((m) => m.started_at && m.status !== "ended"),
    [meetings]
  );

  // Map to FullCalendar event format
  const events = useMemo(
    () =>
      calendarMeetings.map((m) => ({
        id: m._id,
        title: m.title,
        start: m.started_at!,
        extendedProps: { meeting: m },
      })),
    [calendarMeetings]
  );

  const handleEventClick = (info: EventClickArg) => {
    const meeting: ScheduledMeeting = info.event.extendedProps.meeting;
    setSelectedMeeting(meeting);
    setDetailOpen(true);
  };

  const renderEventContent = (eventInfo: EventContentArg) => (
    <CalendarEventContent eventInfo={eventInfo} />
  );

  return (
    <div className="flex min-h-screen">
      <SideBar onNewMeeting={() => setShowCreateDialog(true)} />

      <main className="lg:ml-64 flex-1 pt-16 lg:pt-0 px-4 md:px-8 lg:px-12 py-6 lg:py-12 bg-surface min-h-screen">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 lg:mb-10">
          <div className="space-y-2">
            <span className="text-primary font-semibold tracking-widest uppercase text-xs">
              Lịch
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter text-on-surface">
              Lịch trình
            </h1>
            <p className="text-on-surface-variant max-w-md">
              Các cuộc họp sắp tới của bạn.
            </p>
          </div>
          <Button
            onClick={() => setShowScheduleDialog(true)}
            className="h-14 px-8 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 group"
          >
            <Plus className="group-hover:rotate-90 transition-transform" size={20} />
            Lên lịch Meeting
          </Button>
        </header>

        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-sm p-6 fc-custom"
        >
          {loading ? (
            <div className="flex items-center justify-center h-96 text-on-surface-variant">
              Đang tải lịch trình…
            </div>
          ) : events.length === 0 ? (
            <ScheduleEmptyState onSchedule={() => setShowScheduleDialog(true)} />
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              events={events}
              eventContent={renderEventContent}
              eventClick={handleEventClick}
              height="auto"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}
              dayMaxEvents={3}
            />
          )}
        </motion.div>
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
      <MeetingDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        meeting={selectedMeeting}
      />
    </div>
  );
}
