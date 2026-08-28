import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { authService } from '@/services/authService'
import { useAuth } from '@/auth/AuthContext'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [failed, setFailed] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true

    // Token arrives in the URL hash: #token=<jwt>
    const token = new URLSearchParams(window.location.hash.slice(1)).get('token')
    if (!token) { navigate('/login?error=google_failed', { replace: true }); return }

    authService
      .completeOAuth(token)
      .then((user) => {
        setUser(user)
        navigate('/app', { replace: true })
      })
      .catch(() => setFailed(true))
  }, [navigate, setUser])

  if (failed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-skin-tint text-skin-text">
        <p className="text-sm">Google sign-in could not be completed.</p>
        <button className="text-skin-accent underline text-sm" onClick={() => navigate('/login', { replace: true })}>
          Back to sign in
        </button>
      </div>
    )
  }

  return (
    <div role="status" aria-live="polite" className="min-h-screen flex items-center justify-center bg-skin-tint">
      <span className="sr-only">Signing you in</span>
      <span aria-hidden className="size-8 animate-spin rounded-full border-2 border-skin-accent/20 border-t-skin-accent" />
    </div>
  )
}
