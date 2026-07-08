import { useEffect, useRef } from "react";

export function ScreenShareVideo({ stream }: { stream: MediaStream }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.warn("Screen share play error:", err));
    }
  }, [stream]);
  return <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain bg-black" />;
}
