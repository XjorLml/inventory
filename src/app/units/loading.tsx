export default function UnitsLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-20 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-5 w-16 bg-zinc-200 rounded-full animate-pulse" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-transparent px-4 py-3 flex items-center justify-between animate-pulse"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-zinc-200 rounded" />
              <div className="h-4 w-24 bg-zinc-200 rounded" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-14 bg-zinc-200 rounded-lg" />
              <div className="h-8 w-10 bg-zinc-200 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
