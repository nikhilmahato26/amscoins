import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '../types'

/** Narrow enough for the fields the app actually reads off a session. */
function isStoredUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false

  const candidate = value as Record<string, unknown>
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.email === 'string' &&
    typeof candidate.password === 'string' &&
    (candidate.role === 'user' || candidate.role === 'admin') &&
    (candidate.status === 'active' || candidate.status === 'frozen') &&
    typeof candidate.createdAt === 'string'
  )
}

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
    const stored = localStorage.getItem('taksal_session')

    if (!stored) {
      setIsLoading(false)
      return
    }

    try {
      const parsed: unknown = JSON.parse(stored)

      /*
       * Anything can end up under this key: a half-written value, a stale
       * shape from an older build, or another app that used the same
       * localhost origin. RequireAuth reads user.role to decide access, so a
       * parsed-but-wrong value has to be rejected rather than trusted.
       */
      if (isStoredUser(parsed)) {
        setUserState(parsed)
      } else {
        console.warn('Discarding session: unexpected shape')
        localStorage.removeItem('taksal_session')
      }
    } catch (e) {
      // Clear it, otherwise this throws again on every single load.
      console.error('Discarding unreadable session', e)
      localStorage.removeItem('taksal_session')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const setUser = (user: User | null) => {
    setUserState(user)
    if (user) {
      localStorage.setItem('taksal_session', JSON.stringify(user))
    } else {
      localStorage.removeItem('taksal_session')
    }
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
