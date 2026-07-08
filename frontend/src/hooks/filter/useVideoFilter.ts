import { useEffect, useRef } from "react";
import { useFilterStore } from "@/stores/filterStore";
import { VideoFilterProcessor } from "@/filters/VideoFilterProcessor";
import { useMediaStore } from "@/stores/mediaStore";

/**
 * useVideoFilter
 *
 * Applies AI/canvas-based video filters to the local camera stream in-place.
 * Instead of touching LiveKit tracks (which is unreliable in dev mode),
 * this hook:
 *   1. Takes the raw camera MediaStream from mediaStore
 *   2. Feeds it into a VideoFilterProcessor (Canvas AI pipeline)
 *   3. Replaces localStream in mediaStore with the processed canvas stream
 *
 * The MeetingScreen already reads localStream from mediaStore for the local
 * preview tile, so the filter is visible immediately to the user.
 */
export function useVideoFilter() {
  const processor = useRef<VideoFilterProcessor | null>(null);
  const rawStreamRef = useRef<MediaStream | null>(null);

  const activeFilter = useFilterStore((s) => s.activeFilter);
  const isSupported = useFilterStore((s) => s.isSupported);
  const prevFilter = useRef(activeFilter);

  // Browser support check
  useEffect(() => {
    if (!("WebAssembly" in window) || !HTMLCanvasElement.prototype.captureStream) {
      useFilterStore.getState().setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupported) return;

    const handleFilterChange = async () => {
      const mediaState = useMediaStore.getState();

      if (activeFilter !== "none" && prevFilter.current === "none") {
        // === ACTIVATE FILTER ===
        const rawStream = mediaState.localStream;
        if (!rawStream || rawStream.getVideoTracks().length === 0) {
          // Camera not ready yet; wait for next effect run when localStream updates
          prevFilter.current = activeFilter;
          return;
        }

        // Save the raw stream so we can restore it later
        rawStreamRef.current = rawStream;

        try {
          processor.current = new VideoFilterProcessor();
          await processor.current.initialize(rawStream);
          await processor.current.loadModels(activeFilter);
          processor.current.startProcessing();

          const processedStream = processor.current.getOutputStream();
          if (processedStream) {
            // Replace localStream with the canvas-processed version
            useMediaStore.getState().setLocalStream(processedStream);
          }
        } catch (error) {
          console.error("Failed to start video filter:", error);
          processor.current?.destroy();
          processor.current = null;
          useFilterStore.getState().setFilter("none");
        }

      } else if (activeFilter === "none" && prevFilter.current !== "none") {
        // === DEACTIVATE FILTER ===
        processor.current?.destroy();
        processor.current = null;

        // Restore the original raw stream
        if (rawStreamRef.current) {
          useMediaStore.getState().setLocalStream(rawStreamRef.current);
          rawStreamRef.current = null;
        }

      } else if (activeFilter !== "none" && prevFilter.current !== "none") {
        // === SWITCH BETWEEN FILTERS (e.g., blur_bg → face_mask) ===
        if (processor.current) {
          await processor.current.loadModels(activeFilter);
        }
      }

      prevFilter.current = activeFilter;
    };

    handleFilterChange();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilter, isSupported]);

  // Also re-run when localStream changes (e.g. after camera toggle)
  useEffect(() => {
    if (!isSupported) return;
    const currentFilter = useFilterStore.getState().activeFilter;
    if (currentFilter === "none") return;

    // If a filter is active but processor is gone (e.g. after camera re-enable),
    // restart the pipeline with the new stream
    if (!processor.current) {
      const rawStream = useMediaStore.getState().localStream;
      if (!rawStream || rawStream.getVideoTracks().length === 0) return;

      rawStreamRef.current = rawStream;

      (async () => {
        try {
          processor.current = new VideoFilterProcessor();
          await processor.current.initialize(rawStream);
          await processor.current.loadModels(currentFilter);
          processor.current.startProcessing();

          const processedStream = processor.current.getOutputStream();
          if (processedStream) {
            useMediaStore.getState().setLocalStream(processedStream);
          }
        } catch (error) {
          console.error("Failed to restart video filter:", error);
          processor.current?.destroy();
          processor.current = null;
          useFilterStore.getState().setFilter("none");
        }
      })();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [useMediaStore((s) => s.localStream)]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      processor.current?.destroy();
    };
  }, []);
}
