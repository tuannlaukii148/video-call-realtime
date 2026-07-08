import { AnimatePresence, motion } from 'motion/react'
import React from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CheckCircle2, Sparkles, XCircle, X } from 'lucide-react'
import { Switch } from "@/components/ui/switch";
import { useFilterStore, VideoFilterKey } from "@/stores/filterStore";

const VIDEO_FILTERS: Record<
  VideoFilterKey,
  { label: string; css: string; accent: string }
> = {
  original: {
    label: "Original",
    css: "none",
    accent: "bg-surface-container-highest",
  },
  warm: {
    label: "Warm",
    css: "sepia(0.25) saturate(1.35) contrast(1.04) brightness(1.02)",
    accent: "bg-orange-200",
  },
  mono: {
    label: "Mono",
    css: "grayscale(1) contrast(1.05)",
    accent: "bg-stone-300",
  },
  cool: {
    label: "Cool",
    css: "saturate(1.15) hue-rotate(20deg) contrast(1.05)",
    accent: "bg-blue-100",
  },
  golden: {
    label: "Golden",
    css: "sepia(0.18) saturate(1.55) brightness(1.08) contrast(1.03)",
    accent: "bg-rose-100",
  },
};

const MASK_OPTIONS = [
  { id: 'crown', label: 'Crown', emoji: '👑' },
  { id: 'glasses', label: 'Glasses', emoji: '🕶' },
  { id: 'mustache', label: 'Mustache', emoji: '🥸' },
];

const FilterPanel = ({ showFilters, setShowFilters }: { showFilters: boolean, setShowFilters: (value: boolean) => void }) => {
  const { 
    activeFilter, 
    colorFilter, 
    activeMasks, 
    isProcessing, 
    isSupported,
    setFilter, 
    setColorFilter, 
    toggleMask,
    setVirtualBg 
  } = useFilterStore();

  return (
    <AnimatePresence>
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: 20 }}
          className="absolute top-6 right-6 w-80 max-h-[calc(100%-120px)] bg-white/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-white/40 flex flex-col z-[60] overflow-hidden"
        >
          {isProcessing && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-50 rounded-[2.5rem] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                    <span className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></span>
                    <span className="text-sm font-bold text-primary">Loading AI Models...</span>
                </div>
             </div>
          )}
          {!isSupported && (
             <div className="absolute inset-0 bg-white/90 z-50 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
                <XCircle size={48} className="text-error mb-4" />
                <h3 className="font-bold text-lg mb-2 text-error">Browser Not Supported</h3>
                <p className="text-sm text-on-surface-variant">Your browser doesn't support WebAssembly SIMD required for AI filters. Please use latest Chrome, Edge or Firefox.</p>
                <button onClick={() => setShowFilters(false)} className="mt-6 px-4 py-2 bg-surface-container rounded-full text-sm font-bold">Close</button>
             </div>
          )}

          <div className="p-6 pb-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-orange-950 tracking-tight">Studio Filters</h2>
            <button onClick={() => setShowFilters(false)} className="text-on-surface-variant hover:text-primary transition-colors">
              <X size={20} />
            </button>
          </div>
          <ScrollArea className="flex-1 px-6 pb-6">
            <div className="space-y-8">
              
              {/* BACKGROUNDS */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-4">Focus & Backgrounds</p>
                <div className="grid grid-cols-2 gap-4 mx-3">
                  <FilterItem 
                    label="Original" 
                    active={activeFilter === 'none' && activeMasks.length === 0} 
                    icon={<XCircle size={24}/>} 
                    onClick={() => { setFilter('none'); setVirtualBg(null); }} 
                  />
                  <FilterItem 
                    label="Blur" 
                    src="https://picsum.photos/seed/warm/200/120" 
                    blur 
                    active={activeFilter === 'blur_bg'} 
                    onClick={() => setFilter('blur_bg')} 
                  />
                  <FilterItem 
                    label="Office BG" 
                    src="/backgrounds/bg1.webp" 
                    active={activeFilter === 'virtual_bg'} 
                    onClick={() => setVirtualBg('/backgrounds/bg1.webp')}
                  />
                </div>
              </div>

              {/* AR MASKS */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-4">AR Masks</p>
                <div className="grid grid-cols-3 gap-4 pb-2 pt-3">
                  {MASK_OPTIONS.map(mask => (
                     <button key={mask.id} onClick={() => toggleMask(mask.id)} className="w-full flex flex-col items-center gap-2 group">
                        <div className={`w-12 h-12 rounded-full border-2 border-white shadow-sm flex items-center justify-center text-2xl transition-transform group-hover:scale-110 bg-surface-container ${activeMasks.includes(mask.id) ? "ring-4 ring-primary/30 scale-110" : ""}`}>
                           {mask.emoji}
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wide text-center ${activeMasks.includes(mask.id) ? "text-primary" : "text-on-surface-variant/60"}`}>
                           {mask.label}
                        </span>
                     </button>
                  ))}
                </div>
              </div>

              {/* COLOR FILTERS */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant/60 mb-4">Mood & Color</p>
                <div className="grid grid-cols-3 gap-4 pb-2 pt-3">
                   {Object.entries(VIDEO_FILTERS).map(([key, filter]) => (
                      <ColorFilter
                        key={key}
                        color={filter.accent}
                        label={filter.label}
                        active={colorFilter === key}
                        onClick={() => setColorFilter(key as VideoFilterKey)}
                      />
                   ))}
                </div>
              </div>
            </div>
          </ScrollArea>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function FilterItem({ label, active = false, src, icon, blur = false, onClick }: {
  label: string; active?: boolean; src?: string; icon?: React.ReactNode; blur?: boolean;
  onClick?: () => void;
}) {
  return (
    <button className="flex flex-col gap-2 text-left group" onClick={onClick}>
      <div className={`aspect-video w-full rounded-2xl overflow-hidden relative transition-all hover:shadow-xl hover:scale-105 cursor-pointer ${
        active ? "ring-[7px] ring-primary-fixed shadow-lg" : "border-transparent hover:border-outline-variant"
      } ${!src ? "bg-surface-container-highest flex items-center justify-center" : ""}`}>
        {src ? <img src={src} alt={label} className={`w-full h-full object-cover ${blur ? "blur-[2px]" : ""}`} /> : icon}
      </div>
      <span className={`text-[9px] font-bold px-1 uppercase tracking-wide ${active ? "text-primary" : "text-on-surface-variant/60"}`}>
        {label}
      </span>
    </button>
  );
}

function ColorFilter({ color, label, active = false, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full flex flex-col items-center gap-2 group">
      <div
        className={`w-12 h-12 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-110 ${color} ${active ? "ring-4 ring-primary/30 scale-110" : ""}`}
      />
      <span className={`text-[9px] font-bold uppercase tracking-wide text-center ${active ? "text-primary" : "text-on-surface-variant/60"}`}>
        {label}
      </span>
    </button>
  );
}

export default FilterPanel