import { FaceLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { FilterConfig, MaskConfig } from "./types";

export const MASK_REGISTRY: Record<string, MaskConfig> = {
  // scale = ratio of (desired mask width) relative to (inter-eye distance)
  // e.g. scale=2.5 means mask will be 2.5× the inter-eye pixel distance wide
  crown:    { src: "/masks/crown.png",    offsetX: 0, offsetY: -1.2, scale: 2.5, referenceWidth: 100 },
  glasses:  { src: "/masks/glasses.png",  offsetX: 0, offsetY: 0.1,  scale: 2.2, referenceWidth: 100 },
  mustache: { src: "/masks/mustache.png", offsetX: 0, offsetY: 0.8,  scale: 1.8, referenceWidth: 100 },
};

/**
 * FaceMaskEffect
 *
 * Draws PNG sticker overlays anchored to face landmarks.
 *
 * Scaling strategy:
 * - `faceWidth` = pixel distance between left-eye inner and right-eye inner corners.
 *   This is a stable measure of how large the face appears in the frame.
 * - `drawW = faceWidth * maskConfig.scale`
 *   → mask width is directly proportional to face size, regardless of PNG resolution.
 * - `drawH = drawW * (img.naturalHeight / img.naturalWidth)`
 *   → maintains the PNG's original aspect ratio.
 * - `offsetX/Y` in maskConfig are now in units of `faceWidth`, not pixels,
 *   so they scale correctly with face size.
 *
 * Compositing:
 * - ctx.filter = "none" prevents color filters from tinting the mask PNG.
 * - ctx.globalCompositeOperation = "source-over" preserves PNG transparency.
 * - ctx.save()/restore() isolates transforms per mask.
 */
export class FaceMaskEffect {
  private maskImages: Map<string, HTMLImageElement> = new Map();

  constructor() {
    this.preloadMasks();
  }

  private preloadMasks() {
    Object.keys(MASK_REGISTRY).forEach((id) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = MASK_REGISTRY[id].src;
      this.maskImages.set(id, img);
    });
  }

  apply(
    ctx: CanvasRenderingContext2D,
    faceResult: FaceLandmarkerResult | null,
    config: FilterConfig
  ): void {
    if (!faceResult?.faceLandmarks?.length) return;
    if (config.activeMasks.length === 0) return;

    const landmarks = faceResult.faceLandmarks[0];
    const { width, height } = ctx.canvas;

    // Convert normalized [0,1] landmark to canvas pixel coordinates (no mirroring)
    const toCanvas = (lm: NormalizedLandmark) => ({
      x: lm.x * width,
      y: lm.y * height,
    });

    // Landmark indices for inner eye corners (stable, tight measurement)
    // 33  = left eye outer corner
    // 263 = right eye outer corner
    const leftEye   = toCanvas(landmarks[33]);
    const rightEye  = toCanvas(landmarks[263]);

    // faceWidth in canvas pixels = inter-eye distance
    const faceWidth   = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const faceAngle   = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const faceCenterX = (leftEye.x + rightEye.x) / 2;
    const faceCenterY = (leftEye.y + rightEye.y) / 2;

    for (const maskId of config.activeMasks) {
      const maskConfig = MASK_REGISTRY[maskId];
      if (!maskConfig) continue;

      const img = this.maskImages.get(maskId);
      if (!img || !img.complete || img.naturalWidth === 0) continue;

      ctx.save();

      // Reset filter so color grading doesn't tint the PNG sticker
      ctx.filter = "none";
      // Normal alpha compositing so PNG transparency is respected
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1.0;

      // Move origin to face center, then rotate to match face tilt
      ctx.translate(faceCenterX, faceCenterY);
      ctx.rotate(faceAngle);

      // === CORRECTED SCALING ===
      // drawW is a direct multiple of faceWidth (canvas pixels), not PNG pixels.
      // This means the sticker grows/shrinks proportionally as the face moves closer/farther.
      const drawW = faceWidth * maskConfig.scale;
      const drawH = drawW * (img.naturalHeight / img.naturalWidth);

      // offsetX/Y are also in units of faceWidth so they scale with the face.
      const drawX = maskConfig.offsetX * faceWidth - drawW / 2;
      const drawY = maskConfig.offsetY * faceWidth - drawH / 2;

      ctx.drawImage(img, drawX, drawY, drawW, drawH);

      ctx.restore();
    }
  }
}
