import React, { useEffect, useMemo, useState } from "react";
import { Search, Clock } from "lucide-react";
import { EMOJI_PICKER_OPTIONS } from "@/constants/emojiPicker";

export interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

export function EmojiPicker({ onSelect, className = "" }: EmojiPickerProps) {
  const [search, setSearch] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const [tab, setTab] = useState<"all" | "emoji" | "stickers">("emoji");
  const [category, setCategory] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("emoji_recent");
      if (raw) setRecent(JSON.parse(raw));
    } catch (_) {}
  }, []);

  const saveRecent = (emo: string) => {
    try {
      const next = [emo, ...recent.filter((e) => e !== emo)].slice(0, 40);
      setRecent(next);
      localStorage.setItem("emoji_recent", JSON.stringify(next));
    } catch (_) {}
  };

  const CATEGORIES: Record<string, { label: string; icon: string; emojis: readonly string[] }> = {
    smileys: { label: 'Smileys', icon: '😊', emojis: [
      '😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳'
    ] },
    hands: { label: 'Gestures', icon: '👍', emojis: ['👍','👎','👌','🤝','👏','🙌','🙏','✌️','🤞','🤟','🤘'] },
    hearts: { label: 'Hearts', icon: '❤️', emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','💕'] },
    animals: { label: 'Animals', icon: '🐶', emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁'] },
    food: { label: 'Food', icon: '🍕', emojis: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🥝','🍕','🍔','🍟','🍣','🍜'] },
    travel: { label: 'Travel', icon: '✈️', emojis: ['🚗','🚕','🚙','🚌','🏎️','🚓','🚑','🚒','🚲','✈️','🚀'] },
    objects: { label: 'Objects', icon: '💡', emojis: ['⌚','📱','💻','🖥️','📷','🎥','🎧','🔍','🔒','🔑','💡'] },
    symbols: { label: 'Symbols', icon: '⭐', emojis: ['⭐','🌟','✨','🔥','⚡','🌈','☀️','☁️','❗','❓','✅','❌'] },
  };

  const list = useMemo(() => {
    const q = search.trim().toLowerCase();
    let base: readonly string[] = EMOJI_PICKER_OPTIONS as readonly string[];
    if (category && CATEGORIES[category]) {
      base = CATEGORIES[category].emojis;
    }
    if (!q) return base;
    return base.filter((e) => e.includes(q));
  }, [search, category]);

  return (
    <div className={`w-80 rounded-2xl border border-outline-variant/10 bg-white p-3 shadow-xl ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 border rounded-lg px-2 py-1">
            <Search size={14} className="text-on-surface-variant/60" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find something fun"
              className="w-full outline-none text-sm"
            />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1">
          <button onClick={() => setTab("all")} className={`px-2 py-1 rounded ${tab === "all" ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant"}`}>All</button>
          <button onClick={() => setTab("emoji")} className={`px-2 py-1 rounded ${tab === "emoji" ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant"}`}>Emoji</button>
          <button onClick={() => setTab("stickers")} className={`px-2 py-1 rounded ${tab === "stickers" ? "bg-surface-container-high text-on-surface" : "text-on-surface-variant"}`}>Stickers</button>
        </div>
      </div>

      {recent.length > 0 && (
        <div className="mb-3">
          <div className="text-xs text-on-surface-variant mb-2">Recent</div>
          <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto pr-1">
            {recent.map((r) => (
              <button key={r} className="h-8 w-8 rounded-lg text-lg flex items-center justify-center" onClick={() => { onSelect(r); saveRecent(r); }}>{r}</button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-8 gap-2 max-h-56 overflow-y-auto pr-1">
        {list.map((emo) => (
          <button key={emo} className="h-9 w-9 rounded-lg text-lg flex items-center justify-center hover:bg-surface-container-high" onClick={() => { onSelect(emo); saveRecent(emo); }} aria-label={`Send emoji ${emo}`}>
            {emo}
          </button>
        ))}
      </div>

      <div className="mt-3 border-t pt-3 flex items-center gap-2 overflow-x-auto">
        <button onClick={() => { setCategory(null); setTab('all'); }} className={`p-1 rounded ${!category ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'}`}><Clock size={14} /></button>
        {Object.entries(CATEGORIES).map(([key, cfg]) => (
          <button key={key} onClick={() => { setCategory(key); setTab('emoji'); }} title={cfg.label} className={`p-1 rounded ${category === key ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant'}`}>
            {cfg.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

export default EmojiPicker;
