import { FilterConfig } from "./types";

const COLOR_FILTERS: Record<string, string> = {
  original: "none",
  warm: "sepia(0.25) saturate(1.35) contrast(1.04) brightness(1.02)",
  mono: "grayscale(1) contrast(1.05)",
  cool: "saturate(1.15) hue-rotate(20deg) contrast(1.05)",
  golden: "sepia(0.18) saturate(1.55) brightness(1.08) contrast(1.03)",
};

export class ColorFilterEffect {
  apply(ctx: CanvasRenderingContext2D, config: FilterConfig, video: HTMLVideoElement): void {
    if (config.colorFilter === 'original') return;
    
    // Color filters are applied via CSS filter during the initial drawImage step,
    // so we need to instruct the VideoFilterProcessor to apply it before drawing.
    // However, since we want to apply color filter ON TOP of AI effects (or to the whole image),
    // and context filter applies to the NEXT drawn image, we have two choices:
    // 1. Draw video with filter initially. (This affects segmentation slightly)
    // 2. Re-draw the entire canvas onto itself with a filter.
    
    // We'll use a simpler approach: Apply the color filter CSS to the canvas context
    // just before drawing the final frame.
    // In our architecture, the `ColorFilterEffect` can return the CSS filter string.
  }

  getFilterString(config: FilterConfig): string {
    return COLOR_FILTERS[config.colorFilter] || "none";
  }
}
