import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useMeetingStore } from '@/stores/meetingStore';
import { getSocket } from '@/socket/socket';
import { ROOM_EVENTS } from '@/socket/events';
import { roomService } from '@/services/roomService';
import {
  UserCheck,
  UserX,
  Users,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useState } from 'react';

/**
 * Slide-in panel showing the waiting list for the host.
 * Displays users pending approval with approve/reject actions.
 */
export function WaitingRoomPanel({ roomCode, waitingList, removeWaitingUser }: { roomCode: string, waitingList: any[], removeWaitingUser: (userId: string) => void }) {
  const socket = getSocket();
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const handleApprove = async (userId: string, memberId?: string) => {
    if (!roomCode) return;
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      // Emit socket event for real-time
      socket.emit(ROOM_EVENTS.APPROVE_USER, { roomCode, memberId });

      // Also call REST API as backup
      await roomService.approveUser(roomCode, userId);

      removeWaitingUser(userId);
      toast.success('User approved');
    } catch {
      toast.error('Failed to approve user');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleReject = async (userId: string, memberId?: string) => {
    if (!roomCode) return;
    setProcessingIds((prev) => new Set(prev).add(userId));

    try {
      // Socket handler updates DB + notifies the rejected user
      socket.emit(ROOM_EVENTS.REJECT_USER, { roomCode, memberId });

      removeWaitingUser(userId);
      toast.info('User rejected');
    } catch {
      toast.error('Failed to reject user');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const waitingCount = waitingList.length;

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            className="relative h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-90 border border-outline-variant/20 bg-surface-container-highest text-on-surface-variant hover:bg-orange-100"
            aria-label="Waiting room"
          />
        }
      >
        <ShieldCheck size={24} />
        {waitingCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white animate-pulse">
            {waitingCount}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="w-[380px] bg-surface-container-lowest border-outline-variant/10 p-0 flex flex-col">
        <SheetHeader className="p-6 pb-4 border-b border-outline-variant/10">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold text-on-surface">
                Waiting Room
              </span>
              {waitingCount > 0 && (
                <Badge className="ml-2 bg-error/10 text-error hover:bg-error/10 px-2 py-0.5 text-[10px] font-bold">
                  {waitingCount} pending
                </Badge>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 p-4">
          {waitingCount === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
                <Users size={32} className="text-on-surface-variant/30" />
              </div>
              <h4 className="font-bold text-on-surface mb-1">
                No one waiting
              </h4>
              <p className="text-xs text-on-surface-variant/50">
                People requesting to join will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {waitingList.map((user) => {
                const isProcessing = processingIds.has(user.id);
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-4 bg-surface-container rounded-2xl transition-all hover:bg-surface-container-high"
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-primary-fixed text-on-primary-fixed font-bold">
                        {user.fullName?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">
                        {user.fullName}
                      </p>
                      {user.email && (
                        <p className="text-[10px] text-on-surface-variant/50 truncate">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="icon"
                        onClick={() => {
                          handleApprove(user.id, user.memberId)
                        }}
                        disabled={isProcessing}
                        className="w-9 h-9 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all"
                        aria-label={`Approve ${user.fullName}`}
                      >
                        {isProcessing ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <UserCheck size={16} />
                        )}
                      </Button>
                      <Button
                        size="icon"
                        onClick={() =>
                          handleReject(user.id, user.memberId)
                        }
                        disabled={isProcessing}
                        className="w-9 h-9 rounded-xl bg-error/10 text-error hover:bg-error hover:text-white transition-all"
                        aria-label={`Reject ${user.fullName}`}
                      >
                        <UserX size={16} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Bulk actions */}
        {waitingCount > 1 && (
          <div className="p-4 border-t border-outline-variant/10 flex gap-3">
            <Button
              onClick={() => {
                waitingList.forEach((u) =>
                  handleApprove(u.id, u.memberId)
                );
              }}
              className="flex-1 h-10 rounded-xl bg-primary text-white font-bold text-xs"
            >
              <UserCheck size={14} className="mr-1.5" />
              Admit All ({waitingCount})
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                waitingList.forEach((u) =>
                  handleReject(u.id, u.memberId)
                );
              }}
              className="flex-1 h-10 rounded-xl border-error/20 text-error font-bold text-xs hover:bg-error/5"
            >
              <UserX size={14} className="mr-1.5" />
              Deny All
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
