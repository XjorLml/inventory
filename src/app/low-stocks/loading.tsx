export default function LowStocksLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-28 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-5 w-20 bg-zinc-200 rounded-full animate-pulse" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 animate-pulse"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="h-4 w-36 bg-red-200 rounded" />
              <div className="h-5 w-20 bg-red-200 rounded-full" />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-3 w-16 bg-red-200 rounded" />
              <div className="h-3 w-1 bg-red-200 rounded" />
              <div className="h-3 w-14 bg-red-200 rounded" />
              <div className="h-3 w-1 bg-red-200 rounded" />
              <div className="h-3 w-12 bg-red-200 rounded" />
            </div>
            <div className="h-8 w-full bg-red-200 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}
