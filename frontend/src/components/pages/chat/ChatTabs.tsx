interface ChatTabsProps {
  activeTab: "chat" | "files";
  onTabChange: (tab: "chat" | "files") => void;
}

export function ChatTabs({ activeTab, onTabChange }: ChatTabsProps) {
  return (
    <nav className="sticky top-20 z-10 flex h-12 shrink-0 items-center gap-8 border-b border-outline-variant/20 bg-surface/95 px-8 backdrop-blur-xl">
      <button
        type="button"
        onClick={() => onTabChange("chat")}
        className={`h-full flex items-center text-sm font-body-bold px-1 border-b-2 transition-all ${
          activeTab === "chat"
            ? "text-primary border-primary"
            : "text-on-surface-variant hover:text-primary border-transparent"
        }`}
      >
        Tin nhắn
      </button>
      <button
        type="button"
        onClick={() => onTabChange("files")}
        className={`h-full flex items-center text-sm font-body-bold px-1 border-b-2 transition-all ${
          activeTab === "files"
            ? "text-primary border-primary"
            : "text-on-surface-variant hover:text-primary border-transparent"
        }`}
      >
        Tệp chia sẻ
      </button>
    </nav>
  );
}
