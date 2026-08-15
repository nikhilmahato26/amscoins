import { Navigate, useLocation } from 'react-router'
import { useAuth } from './AuthContext'

interface RequireAuthProps {
  children: React.ReactNode
  role?: 'user' | 'admin'
}

export function RequireAuth({ children, role }: RequireAuthProps) {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-ink text-mist font-mono text-sm">Loading session...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (role && user.role !== role) {
    // If an admin tries to go to /app, they can be redirected to /admin
    // If a user tries to go to /admin, they get redirected to /login (or /app)
    if (user.role === 'admin') {
      return <Navigate to="/admin" replace />
    }
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}
