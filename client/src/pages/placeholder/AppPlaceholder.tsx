

export function AppPlaceholder() {
  return (
    <div className="min-h-screen bg-ink text-paper flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="font-display text-4xl text-brass">User Dashboard</h1>
        <p className="text-mist">Phase 2 placeholder. You are logged in as a user.</p>
        <button onClick={() => window.location.href = '/'} className="mt-8 px-4 py-2 border border-brass text-brass hover:bg-brass hover:text-ink transition-colors rounded-md text-sm font-medium">
          Back to Home
        </button>
      </div>
    </div>
  )
}
