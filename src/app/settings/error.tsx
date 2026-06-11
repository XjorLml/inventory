'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">⚠️</div>
      <h2 className="text-lg font-semibold text-zinc-800 mb-1">
        Failed to load settings
      </h2>
      <p className="text-sm text-zinc-500 mb-6 max-w-xs">
        {error.message || 'An unexpected error occurred'}
      </p>
      <button
        onClick={reset}
        className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
