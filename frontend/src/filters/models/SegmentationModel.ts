import { ImageSegmenter, FilesetResolver, ImageSegmenterResult } from "@mediapipe/tasks-vision";

export class SegmentationModel {
  private segmenter: ImageSegmenter | null = null;
  private isInitializing = false;

  async initialize(): Promise<void> {
    if (this.segmenter || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
      );

      this.segmenter = await ImageSegmenter.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            "https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite",
          delegate: "GPU",
        },
        runningMode: "VIDEO",
        outputCategoryMask: true,
        outputConfidenceMasks: false,
      });
    } catch (error) {
      console.error("Failed to initialize SegmentationModel:", error);
      throw error;
    } finally {
      this.isInitializing = false;
    }
  }

  segment(video: HTMLVideoElement, timestamp: number): ImageSegmenterResult | null {
    if (!this.segmenter) return null;
    return this.segmenter.segmentForVideo(video, timestamp);
  }

  close(): void {
    if (this.segmenter) {
      this.segmenter.close();
      this.segmenter = null;
    }
  }
}
