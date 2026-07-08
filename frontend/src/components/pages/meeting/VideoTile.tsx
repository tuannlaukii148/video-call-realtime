import { useEffect, useRef } from "react";
import { Mic, MicOff, Crown } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface VideoTileProps {
  name: string;
  stream?: MediaStream | null;
  isMuted?: boolean;
  isVideoOff?: boolean;
  isHost?: boolean;
  isLocal?: boolean;
  compact?: boolean;
  filterCss?: string;
  showTransferAction?: boolean;
  isTransferPending?: boolean;
  onTransferHost?: () => void;
}

export function VideoTile({
  name, stream, isMuted = false, isVideoOff = false,
  isHost = false, isLocal = false, compact = false, filterCss,
  showTransferAction = false, isTransferPending = false, onTransferHost,
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      // Chỉ gán lại srcObject nếu stream thực sự thay đổi
      // Việc gán lại srcObject liên tục (ngay cả khi stream giống hệt) 
      // sẽ khiến browser lập tức abort quá trình play trước đó, gây ra AbortError.
      if (videoRef.current.srcObject !== (stream ?? null)) {
        console.log("[LiveKit Debug] [VideoTile] Stream changed, setting new srcObject for", name, "| stream:", !!stream);
        videoRef.current.srcObject = stream ?? null;
      }
      
      videoRef.current.style.filter = filterCss || "none";
      
      if (isVideoOff || !stream) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch((err) => {
          if (err.name !== "AbortError") {
             console.warn("[LiveKit Debug] VideoTile play error:", err);
          }
        });
      }
    }
  }, [stream, isVideoOff, filterCss, name, isLocal]);

  return (
    <div className={`relative overflow-hidden bg-stone-900 shadow-sm group transition-all duration-500 flex flex-col justify-center items-center ${
      compact ? "rounded-2xl aspect-video" : "rounded-[2.5rem]"
    } ${isHost && !compact ? "scale-[1.02] border-2 border-primary/20" : ""}`}>
      
      {/* Video Container (always in DOM, smooth transition) */}
      <div className={`absolute inset-0 w-full h-full transition-opacity duration-500 ${stream && !isVideoOff ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
        <video ref={videoRef} autoPlay playsInline muted={isLocal} className="w-full h-full object-cover -scale-x-100" />
      </div>

      {/* Avatar Fallback Container (always in DOM, smooth transition) */}
      <div className={`absolute inset-0 w-full h-full flex items-center justify-center transition-opacity duration-500 ${stream && !isVideoOff ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"}`}>
        <Avatar className={compact ? "w-10 h-10" : "w-24 h-24"}>
          <AvatarFallback className={`bg-surface-container-highest text-on-surface-variant ${compact ? "text-lg" : "text-4xl"}`}>
            {name?.[0]?.toUpperCase() || "G"}
          </AvatarFallback>
        </Avatar>
      </div>
      
      <div className={`absolute bottom-3 left-3 flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 ${
        compact ? "text-[10px]" : "text-sm bottom-6 left-6 gap-3 px-4 py-2"
      }`}>
        {isMuted ? <MicOff size={compact ? 10 : 14} className="text-error" /> : <Mic size={compact ? 10 : 14} />}
        <span className="font-bold truncate max-w-20">{name}</span>
        {isHost && !compact && (
          <span className="text-[10px] text-primary-fixed bg-primary/20 px-1.5 py-0.5 rounded">Host</span>
        )}
      </div>

      {showTransferAction && !isLocal && onTransferHost && (
        <button
          type="button"
          onClick={onTransferHost}
          disabled={isTransferPending}
          className="absolute top-3 right-3 px-3 py-1.5 rounded-full bg-black/45 text-white border border-white/15 text-[11px] font-semibold flex items-center gap-1.5 hover:bg-black/65 disabled:opacity-60"
        >
          <Crown size={12} />
          {isTransferPending ? 'Transferring...' : 'Make host'}
        </button>
      )}
    </div>
  );
}
