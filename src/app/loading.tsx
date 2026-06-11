export default function HomeLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-28 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-5 w-16 bg-zinc-200 rounded-full animate-pulse" />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-7 w-16 bg-zinc-200 rounded-full animate-pulse shrink-0"
          />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl px-4 py-3 border border-transparent flex items-center justify-between animate-pulse"
          >
            <div className="space-y-2">
              <div className="h-4 w-32 bg-zinc-200 rounded" />
              <div className="h-3 w-20 bg-zinc-200 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="w-8 h-8 rounded-full bg-zinc-200" />
              <div className="w-8 h-8 rounded-full bg-zinc-200" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
