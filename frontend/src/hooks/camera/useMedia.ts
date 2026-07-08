import { useState, useCallback } from 'react';
import { useMediaStore } from '@/stores/mediaStore';

export function useMedia() {
  const { setLocalStream, localStream } = useMediaStore();
  const [error, setError] = useState<Error | null>(null);

  const requestMedia = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      setLocalStream(stream);
      setError(null);
    } catch (err) {
      console.error('Error accessing media devices.', err);
      setError(err as Error);
    }
  }, [setLocalStream]);

  const stopMedia = useCallback(() => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
  }, [localStream, setLocalStream]);

  return { requestMedia, stopMedia, error };
}
