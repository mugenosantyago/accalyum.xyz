"use client"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <div className="min-h-screen flex flex-col items-center justify-center text-center px-4 py-16">
          <h1 className="text-6xl font-bold text-red-500 mb-4">Error</h1>
          <h2 className="text-2xl font-semibold mb-6">Something went wrong</h2>
          <p className="text-gray-600 max-w-md mb-8">
            An unexpected error has occurred. Please try refreshing the page.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => reset()} className="px-4 py-2 bg-[#FF6B35] text-white rounded-md hover:bg-[#E85A2A]">
              Try again
            </button>
            <button
              onClick={() => (window.location.href = "/")}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100"
            >
              Go to homepage
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
