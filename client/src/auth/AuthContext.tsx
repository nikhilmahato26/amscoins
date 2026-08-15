import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '../types'
import { getToken, setToken } from '@/lib/api'
import { authService } from '@/services/authService'

interface AuthContextType {
  user: User | null
  setUser: (user: User | null) => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    /*
     * The token is the source of truth for a session. If one is present we
     * ask the API who it belongs to (this also validates it server-side); a
     * failure means the token is stale/invalid, so we clear it.
     */
    if (!getToken()) {
      setIsLoading(false)
      return
    }

    let cancelled = false
    authService
      .me()
      .then(({ user }) => {
        if (!cancelled) setUserState(user)
      })
      .catch(() => {
        setToken(null)
        if (!cancelled) setUserState(null)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const setUser = (next: User | null) => {
    setUserState(next)
    // Logout: also drop the token so a reload does not re-hydrate a session.
    if (!next) setToken(null)
  }

  return (
    <AuthContext.Provider value={{ user, setUser, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
