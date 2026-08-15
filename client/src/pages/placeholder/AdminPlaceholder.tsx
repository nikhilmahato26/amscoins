

export function AdminPlaceholder() {
  return (
    <div className="min-h-screen bg-ink-2 text-paper flex items-center justify-center p-6 border-t-4 border-rust">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="font-display text-4xl text-rust">Admin Desk</h1>
        <p className="text-mist">Phase 5 placeholder. You are logged in as an admin.</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-4 py-2 border border-rust text-rust hover:bg-rust hover:text-ink transition-colors rounded-md text-sm font-medium">
          Back to Home
        </button>
      </div>
    </div>
  )
}

export function NotFound() {
  return (
    <div className="min-h-screen bg-ink text-paper flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <h1 className="font-display text-6xl text-mist">404</h1>
        <p className="text-mist uppercase tracking-widest text-sm font-medium">Page Not Found</p>
      </div>
    </div>
  )
}
