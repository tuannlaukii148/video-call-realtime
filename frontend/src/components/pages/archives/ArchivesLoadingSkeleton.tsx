export function ArchivesLoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden"
          aria-busy="true"
        >
          <div className="aspect-video bg-surface-container-high animate-pulse" />
          <div className="p-4 space-y-3">
            <div className="h-4 bg-surface-container-high rounded-lg animate-pulse w-3/4" />
            <div className="h-3 bg-surface-container-high rounded-lg animate-pulse w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
