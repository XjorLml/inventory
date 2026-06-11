export default function ShoppingListLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-32 bg-zinc-200 rounded-lg animate-pulse" />
        <div className="h-5 w-20 bg-zinc-200 rounded-full animate-pulse" />
      </div>

      <div className="flex flex-col gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white rounded-xl border border-zinc-100 px-4 py-3 animate-pulse"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="space-y-2">
                <div className="h-4 w-28 bg-zinc-200 rounded" />
                <div className="h-3 w-16 bg-zinc-200 rounded" />
              </div>
              <div className="text-right space-y-1">
                <div className="h-3 w-12 bg-zinc-200 rounded" />
                <div className="h-3 w-10 bg-zinc-200 rounded" />
              </div>
            </div>
            <div className="h-9 w-full bg-zinc-200 rounded-lg mt-2" />
          </div>
        ))}
      </div>
    </div>
  )
}
