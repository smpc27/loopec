export default function Loading() {
  return (
    <div className="min-h-screen bg-transparent animate-in fade-in duration-150" aria-busy="true">
      {/* Top indeterminate ultra-slim progress line (YouTube / Native App style) */}
      <div className="fixed top-0 left-0 right-0 h-[2.5px] z-[9999] overflow-hidden bg-[#d0c1ab]/20">
        <div className="h-full w-2/5 rounded-full bg-gradient-to-r from-[#8e7a63] via-[#241e14] to-[#8e7a63] animate-loading-sweep" />
      </div>

      {/* Skeleton Container matching standard page structure */}
      <div className="mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8 lg:px-8">
        {/* Title & Badge Skeleton */}
        <div className="space-y-3">
          <div className="h-4 w-36 rounded-full bg-[#d0c1ab]/30 animate-pulse" />
          <div className="h-9 w-64 sm:w-80 rounded-2xl bg-[#d0c1ab]/40 animate-pulse" />
          <div className="h-4 w-72 sm:w-96 rounded-full bg-[#d0c1ab]/25 animate-pulse" />
        </div>

        {/* Category Pills Shimmer Dock */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <div className="h-9 w-24 shrink-0 rounded-full bg-[#241e14]/20 animate-pulse" />
          <div className="h-9 w-28 shrink-0 rounded-full bg-[#d0c1ab]/30 animate-pulse" />
          <div className="h-9 w-32 shrink-0 rounded-full bg-[#d0c1ab]/25 animate-pulse" />
          <div className="h-9 w-24 shrink-0 rounded-full bg-[#d0c1ab]/20 animate-pulse" />
          <div className="h-9 w-28 shrink-0 rounded-full bg-[#d0c1ab]/25 animate-pulse" />
        </div>

        {/* Search Bar Skeleton */}
        <div className="mt-4 h-12 w-full rounded-2xl border border-white/60 bg-white/60 backdrop-blur-md animate-pulse" />

        {/* Grid of Product Card Skeletons */}
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="overflow-hidden rounded-[26px] border border-white/80 bg-white/60 backdrop-blur-md p-3 space-y-3.5 shadow-xs"
            >
              <div className="aspect-[1.15/1] w-full rounded-2xl bg-gradient-to-br from-[#eee9e2]/80 to-[#e4ded5]/60 animate-pulse flex items-center justify-center">
                <div className="size-10 rounded-xl bg-white/40" />
              </div>
              <div className="p-1 space-y-2.5">
                <div className="h-3.5 w-20 rounded-full bg-[#d0c1ab]/40 animate-pulse" />
                <div className="h-5 w-4/5 rounded-lg bg-[#d0c1ab]/35 animate-pulse" />
                <div className="flex items-center justify-between pt-2 border-t border-[#d0c1ab]/30">
                  <div className="h-6 w-16 rounded-md bg-[#241e14]/20 animate-pulse" />
                  <div className="h-3 w-14 rounded-full bg-[#d0c1ab]/30 animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
