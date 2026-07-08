import { FilterType, VideoFilterKey } from "@/stores/filterStore";
import { ImageSegmenterResult, FaceLandmarkerResult } from "@mediapipe/tasks-vision";

export interface FilterConfig {
  activeFilter: FilterType;
  blurIntensity: number;
  virtualBgUrl: string | null;
  activeMasks: string[];
  colorFilter: VideoFilterKey;
}

export interface MaskConfig {
  src: string;
  offsetX: number;
  offsetY: number;
  scale: number;
  referenceWidth: number;
}
