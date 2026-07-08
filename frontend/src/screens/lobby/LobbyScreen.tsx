import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useMedia } from "@/hooks/camera/useMedia";
import { useMediaStore } from "@/stores/mediaStore";
import { useMeetingStore } from "@/stores/meetingStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useSocket } from "@/hooks/useSocket";
import { ROOM_EVENTS } from "@/socket/events";
import { roomService } from "@/services/roomService";
import { VIDEO_FILTERS, type VideoFilterKey } from "@/constants/videoFilters";
import type { Room } from "@/types";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Settings,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { WaitingScreen } from "@/components/pages/lobby/WaitingScreen";
import { TopNav } from "@/components/layout/TopNav";
import { LobbyControl } from "@/components/pages/lobby/LobbyControl";

export function LobbyScreen() {
  const [searchParams] = useSearchParams();
  const roomCode = searchParams.get("code")?.toUpperCase() || null;

  const { requestMedia } = useMedia();
  const { localStream, isAudioMuted, isVideoMuted, setIsAudioMuted, setIsVideoMuted } =
    useMediaStore();
  const { setRoomCode, setHostId, setIsHost, setStatus, status, setMemberId, addParticipant } =
    useMeetingStore();
  const authUser = useAuthStore((s) => s.user);
  const socket = useSocket();
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();

  const [roomInfo, setRoomInfo] = useState<Room | null>(null);
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [joining, setJoining] = useState(false);
  const [displayName, setDisplayName] = useState(authUser?.full_name || "");
  const [copied, setCopied] = useState(false);

  const getInitialFilter = () => {
    try {
      const url = new URL(window.location.href);
      const f = url.searchParams.get('filter');
      if (f && (f === 'original' || f === 'warm' || f === 'mono' || f === 'cool' || f === 'golden')) {
        return f as VideoFilterKey;
      }
    } catch { }
    const saved = sessionStorage.getItem('selectedFilter');
    if (saved && (saved === 'original' || saved === 'warm' || saved === 'mono' || saved === 'cool' || saved === 'golden')) {
      return saved as VideoFilterKey;
    }
    return 'original' as VideoFilterKey;
  };

  const [selectedFilter, setSelectedFilter] = useState<VideoFilterKey>(getInitialFilter);

  // Fetch room info
  useEffect(() => {
    if (!roomCode) {
      navigate("/", { replace: true });
      return;
    }

    const fetchRoom = async () => {
      try {
        const res = await roomService.getRoomInfo(roomCode);
        if (res.success && res.room) {
          setRoomInfo(res.room);
          setRoomCode(roomCode);

          const hostId =
            typeof res.room.host_id === "object"
              ? res.room.host_id._id
              : res.room.host_id;
          setHostId(hostId);
          setIsHost(hostId === authUser?._id);
        }
      } catch (err: unknown) {
        const error = err as {
          response?: { status?: number; data?: { message?: string } };
        };
        if (error.response?.status === 404) {
          toast.error("Không tìm thấy phòng");
        } else if (error.response?.status === 409) {
          toast.error("Meeting này đã kết thúc");
        } else {
          toast.error("Lỗi khi tải thông tin phòng");
        }
        navigate("/", { replace: true });
      } finally {
        setLoadingRoom(false);
      }
    };

    fetchRoom();
  }, [
    roomCode,
    navigate,
    setRoomCode,
    setHostId,
    setIsHost,
    authUser,
  ]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.style.filter = VIDEO_FILTERS[selectedFilter].css;
    }

    const setFilter = () => {
      try {
        sessionStorage.setItem('selectedFilter', selectedFilter);
        const url = new URL(window.location.href);
        url.searchParams.set('filter', selectedFilter);
        window.history.pushState({ path: url.href }, '', url.href);
        if (videoRef.current) {
          videoRef.current.style.filter = VIDEO_FILTERS[selectedFilter].css;
        }
      } catch (e) {
        console.error(e);
      }
    }

    setFilter();
  }, [selectedFilter])

  // Request media on mount
  useEffect(() => {
    requestMedia();
  }, [requestMedia]);

  // Attach local stream to video element
  useEffect(() => {
    if (videoRef.current && localStream && !isVideoMuted) {
      videoRef.current.srcObject = localStream;
    }
  }, [localStream, isVideoMuted]);

  // Listen for socket events when joining
  useEffect(() => {
    if (!socket || !roomCode) return;

    const handlePending = () => {
      setStatus("waiting");
    };

    const handleUserJoined = (data: {
      success?: boolean;
      userId?: string;
      isSelf?: boolean;
      existingParticipants?: Array<{ userId: string; userName: string }>;
    }) => {
      // Helper: store existing participants before navigate
      const storeParticipants = () => {
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
      };

      // Trường hợp 1: Không cần approve — server gửi success
      if (data.success) {
        storeParticipants();
        setStatus('in-room');
        navigate(`/meeting/${roomCode}`, { replace: true });
        return;
      }

      // Trường hợp 2: User được host approve — server gửi isSelf: true
      if (data.isSelf) {
        storeParticipants();
        setStatus('in-room');
        navigate(`/meeting/${roomCode}`, { replace: true });
        return;
      }

      // Các event khác (broadcast khi ai đó join) — bỏ qua ở Lobby
    };

    const handleUserRejected = () => {
      setStatus("idle");
      setJoining(false);
      toast.error("Yêu cầu tham gia của bạn đã bị Host từ chối");
      navigate("/", { replace: true });
    };

    const handleUserKicked = () => {
      setStatus("idle");
      setJoining(false);
      toast.error("Bạn đã bị xóa khỏi Meeting");
      navigate("/", { replace: true });
    };

    const handleError = (data: { message?: string }) => {
      toast.error(data.message || "Đã xảy ra lỗi");
      setJoining(false);
    };

    socket.on(ROOM_EVENTS.PENDING, handlePending);
    socket.on(ROOM_EVENTS.USER_JOINED, handleUserJoined);
    socket.on(ROOM_EVENTS.USER_REJECTED, handleUserRejected);
    socket.on(ROOM_EVENTS.USER_KICKED, handleUserKicked);
    socket.on(ROOM_EVENTS.FORCE_DISCONNECT, handleUserKicked);
    socket.on(ROOM_EVENTS.ERROR, handleError);

    return () => {
      socket.off(ROOM_EVENTS.PENDING, handlePending);
      socket.off(ROOM_EVENTS.USER_JOINED, handleUserJoined);
      socket.off(ROOM_EVENTS.USER_REJECTED, handleUserRejected);
      socket.off(ROOM_EVENTS.USER_KICKED, handleUserKicked);
      socket.off(ROOM_EVENTS.FORCE_DISCONNECT, handleUserKicked);
      socket.off(ROOM_EVENTS.ERROR, handleError);
    };
  }, [socket, roomCode, authUser, navigate, setStatus, addParticipant]);

  const handleJoin = async () => {
    if (!roomCode || !authUser) return;
    setJoining(true);

    try {
      // Call REST API to register join
      const res = await roomService.joinRoom(roomCode);
      console.log('res', res);
      const { roomMember } = res;
      setMemberId(roomMember._id);
      if (res.status === "pending") {
        // Need approval — emit socket event and show waiting screen
        socket.emit(ROOM_EVENTS.JOIN, {
          userId: authUser._id,
          roomCode,
          user: authUser,
        });
        setStatus("waiting");
      } else if (res.status === "joined") {
        // No approval needed — emit socket and go directly to meeting
        socket.emit(ROOM_EVENTS.JOIN, {
          userId: authUser._id,
          roomCode,
          user: authUser,
        });
        setStatus("in-room");
        navigate(`/meeting/${roomCode}`, { replace: true });
      }
    } catch (err: unknown) {
      const error = err as {
        response?: { data?: { message?: string } };
      };
      toast.error(error.response?.data?.message || "Lỗi khi tham gia Meeting");
      setJoining(false);
    }
  };

  const handleCopyCode = async () => {
    if (roomCode) {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      toast.success("Đã sao chép Meeting ID!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Show waiting screen if status is 'waiting'
  if (status === "waiting") {
    return <WaitingScreen />;
  }

  // Loading state
  if (loadingRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-primary" size={40} />
          <p className="text-on-surface-variant font-bold text-sm">
            Đang tải phòng...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      {/* Top Nav */}
      <TopNav />

      <main className="flex-grow flex items-center justify-center p-8 lg:p-12">
        <div className="w-full max-w-6xl flex flex-col-reverse lg:grid lg:grid-cols-12 gap-8 lg:gap-16 lg:items-center">
          {/* Left: Content */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <span className="text-primary font-bold tracking-widest text-xs uppercase">
                Phòng chờ
              </span>
              <h1 className="text-5xl md:text-6xl font-extrabold tracking-tighter text-on-surface leading-[1.1]">
                Bắt đầu<br />
                <span className="text-primary">cuộc họp</span>
              </h1>
              {roomInfo && (
                <div className="space-y-2">
                  <p className="text-on-surface-variant text-lg max-w-md">
                    {roomInfo.title}
                  </p>
                  {roomInfo.description && (
                    <p className="text-on-surface-variant/60 text-sm max-w-md">
                      {roomInfo.description}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-surface-container-low p-8 rounded-3xl space-y-6 editorial-shadow border border-outline-variant/10">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-on-surface-variant uppercase tracking-wider">
                  Tên hiển thị
                </label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="h-14 bg-surface-container-highest border-none rounded-2xl px-6 text-on-surface placeholder:text-on-surface-variant/50 focus-visible:ring-2 focus-visible:ring-primary"
                  placeholder="Chúng tôi nên gọi bạn là gì?"
                />
              </div>
              <div className="pt-4">
                <Button
                  onClick={handleJoin}
                  disabled={joining}
                  className="w-full h-16 bg-gradient-to-r from-primary to-primary-container text-white rounded-full font-bold text-xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                >
                  {joining ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={22} />
                      Đang tham gia...
                    </>
                  ) : (
                    "Tham gia Meeting"
                  )}
                </Button>

                {/* Room Code Display */}
                {roomCode && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <p className="text-[10px] text-on-surface-variant font-bold tracking-widest uppercase opacity-50">
                      Meeting ID: {roomCode}
                    </p>
                    <button
                      onClick={handleCopyCode}
                      className="text-primary/50 hover:text-primary transition-colors"
                      aria-label="Copy room code"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>
                )}

                {/* Approval badge */}
                {roomInfo?.settings?.require_approval && (
                  <p className="text-center text-[10px] text-primary/60 font-bold tracking-widest uppercase mt-3">
                    ⏳ Phòng này yêu cầu Host phê duyệt
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Video Preview */}
          <div className="lg:col-span-7 relative">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative aspect-video bg-surface-container-highest rounded-[2.5rem] overflow-hidden shadow-2xl border border-outline-variant/10 flex justify-center items-center"
            >
              {localStream && !isVideoMuted ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-stone-900 text-stone-500">
                  <VideoOff size={64} className="mb-4 opacity-50" />
                  <span>Camera đang tắt</span>
                </div>
              )}

              {/* Overlay */}
              <div className="absolute top-6 left-6 bg-surface-bright/80 backdrop-blur-md px-4 py-2 rounded-full flex items-center gap-2 border border-outline-variant/20">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-bold text-on-surface tracking-tight uppercase">
                  Xem trước camera
                </span>
              </div>



              {/* Controls */}
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-4 bg-surface-bright/90 backdrop-blur-xl rounded-full border border-outline-variant/20 shadow-2xl">
                <LobbyControl
                  icon={isAudioMuted ? <MicOff size={24} /> : <Mic size={24} />}
                  label={isAudioMuted ? "Bật mic" : "Tắt mic"}
                  active={!isAudioMuted}
                  onClick={() => {
                    localStream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
                    setIsAudioMuted(!isAudioMuted);
                  }}
                />
                <LobbyControl
                  icon={isVideoMuted ? <VideoOff size={24} /> : <Video size={24} />}
                  label={isVideoMuted ? "Bật Camera" : "Tắt Camera"}
                  active={!isVideoMuted}
                  onClick={() => {
                    localStream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
                    setIsVideoMuted(!isVideoMuted);
                  }}
                />
                <div className="w-px h-10 bg-outline-variant/30 mx-2" />
                <LobbyControl
                  icon={<Settings size={24} />}
                  label="Cài đặt"
                  onClick={() => { }}
                />
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      <footer className="w-full py-8 border-t border-outline-variant/10 bg-surface-container-low/30">
        <div className="max-w-screen-2xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-bold tracking-widest uppercase opacity-50 text-on-surface-variant">
            © WebCall.
          </p>

        </div>
      </footer>
    </div>
  );
}
