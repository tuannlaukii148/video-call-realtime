import { useEffect, useRef } from "react";

export function SelfPreviewVideo({ stream, filterCss }: { stream: MediaStream; filterCss?: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (el.srcObject !== stream) {
      el.srcObject = stream;
      el.play().catch(err => console.warn("Self preview play error:", err));
    }
    // Apply CSS filter only when no AI filter is active (canvas handles it otherwise)
    el.style.filter = filterCss && filterCss !== "none" ? filterCss : "";
  }, [stream, filterCss]);
  return <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover -scale-x-100" />;
}
