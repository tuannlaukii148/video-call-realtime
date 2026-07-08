import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSocket } from "@/hooks/useSocket";
import { useLiveKit } from "@/hooks/meetings/useLiveKit";
import { useRoomEvents } from "@/hooks/meetings/useRoomEvents";
import { useChatEvents } from "@/hooks/chat/useChatEvents";
import { useRecording } from "@/hooks/meetings/useRecording";
import { useMediaStore } from "@/stores/mediaStore";
import { useMeetingStore } from "@/stores/meetingStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useVideoFilter } from "@/hooks/filter/useVideoFilter";
import { useFilterStore } from "@/stores/filterStore";
import { ROOM_EVENTS, MEDIA_EVENTS } from "@/socket/events";
import { VIDEO_FILTERS, VideoFilterKey } from "@/constants/videoFilters";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import {
  Mic, MicOff, Video, VideoOff, ScreenShare, ScreenShareOff,
  PhoneOff, MessageSquare, Users, Sparkles, MonitorUp, Circle, Badge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WaitingRoomPanel } from "@/components/pages/meeting/WaitingRoomPanel";
import { ChatPanel } from "@/components/pages/meeting/ChatPanel";
import { EndMeetingDialog } from "@/components/pages/meeting/EndMeetingDialog";
import ParticipantsPanel from '@/components/pages/meeting/ParticipantsPanel';
import { RecordingBanner } from "@/components/pages/meeting/RecordingBanner";
import { RecordingConsentDialog } from "@/components/pages/meeting/RecordingConsentDialog";
import { StopRecordingDialog } from "@/components/pages/meeting/StopRecordingDialog";
import FilterPanel from "@/components/pages/meeting/FilterPanel";
import { ScreenShareVideo } from "@/components/pages/meeting/ScreenShareVideo";
import { SelfPreviewVideo } from "@/components/pages/meeting/SelfPreviewVideo";
import { VideoTile } from "@/components/pages/meeting/VideoTile";
import { ControlButton } from "@/components/pages/meeting/ControlButton";
import { roomService } from "@/services/roomService";

export function MeetingScreen() {
  const { id } = useParams<{ id: string }>();
  const roomCode = id?.toUpperCase();
  const socket = useSocket();
  const authUser = useAuthStore((state) => state.user);
  const myUserId = authUser?._id;
  const navigate = useNavigate();

  const {
    room,
    isConnected,
    toggleCamera: lkToggleCamera,
    toggleMicrophone: lkToggleMicrophone,
    toggleScreenShare: lkToggleScreenShare,
    disconnect: lkDisconnect,
  } = useLiveKit(roomCode || null);
  useRoomEvents(roomCode || null, lkDisconnect);
  const { sendMessage, editMessage, deleteMessage, addReaction, removeReaction } = useChatEvents(roomCode || null);

  useVideoFilter();

  const {
    isRecording,
    formattedDuration,
    isProcessing,
    startRecording,
    stopRecording,
    showConsentDialog,
    setShowConsentDialog,
  } = useRecording();

  const {
    localStream, isAudioMuted, isVideoMuted,
    screenStream, isScreenSharing,
  } = useMediaStore();

  const {
    participants, isHost, waitingList, hostId,
    removeWaitingUser, screenSharingUserId, setScreenSharingUserId,
  } = useMeetingStore();

  const messageCount = useMeetingStore((s) => s.messages.length);
  const colorFilter = useFilterStore((s) => s.colorFilter);
  const activeAiFilter = useFilterStore((s) => s.activeFilter);
  // When AI filter pipeline is active, canvas already handles color — don't double-apply CSS filter
  const effectiveCssFilter = activeAiFilter !== "none" ? undefined : VIDEO_FILTERS[colorFilter].css;

  const [showChat, setShowChat] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [showStopRecordingDialog, setShowStopRecordingDialog] = useState(false);
  const [isEndingMeeting, setIsEndingMeeting] = useState(false);
  const [transferringHostId, setTransferringHostId] = useState<string | null>(null);

  // Sync color filter across socket room when local colorFilter changes
  useEffect(() => {
    if (socket && roomCode && colorFilter) {
      socket.emit(ROOM_EVENTS.FILTER_CHANGE, { roomCode, userId: myUserId, filter: colorFilter });
    }
  }, [socket, roomCode, myUserId, colorFilter]);
  const prevMessageCountRef = useRef(messageCount);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);

  // Track unread messages when chat panel is closed
  useEffect(() => {
    if (messageCount > prevMessageCountRef.current) {
      if (!showChat) {
        setUnreadCount((c) => c + (messageCount - prevMessageCountRef.current));
      }
    }
    prevMessageCountRef.current = messageCount;
  }, [messageCount, showChat]);

  // Listen for invitation decline notifications (only if user is host)
  useEffect(() => {
    if (!isHost || !socket) return;

    const handleDecline = (data: { roomCode: string; userName: string }) => {
      toast.warning(`${data.userName} declined your invitation to join room ${data.roomCode}`);
    };

    socket.on(ROOM_EVENTS.INVITE_DECLINED, handleDecline);

    return () => {
      socket.off(ROOM_EVENTS.INVITE_DECLINED, handleDecline);
    };
  }, [isHost, socket]);

  const handleToggleChat = useCallback(() => {
    const next = !showChat;
    setShowChat(next);
    if (next) setUnreadCount(0);
  }, [showChat]);
  const { reset } = useMeetingStore();
  const { cleanup: cleanupMedia } = useMediaStore();

  // =========================================================================
  // LEAVE / END MEETING HANDLERS
  // =========================================================================

  const handleLeaveMeeting = useCallback(() => {
    // 1. Emit socket leave event
    socket.emit(ROOM_EVENTS.USER_LEFT, { roomCode, userId: myUserId });
    // 2. Disconnect from LiveKit room
    lkDisconnect();
    // 3. Cleanup media tracks (camera, mic, screen share)
    cleanupMedia();
    // 4. Reset meeting store
    reset();
    // 5. Navigate home
    toast.info('Bạn đã rời khỏi Meeting');
    navigate('/', { replace: true });
  }, [socket, roomCode, myUserId, lkDisconnect, cleanupMedia, reset, navigate]);

  const handleEndMeetingForAll = useCallback(async () => {
    if (isEndingMeeting) return; // Double-click prevention
    setIsEndingMeeting(true);
    try {
      // 1. Call REST API to update DB + cleanup Redis
      await roomService.endRoom(roomCode!);
      // 2. Broadcast room:ended via socket to all participants
      socket.emit(ROOM_EVENTS.ENDED, { roomCode });
      // 3. Disconnect from LiveKit room
      lkDisconnect();
      // 4. Cleanup media tracks
      cleanupMedia();
      // 5. Reset meeting store
      reset();
      // 6. Navigate home
      toast.success('Meeting đã kết thúc cho tất cả mọi người');
      navigate('/', { replace: true });
    } catch (error) {
      toast.error('Lỗi khi kết thúc Meeting. Vui lòng thử lại.');
      setIsEndingMeeting(false);
    }
  }, [isEndingMeeting, roomCode, socket, lkDisconnect, cleanupMedia, reset, navigate]);

  const handleTransferHost = useCallback(
    async (newHostId: string, participantName: string) => {
      if (!roomCode || !isHost || transferringHostId) return;

      const confirmed = window.confirm(`Chuyển vai trò Host cho ${participantName}?`);
      if (!confirmed) return;

      setTransferringHostId(newHostId);
      try {
        await roomService.transferHost(roomCode, newHostId);
      } catch (error) {
        toast.error('Lỗi khi chuyển vai trò Host');
      } finally {
        setTransferringHostId(null);
      }
    },
    [roomCode, isHost, transferringHostId]
  );

  // Is someone (me or remote) sharing screen?
  const isAnyoneSharing = isScreenSharing || !!screenSharingUserId;
  const isMeSharing = isScreenSharing;

  // Find the sharing participant's info (for remote share)
  const sharingParticipant = screenSharingUserId
    ? participants.find((p) => p.id === screenSharingUserId)
    : null;

  const presenterName = isMeSharing
    ? `${authUser?.full_name || "Bạn"} (Bạn, đang trình bày)`
    : sharingParticipant?.fullName || "Ai đó";

  const meetingStatus = useMeetingStore((s) => s.status);



  // Grid layout logic: show up to 4 tiles. 1 -> full, 2 -> halves, 3-4 -> 2x2
  const totalParticipants = 1 + participants.length; // include local
  const tilesToShow = Math.min(4, totalParticipants);
  const gridClass = tilesToShow === 1
    ? "grid-cols-1 grid-rows-1"
    : tilesToShow === 2
      ? "grid-cols-2 grid-rows-1"
      : "grid-cols-2 grid-rows-2";
  useEffect(() => {
    // Only redirect if we were previously in-room and hostId became null
    // (e.g. store was reset). Don't redirect on initial mount when store hasn't hydrated.
    if (!hostId && meetingStatus === 'idle') {
      navigate(`/lobby?code=${roomCode}`);
      socket.emit(ROOM_EVENTS.USER_LEFT, { roomCode, userId: myUserId });
    }
  }, [roomCode, hostId, meetingStatus]);

  // Wrapped toggle handlers — emit socket event after toggle
  const handleToggleAudio = useCallback(async () => {
    if (isConnected) {
      await lkToggleMicrophone();
    } else {
      // Fallback when LiveKit not connected: toggle local audio tracks directly
      const ms = useMediaStore.getState().localStream;
      const currentlyMuted = useMediaStore.getState().isAudioMuted;
      if (ms && ms.getAudioTracks().length > 0) {
        ms.getAudioTracks().forEach(t => { t.enabled = currentlyMuted; });
        useMediaStore.getState().setIsAudioMuted(!currentlyMuted);
      }
    }

    // Read current state from store and emit to others
    const { isAudioMuted, isVideoMuted } = useMediaStore.getState();
    socket.emit(MEDIA_EVENTS.TOGGLE, {
      roomCode, userId: myUserId,
      isAudioMuted,
      isVideoMuted,
    });
  }, [socket, roomCode, myUserId, lkToggleMicrophone]);


  const handleToggleVideo = useCallback(async () => {
    if (isConnected) {
      await lkToggleCamera();
    } else {
      // Fallback when LiveKit not connected: toggle local video tracks directly
      const ms = useMediaStore.getState().localStream;
      const currentlyVideoMuted = useMediaStore.getState().isVideoMuted;
      if (ms && ms.getVideoTracks().length > 0) {
        ms.getVideoTracks().forEach(t => { t.enabled = currentlyVideoMuted; });
        useMediaStore.getState().setIsVideoMuted(!currentlyVideoMuted);
      }
    }

    const { isAudioMuted, isVideoMuted } = useMediaStore.getState();
    socket.emit(MEDIA_EVENTS.TOGGLE, {
      roomCode, userId: myUserId,
      isAudioMuted,
      isVideoMuted,
    });
  }, [socket, roomCode, myUserId, lkToggleCamera]);

  // Screen share handlers
  const handleToggleScreenShare = useCallback(async () => {
    if (!isScreenSharing && screenSharingUserId) {
      toast.error("Có người khác đang chia sẻ màn hình");
      return;
    }

    const success = await lkToggleScreenShare();
    if (!success) return; // User cancelled picker

    if (!isScreenSharing) {
      // Started sharing
      setScreenSharingUserId(myUserId || null);
      socket.emit(MEDIA_EVENTS.SCREEN_SHARE_START, {
        roomCode, userId: myUserId, userName: authUser?.full_name,
      });
    } else {
      // Stopped sharing
      setScreenSharingUserId(null);
      socket.emit(MEDIA_EVENTS.SCREEN_SHARE_STOP, { roomCode, userId: myUserId });
    }
  }, [socket, roomCode, myUserId, authUser, isScreenSharing, screenSharingUserId, lkToggleScreenShare, setScreenSharingUserId]);

  // Keyboard shortcuts: 'm' toggle mic, 'v' toggle camera
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // ignore when typing in inputs
      const active = document.activeElement as HTMLElement | null;
      const tag = active?.tagName?.toLowerCase() || '';
      if (tag === 'input' || tag === 'textarea' || active?.isContentEditable) return;
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        handleToggleAudio();
      }
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        handleToggleVideo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleToggleAudio, handleToggleVideo]);

  // Get screen share stream to display
  const screenShareStream = isMeSharing
    ? screenStream
    : sharingParticipant?.screenStream || null;

  const totalVisibleTiles = participants.length + 1;
  const getGridClass = (count: number) => {
    if (count === 1) return "grid-cols-1 grid-rows-1";
    if (count === 2) return "grid-cols-1 grid-rows-2 md:grid-cols-2 md:grid-rows-1";
    if (count >= 3 && count <= 4) return "grid-cols-2 grid-rows-2";
    if (count >= 5 && count <= 6) return "grid-cols-2 grid-rows-3 md:grid-cols-3 md:grid-rows-2";
    return "grid-cols-3 md:grid-cols-4";
  };

  return (
    <div className="h-screen flex flex-col bg-surface overflow-hidden">
      {/* Header */}
      <header className="bg-surface-container-low/50 backdrop-blur-xl px-3 md:px-8 py-3 md:py-4 flex justify-between items-center border-b border-outline-variant/10 z-50">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <h1 className="text-base md:text-2xl font-bold tracking-tighter text-orange-900 truncate">WebCall</h1>
          <div className="px-2 md:px-3 py-1 bg-primary/10 rounded-full flex items-center gap-1.5 shrink-0">
            <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-[9px] md:text-[10px] font-bold text-primary uppercase tracking-widest">
              <span className="hidden sm:inline">Trực tiếp: </span>{roomCode}
            </span>
          </div>
          {/* Recording indicator — blinking red dot in header */}
          <RecordingBanner isRecording={isRecording} formattedDuration={formattedDuration} />
        </div>
        <div className="flex items-center gap-2 md:gap-6 shrink-0">
          <div className="hidden sm:flex items-center gap-2 bg-surface-container rounded-full px-3 py-1.5">
            <span className="text-sm font-bold text-on-surface">{participants.length + 1} người</span>
          </div>
          <div className="flex items-center gap-2 bg-white/50 px-2 md:px-4 py-1.5 md:py-2 rounded-full border border-outline-variant/20">
            <Avatar className="w-7 h-7 md:w-8 md:h-8">
              <AvatarFallback>{authUser?.full_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <span className="font-bold text-orange-900 text-sm hidden md:inline">{authUser?.full_name || "Bạn"}</span>
            {isHost && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 text-[10px] px-2">Host</Badge>
            )}
          </div>
        </div>
      </header>

      {/* Presenter Banner */}
      <AnimatePresence>
        {isMeSharing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary/10 border-b border-primary/20 px-8 py-3 flex items-center justify-between z-40"
          >
            <div className="flex items-center gap-3">
              <MonitorUp size={18} className="text-primary" />
              <span className="text-sm font-bold text-primary">{presenterName}</span>
              <span className="text-xs text-primary/60">· Âm thanh trình bày</span>
            </div>
            <Button
              onClick={handleToggleScreenShare}
              variant="destructive"
              size="sm"
              className="rounded-full px-6 font-bold text-xs"
            >
              Dừng trình bày
            </Button>
          </motion.div>
        )}
      </AnimatePresence>



      <div className="flex-1 flex overflow-hidden p-2 pb-24 md:p-6 gap-2 md:gap-6 relative">
        {/* ============ PRESENTATION MODE ============ */}
        {isAnyoneSharing ? (
          <div className="flex-1 flex gap-4">
            {/* Main: Screen Share Tile */}
            <div className="flex-1 relative rounded-[2.5rem] overflow-hidden bg-stone-900 shadow-sm border border-outline-variant/10">
              {screenShareStream ? (
                <ScreenShareVideo stream={screenShareStream} />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/40">
                  <MonitorUp size={64} className="opacity-30" />
                </div>
              )}
              <div className="absolute bottom-6 left-6 flex items-center gap-3 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-sm border border-white/10">
                <MonitorUp size={14} className="text-primary" />
                <span className="font-bold">Đang trình bày: {presenterName}</span>
              </div>
            </div>

            {/* Right Filmstrip */}
            <div className="w-48 flex flex-col gap-3 overflow-y-auto scrollbar-hide">
              <VideoTile
                name={authUser?.full_name || "Bạn"}
                stream={localStream}
                isMuted={isAudioMuted}
                isVideoOff={isVideoMuted}
                isLocal={true}
                isHost={isHost}
                compact
                filterCss={effectiveCssFilter}
              />
              {participants.map((p) => (
                <VideoTile
                  key={p.id}
                  name={p.fullName}
                  stream={p.stream}
                  isMuted={p.isAudioMuted}
                  isVideoOff={p.isVideoMuted}
                  compact
                  showTransferAction={isHost}
                  isTransferPending={transferringHostId === p.id}
                  onTransferHost={() => handleTransferHost(p.id, p.fullName)}
                  filterCss={p.videoFilter ? VIDEO_FILTERS[p.videoFilter as VideoFilterKey]?.css : undefined}
                />
              ))}
            </div>
          </div>
        ) : (
          /* ============ NORMAL GRID MODE ============ */
          <div
            className={`flex-1 grid gap-2 md:gap-4 transition-all duration-500 ${showChat ? "md:mr-0" : ""} ${getGridClass(totalVisibleTiles)}`}
          >
            <VideoTile
              name={authUser?.full_name || "Bạn"}
              stream={localStream}
              isMuted={isAudioMuted}
              isVideoOff={isVideoMuted}
              isLocal={true}
              isHost={isHost}
              filterCss={effectiveCssFilter}
            />
            {participants.map((p) => (
              <VideoTile
                key={p.id}
                name={p.fullName}
                stream={p.stream}
                isMuted={p.isAudioMuted}
                isVideoOff={p.isVideoMuted}
                showTransferAction={isHost}
                isTransferPending={transferringHostId === p.id}
                onTransferHost={() => handleTransferHost(p.id, p.fullName)}
                filterCss={p.videoFilter ? VIDEO_FILTERS[p.videoFilter as VideoFilterKey]?.css : undefined}
              />
            ))}
          </div>
        )}
        {/* Chat Sidebar */}
        <AnimatePresence>
          {showChat && roomCode && (
            <ChatPanel
              roomCode={roomCode}
              onClose={() => setShowChat(false)}
              sendMessage={sendMessage}
              editMessage={editMessage}
              deleteMessage={deleteMessage}
              addReaction={addReaction}
              removeReaction={removeReaction}
            />
          )}
        </AnimatePresence>
        {/* Filters Panel */}
        <FilterPanel showFilters={showFilters} setShowFilters={setShowFilters} />
      </div>

      {/* Controls Bar */}
      <div className="fixed bottom-0 left-0 w-full md:relative bg-white/90 md:bg-surface-container-low/30 backdrop-blur-xl border-t border-outline-variant/10 md:border-none flex items-center px-3 py-3 md:px-8 md:py-4 z-50">
        <div className="flex items-center justify-start md:justify-center gap-2 md:gap-3 w-full overflow-x-auto scrollbar-hide px-2">
          {/* Mic */}
          <ControlButton
            icon={isAudioMuted ? <MicOff size={20} /> : <Mic size={20} />}
            onClick={handleToggleAudio}
            active={isAudioMuted}
          />
          {/* Camera */}
          <ControlButton
            icon={isVideoMuted ? <VideoOff size={20} /> : <Video size={20} />}
            onClick={handleToggleVideo}
            active={isVideoMuted}
          />
          {/* Share Screen — shown on all, smaller on mobile */}
          <ControlButton
            icon={isScreenSharing ? <ScreenShareOff size={20} /> : <ScreenShare size={20} />}
            onClick={handleToggleScreenShare}
            active={isScreenSharing}
            className={isScreenSharing
              ? "bg-error text-white shadow-lg shadow-error/20 border-none hover:bg-error/90"
              : ""
            }
          />
          {/* Chat */}
          <ControlButton icon={<MessageSquare size={20} />} onClick={handleToggleChat} active={showChat} badge={unreadCount > 0 ? unreadCount : undefined} />
          {/* Waiting Room — host only */}
          {isHost && roomCode && <WaitingRoomPanel roomCode={roomCode} waitingList={waitingList} removeWaitingUser={removeWaitingUser} />}
          {/* Participants — host only */}
          {isHost && roomCode && <ParticipantsPanel roomCode={roomCode} />}
          {/* Filters */}
          <ControlButton icon={<Sparkles size={20} />} onClick={() => setShowFilters(!showFilters)} active={showFilters} />
          {/* Recording — host only */}
          {isHost && (
            <ControlButton
              icon={
                isRecording ? (
                  <div className="flex items-center gap-1 px-0.5">
                    <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse shrink-0" />
                    <span className="text-[10px] font-bold text-red-600 tracking-tight hidden md:inline">{formattedDuration}</span>
                  </div>
                ) : (
                  <Circle size={20} className="fill-stone-600/30 text-stone-600 stroke-[3px]" />
                )
              }
              onClick={isRecording ? () => setShowStopRecordingDialog(true) : startRecording}
              active={isRecording}
              className={isRecording ? "border-red-200 bg-red-50 hover:bg-red-100 shadow-lg shadow-red-500/10 text-red-600" : ""}
            />
          )}
          {/* Divider */}
          <div className="w-px h-8 bg-outline-variant/30 mx-1" />
          {/* End Call */}
          <ControlButton
            icon={<PhoneOff size={20} />}
            className="bg-error text-white shadow-lg shadow-error/20 border-none hover:bg-error/90"
            onClick={() => setShowEndDialog(true)}
          />
        </div>

        {/* Self Preview Floating — hide during presentation mode */}
        {!isAnyoneSharing && (
          <div className="fixed bottom-24 right-4 md:absolute md:right-8 md:bottom-32 w-28 md:w-48 aspect-video rounded-2xl overflow-hidden border-2 border-primary shadow-2xl bg-stone-900 z-40">
            {/* Local Video Preview */}
            <div className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${localStream && !isVideoMuted ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
              {localStream && <SelfPreviewVideo stream={localStream} filterCss={effectiveCssFilter} />}
            </div>
            {/* Avatar Fallback */}
            <div className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ${localStream && !isVideoMuted ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}`}>
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-surface-container-highest text-on-surface-variant text-lg">
                  {authUser?.full_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        )}
      </div>

      {/* End Meeting Dialog */}
      <EndMeetingDialog
        open={showEndDialog}
        onOpenChange={setShowEndDialog}
        isHost={!!isHost}
        onLeave={handleLeaveMeeting}
        onEndForAll={handleEndMeetingForAll}
        isLoading={isEndingMeeting}
      />

      {/* Recording Consent Dialog — non-host participants */}
      <RecordingConsentDialog
        open={showConsentDialog}
        onOpenChange={setShowConsentDialog}
      />

      {/* Stop Recording Dialog — host confirmation */}
      <StopRecordingDialog
        open={showStopRecordingDialog}
        onOpenChange={setShowStopRecordingDialog}
        onConfirm={stopRecording}
        isProcessing={isProcessing}
        formattedDuration={formattedDuration}
      />
    </div>
  );
}

