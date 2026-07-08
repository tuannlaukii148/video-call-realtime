import type { EventContentArg } from "@fullcalendar/core";
import type { ScheduledMeeting } from "@/types";

export function CalendarEventContent({ eventInfo }: { eventInfo: EventContentArg }) {
  const meeting: ScheduledMeeting = eventInfo.event.extendedProps.meeting;
  const isActive = meeting.status === "active" || meeting.status === "waiting";

  const timeStr = meeting.started_at
    ? new Date(meeting.started_at).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div
      className={`w-full px-2 py-1 rounded-lg cursor-pointer text-left overflow-hidden ${
        isActive
          ? "bg-primary text-white"
          : "bg-indigo-100 text-indigo-800"
      }`}
    >
      <p className="text-[11px] font-bold truncate leading-tight">
        {meeting.title}
      </p>
      {timeStr && (
        <p className="text-[10px] opacity-80 truncate leading-tight">{timeStr}</p>
      )}
    </div>
  );
}
