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
import { useAuthStore } from '@/stores/useAuthStore';
import { roomService } from '@/services/roomService';
import { UserX, Users, Loader2, Crown, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { InviteUserDialog } from './InviteUserDialog';

/**
 * Slide-in panel showing current participants in the meeting for host.
 * Allows host to kick participants.
 */
export function ParticipantsPanel({ roomCode }: { roomCode: string }) {
  const participants = useMeetingStore((s) => s.participants);
  const myId = useMeetingStore((s) => s.memberId);
  const hostId = useMeetingStore((s) => s.hostId);
  const authUser = useAuthStore((s) => s.user);
  const removeParticipant = useMeetingStore((s) => s.removeParticipant);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [showInviteDialog, setShowInviteDialog] = useState(false);

  const isHost = hostId === authUser?._id;

  const hostParticipant = hostId
    ? participants.find((p) => p.id === hostId)
    : null;
  const hostName =
    hostParticipant?.fullName ||
    (hostId === authUser?._id ? authUser?.full_name : null) ||
    'Host';

  const visibleParticipants = hostId
    ? participants.filter((p) => p.id !== hostId)
    : participants;

  const handleKick = async (userId: string) => {
    if (!roomCode) return;
    setProcessingIds((prev) => new Set(prev).add(userId));
    try {
      await roomService.kickUser(roomCode, userId);
      removeParticipant(userId);
      toast.info('Đã xóa người dùng');
    } catch {
      toast.error('Lỗi khi xóa người dùng');
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const count = visibleParticipants.length + (hostId ? 1 : 0);

  return (
    <Sheet>
      <SheetTrigger
        render={
          <button
            className="relative h-14 w-14 rounded-full flex items-center justify-center transition-all active:scale-90 border border-outline-variant/20 bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-high"
            aria-label="Participants"
          />
        }
      >
        <Users size={24} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
            {count}
          </span>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:w-[380px] bg-surface-container-lowest border-outline-variant/10 p-0 flex flex-col z-[120]">
        <SheetHeader className="p-6 pb-4 border-b border-outline-variant/10">
          <SheetTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users size={20} className="text-primary" />
            </div>
            <div>
              <span className="text-lg font-bold text-on-surface">Người tham gia</span>
              <Badge className="ml-2 bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-bold">{count}</Badge>
            </div>
          </SheetTitle>
        </SheetHeader>

        {isHost && (
          <div className="px-6 py-3.5 border-b border-outline-variant/10">
            <Button
              onClick={() => setShowInviteDialog(true)}
              className="w-full h-11 bg-primary text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-primary/95 transition-all shadow-md shadow-primary/10"
            >
              <UserPlus size={16} />
              Invite Participant
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 p-4">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center px-8">
              <div className="w-16 h-16 rounded-full bg-surface-container flex items-center justify-center mb-4">
                <Users size={32} className="text-on-surface-variant/30" />
              </div>
              <h4 className="font-bold text-on-surface mb-1">Không có người tham gia</h4>
              <p className="text-xs text-on-surface-variant/50">Người tham gia sẽ hiển thị ở đây</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hostId && (
                <div className="flex items-center gap-3 p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <Avatar className="w-10 h-10 shrink-0">
                    <AvatarFallback className="bg-primary text-white font-bold">
                      {(hostName?.[0] || 'H').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-on-surface truncate">{hostName}</p>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        <Crown size={10} /> Host
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/50 truncate">
                      Host của phòng
                    </p>
                  </div>
                </div>
              )}
              {participants.map((p) => {
                const isProcessing = processingIds.has(p.id);
                if (p.id === hostId) return null;
                return (
                  <div key={p.id} className="flex items-center gap-3 p-4 bg-surface-container rounded-2xl transition-all hover:bg-surface-container-high">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback className="bg-primary-fixed text-on-primary-fixed font-bold">{p.fullName?.[0]?.toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">{p.fullName}</p>
                      <p className="text-[10px] text-on-surface-variant/50 truncate">{p.isAudioMuted ? 'Tắt mic' : 'Bật mic'} • {p.isVideoMuted ? 'Tắt Camera' : 'Bật Camera'}</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button size="icon" onClick={() => handleKick(p.id)} disabled={isProcessing || p.id === myId} className="w-9 h-9 rounded-xl bg-error/10 text-error hover:bg-error hover:text-white transition-all" aria-label={`Kick ${p.fullName}`}>
                        {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <UserX size={16} />}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <InviteUserDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          roomCode={roomCode}
        />
      </SheetContent>
    </Sheet>
  );
}

export default ParticipantsPanel;
