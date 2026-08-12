import React, { createContext, useContext, useState, useEffect } from 'react'
import type { User } from '../types'

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
    try {
      const stored = localStorage.getItem('taksal_session')
      if (stored) {
        setUserState(JSON.parse(stored))
      }
    } catch (e) {
      console.error('Failed to parse session', e)
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
