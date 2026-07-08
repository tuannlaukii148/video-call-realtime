import { useEffect, useRef } from 'react';
import type { ScheduledMeeting } from '@/types';
import { toast } from 'sonner';

const NOTIFY_MINUTES_BEFORE = 5;

export function useMeetingReminder(meetings: ScheduledMeeting[]) {
  const notifiedRooms = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check every 30 seconds
    const interval = setInterval(() => {
      const now = new Date().getTime();
      
      meetings.forEach((meeting) => {
        // Skip instant meetings or already active/ended meetings
        if (!meeting.started_at || meeting.status !== 'waiting') return;

        // Skip if already notified
        if (notifiedRooms.current.has(meeting.room_code)) return;

        const scheduledTime = new Date(meeting.started_at).getTime();
        const timeDiffMs = scheduledTime - now;
        const timeDiffMinutes = timeDiffMs / 60000;

        // If meeting starts in 5 minutes (or is slightly overdue but still waiting)
        if (timeDiffMinutes <= NOTIFY_MINUTES_BEFORE && timeDiffMinutes >= -15) {
          toast(`Meeting Reminder`, {
            description: `${meeting.title} is starting in ${Math.max(0, Math.ceil(timeDiffMinutes))} minutes!`,
            action: {
              label: 'Join',
              onClick: () => {
                window.location.href = `/lobby?code=${meeting.room_code}`;
              }
            },
            duration: 10000,
          });

          // Mark as notified so we don't spam
          notifiedRooms.current.add(meeting.room_code);
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [meetings]);
}
