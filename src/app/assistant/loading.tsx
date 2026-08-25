export default function AssistantLoading() {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="h-7 w-32 bg-zinc-200 rounded-lg animate-pulse" />
      </div>

      <div className="text-center py-10">
        <div className="h-12 w-12 mx-auto mb-4 bg-zinc-200 rounded-full animate-pulse" />
        <div className="h-4 w-56 mx-auto bg-zinc-200 rounded animate-pulse" />
        <div className="h-3 w-40 mx-auto mt-2 bg-zinc-200 rounded animate-pulse" />

        <div className="flex flex-col gap-2 max-w-xs mx-auto mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-white border border-zinc-200 rounded-xl px-4 py-3 h-11 animate-pulse"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
