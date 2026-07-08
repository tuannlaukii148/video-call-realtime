import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { getSocket } from '@/socket/socket';
import { ROOM_EVENTS, MEDIA_EVENTS } from '@/socket/events';
import { useMeetingStore } from '@/stores/meetingStore';
import { useMediaStore } from '@/stores/mediaStore';
import { useAuthStore } from '@/stores/useAuthStore';
import type { WaitingUser } from '@/types';

/**
 * Hook xử lý tất cả room-level socket events trong MeetingScreen.
 * Quản lý waiting list (host-side), user join/leave notifications,
 * force disconnect, room ended events, và media state sync.
 */
export function useRoomEvents(roomCode: string | null, onForceDisconnect?: () => void) {
  const socket = getSocket();
  const navigate = useNavigate();
  const myUserId = useAuthStore((s) => s.user?._id);
  const {
    addWaitingUser,
    removeWaitingUser,
    addParticipant,
    removeParticipant,
    updateParticipantMedia,
    updateParticipantFilter,
    setScreenSharingUserId,
    clearParticipantScreenStream,
    setStatus,
    setIsRecording,
    setHostId,
    setIsHost,
    reset,
    setSelectedFilter,
  } = useMeetingStore();

  useEffect(() => {
    if (!roomCode || !myUserId) return;

    // Host receives approval requests from users trying to join
    const handleRequestApproval = (data: {
      userId: string;
      memberId: string;
      userName?: string;
      message?: string;
    }) => {
      const waitingUser: WaitingUser = {
        id: data.userId,
        fullName: data.userName || 'Unknown User',
        socketId: '',
        memberId: data.memberId,
      };
      addWaitingUser(waitingUser);
      toast.info(`${waitingUser.fullName} is requesting to join`);
    };

    // Khi user được approve và join vào room
    const handleUserJoined = (data: {
      userId: string;
      userName?: string;
      user?: { _id: string; fullName?: string; full_name?: string };
      message?: string;
      isSelf?: boolean;
      isRecording?: boolean;
      existingParticipants?: Array<{ userId: string; userName: string }>;
    }) => {
      // isSelf: cho approved user — useLiveKit xử lý LiveKit connection,
      // ở đây chỉ cập nhật status
      if (data.isSelf) {
        setStatus('in-room');
        if (data.isRecording !== undefined) {
          setIsRecording(data.isRecording);
        }
        // Add existing participants vào store
        if (data.existingParticipants) {
          data.existingParticipants.forEach(p => {
            addParticipant({
              id: p.userId,
              fullName: p.userName,
              isActive: true,
              isAudioMuted: false,
              isVideoMuted: false,

            });
          });
        }
        toast.success(data.message || 'Bạn đã tham gia phòng họp!');
        return;
      }

      const uId = data.userId || data.user?._id;
      if (!uId) return;

      // Bỏ qua nếu là chính mình (trường hợp broadcast)
      if (uId === myUserId) return;

      const fullName =
        data.userName ||
        data.user?.fullName ||
        data.user?.full_name ||
        'Guest';

      // Xóa khỏi waiting list (host-side) và thêm vào participants
      removeWaitingUser(uId);
      addParticipant({
        id: uId,
        fullName,
        isActive: true,
        isAudioMuted: false,
        isVideoMuted: false,
      });

      toast.success(`${fullName} đã tham gia phòng họp`);
    };

    // Khi user rời phòng
    const handleUserLeft = (data: { userId: string; message?: string }) => {
      if (data.userId && data.userId !== myUserId) {
        removeParticipant(data.userId);
      }
    };

    // Host rejects a user
    const handleUserRejected = (data: {
      memberId?: string;
      userId?: string;
      message?: string;
    }) => {
      if (data.userId) {
        removeWaitingUser(data.userId);
      }
    };

    // Force disconnect (kicked)
    const handleForceDisconnect = () => {
      toast.error('You have been removed from the meeting');
      useMediaStore.getState().cleanup();
      reset();
      onForceDisconnect?.();
      navigate('/', { replace: true });
    };

    const handleUserKicked = () => {
      toast.error('You have been removed from the meeting');
      useMediaStore.getState().cleanup();
      reset();
      onForceDisconnect?.();
      navigate('/', { replace: true });
    };

    // Room ended by host
    const handleRoomEnded = () => {
      toast.info('The meeting has ended');
      setStatus('ended');
      // Cleanup media tracks (camera, mic, screen share)
      useMediaStore.getState().cleanup();
      onForceDisconnect?.();
      reset();
      navigate('/', { replace: true });
    };

    const handleHostTransferred = (data: {
      previousHostId?: string;
      newHostId?: string;
      message?: string;
    }) => {
      if (!data.newHostId) return;
      setHostId(data.newHostId);
      setIsHost(data.newHostId === myUserId);

      if (data.newHostId === myUserId) {
        toast.success('You are now the host');
        return;
      }

      if (data.previousHostId === myUserId) {
        toast.info('Host role has been transferred');
      }
    };

    const handleSocketDisconnect = (reason: string) => {
      if (reason === 'io server disconnect' || reason === 'transport close' || reason === 'transport error') {
        toast.error('You have been removed from the meeting');
        useMediaStore.getState().cleanup();
        reset();
        onForceDisconnect?.();
        navigate('/', { replace: true });
      }
    };

    // =========================================================================
    // MEDIA STATE SYNC — mic/cam toggle + screen share
    // =========================================================================

    const handleMediaToggle = (data: {
      userId: string;
      isAudioMuted: boolean;
      isVideoMuted: boolean;
    }) => {
      if (data.userId === myUserId) return;
      updateParticipantMedia(data.userId, {
        isAudioMuted: data.isAudioMuted,
        isVideoMuted: data.isVideoMuted,
      });
    };

    const handleScreenShareStart = (data: {
      userId: string;
      userName?: string;
    }) => {
      setScreenSharingUserId(data.userId);
      const name = data.userName || 'Someone';
      toast.info(`${name} is sharing their screen`);
    };

    const handleScreenShareStop = (data: { userId: string }) => {
      setScreenSharingUserId(null);
      clearParticipantScreenStream(data.userId);
    };

    // Sync selected video filter across participants
    const handleFilterChange = (data: { userId: string; filter: string }) => {
      if (data.userId === myUserId) {
        setSelectedFilter(data.filter as any);
        return;
      }

      updateParticipantFilter(data.userId, data.filter as any);
    };

    socket.on(ROOM_EVENTS.REQUEST_APPROVAL, handleRequestApproval);
    socket.on(ROOM_EVENTS.USER_JOINED, handleUserJoined);
    socket.on(ROOM_EVENTS.USER_LEFT, handleUserLeft);
    socket.on(ROOM_EVENTS.USER_REJECTED, handleUserRejected);
    socket.on(ROOM_EVENTS.FORCE_DISCONNECT, handleForceDisconnect);
    socket.on(ROOM_EVENTS.USER_KICKED, handleUserKicked);
    socket.on(ROOM_EVENTS.ENDED, handleRoomEnded);
    socket.on(ROOM_EVENTS.HOST_TRANSFERRED, handleHostTransferred);
    socket.on(MEDIA_EVENTS.TOGGLE, handleMediaToggle);
    socket.on(MEDIA_EVENTS.SCREEN_SHARE_START, handleScreenShareStart);
    socket.on(MEDIA_EVENTS.SCREEN_SHARE_STOP, handleScreenShareStop);
    socket.on(ROOM_EVENTS.FILTER_CHANGE, handleFilterChange);
    socket.on('disconnect', handleSocketDisconnect);

    return () => {
      socket.off(ROOM_EVENTS.REQUEST_APPROVAL, handleRequestApproval);
      socket.off(ROOM_EVENTS.USER_JOINED, handleUserJoined);
      socket.off(ROOM_EVENTS.USER_LEFT, handleUserLeft);
      socket.off(ROOM_EVENTS.USER_REJECTED, handleUserRejected);
      socket.off(ROOM_EVENTS.FORCE_DISCONNECT, handleForceDisconnect);
      socket.off(ROOM_EVENTS.USER_KICKED, handleUserKicked);
      socket.off(ROOM_EVENTS.ENDED, handleRoomEnded);
      socket.off(ROOM_EVENTS.HOST_TRANSFERRED, handleHostTransferred);
      socket.off(MEDIA_EVENTS.TOGGLE, handleMediaToggle);
      socket.off(MEDIA_EVENTS.SCREEN_SHARE_START, handleScreenShareStart);
      socket.off(MEDIA_EVENTS.SCREEN_SHARE_STOP, handleScreenShareStop);
      socket.off(ROOM_EVENTS.FILTER_CHANGE, handleFilterChange);
      socket.off('disconnect', handleSocketDisconnect);
    };
  }, [
    socket,
    roomCode,
    myUserId,
    addWaitingUser,
    removeWaitingUser,
    addParticipant,
    removeParticipant,
    updateParticipantMedia,
    setScreenSharingUserId,
    clearParticipantScreenStream,
    updateParticipantFilter,
    setStatus,
    setHostId,
    setIsHost,
    reset,
    navigate,
    setSelectedFilter,
  ]);
}
