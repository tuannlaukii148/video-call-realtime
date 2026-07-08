import { create } from "zustand";

export type FilterType = 'none' | 'blur_bg' | 'virtual_bg' | 'face_mask' | 'color_only';
export type VideoFilterKey = "original" | "warm" | "mono" | "cool" | "golden";

interface FilterState {
  activeFilter: FilterType;
  blurIntensity: number;
  virtualBgUrl: string | null;
  activeMasks: string[];
  colorFilter: VideoFilterKey;
  isProcessing: boolean;
  isSupported: boolean;

  setFilter: (filter: FilterType) => void;
  setBlurIntensity: (intensity: number) => void;
  setVirtualBg: (url: string | null) => void;
  toggleMask: (maskId: string) => void;
  setColorFilter: (color: VideoFilterKey) => void;
  setIsProcessing: (processing: boolean) => void;
  setIsSupported: (supported: boolean) => void;
  clearMasks: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  activeFilter: 'none',
  blurIntensity: 10,
  virtualBgUrl: null,
  activeMasks: [],
  colorFilter: 'original',
  isProcessing: false,
  isSupported: true,

  setFilter: (filter) => set({ activeFilter: filter }),
  setBlurIntensity: (intensity) => set({ blurIntensity: intensity }),
  setVirtualBg: (url) => set({ virtualBgUrl: url, activeFilter: url ? 'virtual_bg' : 'none' }),
  toggleMask: (maskId) => set((state) => {
    const exists = state.activeMasks.includes(maskId);
    const newMasks = exists 
      ? state.activeMasks.filter(id => id !== maskId)
      : [...state.activeMasks, maskId];
    
    // Auto switch filter type if masks are present
    let newFilter = state.activeFilter;
    if (newMasks.length > 0 && state.activeFilter !== 'face_mask') {
        newFilter = 'face_mask';
    } else if (newMasks.length === 0 && state.activeFilter === 'face_mask') {
        newFilter = 'none';
    }

    return { activeMasks: newMasks, activeFilter: newFilter };
  }),
  setColorFilter: (color) => set({ colorFilter: color }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setIsSupported: (supported) => set({ isSupported: supported }),
  clearMasks: () => set({ activeMasks: [] }),
}));
