import { SegmentationModel } from "./models/SegmentationModel";
import { FaceLandmarkModel } from "./models/FaceLandmarkModel";
import { BackgroundEffect } from "./effects/BackgroundEffect";
import { FaceMaskEffect } from "./effects/FaceMaskEffect";
import { ColorFilterEffect } from "./effects/ColorFilterEffect";
import { useFilterStore } from "@/stores/filterStore";
import { FilterType } from "@/stores/filterStore";

export class VideoFilterProcessor {
  private sourceVideo: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private outputStream: MediaStream | null = null;
  private animFrameId: number | null = null;

  private segmenter: SegmentationModel | null = null;
  private faceLandmarker: FaceLandmarkModel | null = null;

  private bgEffect: BackgroundEffect;
  private faceMaskEffect: FaceMaskEffect;
  private colorEffect: ColorFilterEffect;

  private TARGET_FRAME_TIME = 33; // ~30fps
  private lastFrameTime = 0;

  /**
   * Re-entrancy lock. Set to true while an async processFrame is in-flight.
   * Any new rAF invocation that arrives while this is true is skipped immediately,
   * preventing multiple async frames from sharing this.ctx simultaneously.
   *
   * Why a plain boolean is safe here: JS is single-threaded, so the assignment
   * `isProcessingFrame = true` executes synchronously before the first `await`,
   * making it impossible for another invocation to observe it as false until the
   * current frame releases the lock in the finally block.
   */
  private isProcessingFrame = false;

  constructor() {
    this.sourceVideo = document.createElement("video");
    this.sourceVideo.autoplay = true;
    this.sourceVideo.playsInline = true;
    this.sourceVideo.muted = true;

    this.canvas = document.createElement("canvas");
    this.ctx = this.canvas.getContext("2d", { willReadFrequently: true })!;

    this.bgEffect = new BackgroundEffect();
    this.faceMaskEffect = new FaceMaskEffect();
    this.colorEffect = new ColorFilterEffect();
  }

  async initialize(cameraStream: MediaStream): Promise<void> {
    this.sourceVideo.srcObject = cameraStream;
    await new Promise<void>((resolve) => {
      if (this.sourceVideo.readyState >= 1) { // HAVE_METADATA or higher
        resolve();
      } else {
        this.sourceVideo.onloadedmetadata = () => resolve();
      }
    });
    await this.sourceVideo.play();

    // Set canvas dimensions
    this.canvas.width = this.sourceVideo.videoWidth || 640;
    this.canvas.height = this.sourceVideo.videoHeight || 480;

    // Create output stream
    this.outputStream = this.canvas.captureStream(30);

    // Copy audio track if present
    const audioTrack = cameraStream.getAudioTracks()[0];
    if (audioTrack) {
      this.outputStream.addTrack(audioTrack);
    }
  }

  async loadModels(filterType: FilterType): Promise<void> {
    const { setIsProcessing } = useFilterStore.getState();
    setIsProcessing(true);

    try {
      if ((filterType === "blur_bg" || filterType === "virtual_bg") && !this.segmenter) {
        this.segmenter = new SegmentationModel();
        await this.segmenter.initialize();
      }

      if (filterType === "face_mask" && !this.faceLandmarker) {
        this.faceLandmarker = new FaceLandmarkModel();
        await this.faceLandmarker.initialize();
      }
    } finally {
      setIsProcessing(false);
    }
  }

  startProcessing(): void {
    if (this.animFrameId) return;

    const processFrame = async (timestamp: number) => {
      // ── IMMORTAL LOOP: rAF MUST be re-scheduled regardless of what happens below.
      // Using a local flag instead of always-at-bottom scheduling so we can
      // early-return safely while still queuing the next frame.
      try {
        const elapsed = timestamp - this.lastFrameTime;
        if (elapsed < this.TARGET_FRAME_TIME) return; // schedules via finally

        // ── GUARD: Video source readiness ──────────────────────────────────
        // canvas.captureStream tracks and MediaPipe both require a fully decoded
        // frame. If the video element is not yet playing or the track was briefly
        // interrupted (e.g. during LiveKit track swap), videoWidth/videoHeight
        // can be 0. Feeding a zero-size frame to texImage2D poisons the WebGL
        // context with INVALID_VALUE errors and leaves MPMask instances unclosed.
        // Skip this frame silently and wait for the next one.
        if (
          this.sourceVideo.readyState < 2 || // < HAVE_CURRENT_DATA
          this.sourceVideo.videoWidth === 0 ||
          this.sourceVideo.videoHeight === 0 ||
          this.sourceVideo.paused ||
          this.sourceVideo.ended
        ) {
          return; // schedules via finally
        }

        // ── GUARD: Re-entrancy lock ─────────────────────────────────────────
        // If the previous frame's AI processing (await bgEffect.apply / detect)
        // is still running when rAF fires again, skip this frame entirely.
        // Without this lock, multiple async processFrame calls interleave on the
        // same this.ctx: frame A's mask gets composited onto frame B's pixels,
        // producing the "invisible person" bug and WebGL lazy-init warnings.
        if (this.isProcessingFrame) return; // schedules next frame via finally
        this.isProcessingFrame = true;      // acquire lock (synchronous, before any await)

        const startProcess = performance.now();
        const config = useFilterStore.getState();

        // Step 1: Draw source video frame to canvas (NO mirroring here!)
        // Mirroring is handled by CSS scale-x-[-1] on the <video> element.
        // Keeping canvas un-mirrored ensures MediaPipe mask/landmark coordinates
        // align correctly with canvas pixel positions.
        this.ctx.save();
        const colorFilterString = this.colorEffect.getFilterString(config);
        this.ctx.filter = colorFilterString;
        this.ctx.drawImage(this.sourceVideo, 0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        // Step 2: Apply AI Effects
        // Each AI block is wrapped independently so a crash in one model does
        // NOT prevent the other from running, and does NOT kill the render loop.
        if (config.activeFilter === "blur_bg" || config.activeFilter === "virtual_bg") {
          if (this.segmenter) {
            try {
              const segResult = this.segmenter.segment(this.sourceVideo, timestamp);
              await this.bgEffect.apply(this.ctx, this.sourceVideo, segResult, config);
            } catch (e) {
              console.warn("[VideoFilterProcessor] Segmentation error (frame skipped):", e);
            }
          }
        }

        if (config.activeFilter === "face_mask" && config.activeMasks.length > 0) {
          if (this.faceLandmarker) {
            try {
              const faceResult = this.faceLandmarker.detect(this.sourceVideo, timestamp);
              this.faceMaskEffect.apply(this.ctx, faceResult, config);
            } catch (e) {
              console.warn("[VideoFilterProcessor] Face landmark error (frame skipped):", e);
            }
          }
        }

        // Auto-adjust FPS if processing is too slow
        const processTime = performance.now() - startProcess;
        if (processTime > 40) {
          this.TARGET_FRAME_TIME = 50; // drop to ~20fps under load
        } else if (processTime < 25) {
          this.TARGET_FRAME_TIME = 33; // restore ~30fps when fast
        }

        this.lastFrameTime = timestamp;

      } catch (e) {
        // Outer catch — unexpected errors (e.g. context lost, memory issues).
        // Log but never let an exception escape to the rAF scheduler, which
        // would silently stop the loop and leave the canvas black permanently.
        console.error("[VideoFilterProcessor] Unexpected error in processFrame:", e);
      } finally {
        // ── IMMORTALITY GUARANTEE ──────────────────────────────────────────
        // Release the re-entrancy lock BEFORE scheduling the next frame so
        // the incoming rAF callback sees isProcessingFrame = false and can
        // proceed normally. Order matters: unlock → then reschedule.
        this.isProcessingFrame = false;
        if (this.animFrameId !== null) {
          this.animFrameId = requestAnimationFrame(processFrame);
        }
      }
    };

    this.animFrameId = requestAnimationFrame(processFrame);
  }

  stopProcessing(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  getOutputStream(): MediaStream | null {
    return this.outputStream;
  }

  destroy(): void {
    this.stopProcessing();
    this.segmenter?.close();
    this.faceLandmarker?.close();
    this.outputStream?.getTracks().forEach((t) => t.stop());
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.sourceVideo.srcObject = null;
    this.sourceVideo.remove();
    
    this.segmenter = null;
    this.faceLandmarker = null;
    this.outputStream = null;
  }
}
