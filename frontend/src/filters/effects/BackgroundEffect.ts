import { ImageSegmenterResult } from "@mediapipe/tasks-vision";
import { FilterConfig } from "./types";

/**
 * BackgroundEffect
 *
 * Compositing strategy (no mirroring in canvas):
 * - Canvas has the raw (un-mirrored) video frame.
 * - MediaPipe mask coordinates match the raw video frame exactly.
 * - Mirror effect is handled by CSS on the <video> element, NOT in canvas.
 *
 * MediaPipe selfie_segmenter categoryMask values:
 *   0   = PERSON / foreground  (category index 0 = the only detected class)
 *   255 = BACKGROUND           (all other pixels)
 *
 * Therefore: to replace the BACKGROUND, we apply the effect where mask[i] > 127.
 *            to KEEP the person,         we skip   where mask[i] <= 127.
 */
export class BackgroundEffect {
  private tempCanvas: HTMLCanvasElement;
  private tempCtx: CanvasRenderingContext2D;
  private bgImages: Map<string, HTMLImageElement> = new Map();

  constructor() {
    this.tempCanvas = document.createElement("canvas");
    this.tempCtx = this.tempCanvas.getContext("2d", { willReadFrequently: true })!;
  }

  private async loadBgImage(url: string): Promise<HTMLImageElement> {
    if (this.bgImages.has(url)) {
      return this.bgImages.get(url)!;
    }
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.bgImages.set(url, img);
        resolve(img);
      };
      img.onerror = reject;
      img.src = url;
    });
  }

  async apply(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    segResult: ImageSegmenterResult | null,
    config: FilterConfig
  ): Promise<void> {
    if (!segResult || !segResult.categoryMask) return;

    const { width, height } = ctx.canvas;

    // Sync temp canvas dimensions
    if (this.tempCanvas.width !== width || this.tempCanvas.height !== height) {
      this.tempCanvas.width = width;
      this.tempCanvas.height = height;
    }

    // selfie_segmenter: 0 = person, 255 = background
    // We check mask[i] > 127 to robustly detect background pixels.
    const mask = segResult.categoryMask.getAsUint8Array();

    // Read the current canvas pixels (raw video frame, no mirroring)
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    if (config.activeFilter === "blur_bg") {
      // Draw the raw video (same coordinates as canvas) with blur into tempCanvas
      this.tempCtx.filter = `blur(${config.blurIntensity}px)`;
      this.tempCtx.clearRect(0, 0, width, height);
      this.tempCtx.drawImage(video, 0, 0, width, height);
      this.tempCtx.filter = "none";
      const blurredData = this.tempCtx.getImageData(0, 0, width, height).data;

      // mask[i] > 127 → background → replace with blurred version
      // mask[i] <= 127 → person   → keep original canvas pixel
      for (let i = 0; i < mask.length; i++) {
        if (mask[i] > 127) {
          const pi = i * 4;
          pixels[pi]     = blurredData[pi];
          pixels[pi + 1] = blurredData[pi + 1];
          pixels[pi + 2] = blurredData[pi + 2];
          // Alpha channel unchanged
        }
      }

    } else if (config.activeFilter === "virtual_bg" && config.virtualBgUrl) {
      try {
        const bgImg = await this.loadBgImage(config.virtualBgUrl);

        // Draw background image cover-fit into tempCanvas
        this.tempCtx.clearRect(0, 0, width, height);

        const imgRatio    = bgImg.naturalWidth / bgImg.naturalHeight;
        const canvasRatio = width / height;
        let drawW: number, drawH: number, drawX: number, drawY: number;

        // Cover-fit: scale image so it fills the entire canvas, cropping if needed
        if (imgRatio > canvasRatio) {
          // Image is wider than canvas → constrain by height
          drawH = height;
          drawW = bgImg.naturalWidth * (height / bgImg.naturalHeight);
          drawX = (width - drawW) / 2;
          drawY = 0;
        } else {
          // Image is taller than canvas → constrain by width
          drawW = width;
          drawH = bgImg.naturalHeight * (width / bgImg.naturalWidth);
          drawX = 0;
          drawY = (height - drawH) / 2;
        }

        this.tempCtx.drawImage(bgImg, drawX, drawY, drawW, drawH);
        const bgData = this.tempCtx.getImageData(0, 0, width, height).data;

        // mask[i] > 127 → background → replace with virtual background image
        // mask[i] <= 127 → person   → keep original canvas pixel
        for (let i = 0; i < mask.length; i++) {
          if (mask[i] > 127) {
            const pi = i * 4;
            pixels[pi]     = bgData[pi];
            pixels[pi + 1] = bgData[pi + 1];
            pixels[pi + 2] = bgData[pi + 2];
          }
        }
      } catch (err) {
        console.error("Error drawing virtual background:", err);
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }
}
