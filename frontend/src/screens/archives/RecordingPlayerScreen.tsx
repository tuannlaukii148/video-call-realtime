import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft,
  Clock,
  CalendarDays,
  User,
  MessageSquare,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import SideBar from "@/components/layout/SideBar";
import { ChatBubble } from "@/components/pages/archives/ChatBubble";
import { formatDuration, formatDate } from "@/utils/dateFormat";
import { recordingService, type Recording } from "@/services/recordingService";
import { chatService, type ChatMessage } from "@/services/chatService";



export function RecordingPlayerScreen() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [recording, setRecording] = useState<Recording | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch recording
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await recordingService.getRecording(id);
        if (!cancelled && res.recording) {
          setRecording(res.recording);
        } else if (!cancelled) {
          setError("Không tìm thấy bản ghi");
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Lỗi khi tải bản ghi");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [id]);

  // Fetch chat history when recording loads
  useEffect(() => {
    const roomCode = recording?.room?.room_code;
    if (!roomCode) return;
    let cancelled = false;

    const loadChat = async () => {
      setChatLoading(true);
      setChatError(null);
      try {
        const res = await chatService.getChatHistory(roomCode, { limit: 200 });
        if (!cancelled) {
          setMessages(res.messages || []);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setChatError("Lịch sử chat không khả dụng");
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    };

    loadChat();
    return () => { cancelled = true; };
  }, [recording?.room?.room_code]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <SideBar />
        <main className="ml-64 flex-1 flex items-center justify-center bg-surface">
          <Loader2 size={40} className="text-primary animate-spin" />
        </main>
      </div>
    );
  }

  if (error || !recording) {
    return (
      <div className="flex min-h-screen">
        <SideBar />
        <main className="ml-64 flex-1 flex flex-col items-center justify-center bg-surface gap-4">
          <div className="w-20 h-20 rounded-3xl bg-red-50 flex items-center justify-center">
            <AlertCircle size={40} className="text-error/40" />
          </div>
          <p className="font-bold text-on-surface text-lg">{error || "Không tìm thấy bản ghi"}</p>
          <Button
            onClick={() => navigate("/archives")}
            variant="outline"
            className="rounded-full px-6 font-bold"
          >
            <ArrowLeft size={16} className="mr-2" />
            Quay lại Lưu trữ
          </Button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <SideBar />

      <main className="ml-64 flex-1 flex flex-col bg-surface overflow-hidden h-screen">
        {/* Top bar */}
        <div className="px-8 py-5 border-b border-outline-variant/10 flex items-center gap-4 shrink-0">
          <Button
            onClick={() => navigate("/archives")}
            variant="ghost"
            size="sm"
            className="rounded-full"
          >
            <ArrowLeft size={18} />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-on-surface truncate">
              {recording.title || "Bản ghi không tên"}
            </h1>
            <div className="flex items-center gap-4 text-xs text-on-surface-variant/60 mt-0.5">
              {recording.room?.room_code && (
                <span className="font-mono font-bold bg-surface-container px-2 py-0.5 rounded">
                  {recording.room.room_code}
                </span>
              )}
              <span className="flex items-center gap-1">
                <CalendarDays size={12} />
                {formatDate(recording.recorded_at)}
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} />
                {formatDuration(recording.duration_seconds)}
              </span>
              {recording.owner && (
                <span className="flex items-center gap-1">
                  <User size={12} />
                  {recording.owner.full_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Content: Video + Chat */}
        <div className="flex-1 flex overflow-hidden">
          {/* Video Player */}
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col p-6 min-w-0"
          >
            <div className="flex-1 relative rounded-2xl overflow-hidden bg-stone-900 shadow-lg">
              <video
                ref={videoRef}
                src={recording.file_url}
                controls
                className="w-full h-full object-contain bg-black"
                controlsList="nodownload"
              >
                Your browser does not support the video element.
              </video>
            </div>

            {/* Recording description */}
            {recording.description && (
              <div className="mt-4 p-4 bg-surface-container-lowest rounded-xl border border-outline-variant/10">
                <p className="text-sm text-on-surface-variant">{recording.description}</p>
              </div>
            )}
          </motion.div>

          {/* Chat History Panel */}
          <motion.div
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="w-[380px] border-l border-outline-variant/10 flex flex-col shrink-0 bg-surface-container-lowest"
          >
            <div className="px-5 py-4 border-b border-outline-variant/10 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" />
              <h2 className="font-bold text-on-surface text-sm">Lịch sử chat</h2>
              {messages.length > 0 && (
                <span className="text-xs text-on-surface-variant/50 ml-auto">
                  {messages.length} tin nhắn
                </span>
              )}
            </div>

            {chatLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 size={24} className="text-primary animate-spin" />
              </div>
            ) : chatError ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
                <MessageSquare size={32} className="text-on-surface-variant/20" />
                <p className="text-sm text-on-surface-variant/50 text-center">{chatError}</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 px-6">
                <MessageSquare size={32} className="text-on-surface-variant/20" />
                <p className="text-sm text-on-surface-variant/50 text-center">
                  Không có tin nhắn nào cho cuộc họp này.
                </p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                  {messages.map((msg) => (
                    <ChatBubble key={msg._id} message={msg} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}


