import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { flushSync } from 'react-dom'

interface ThemeContextValue {
  isDark: boolean
  /** Pass the toggle origin (x, y) to get a circle-reveal View Transition */
  toggle: (originX?: number, originY?: number) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = 'asm-theme'

function getInitialDark(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) return stored === 'dark'
  } catch {
    // localStorage unavailable (SSR / private browsing edge case)
  }
  // Fall back to OS preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyTheme(dark: boolean) {
  const root = document.documentElement
  if (dark) {
    root.classList.add('dark')
    root.classList.remove('light')
  } else {
    root.classList.remove('dark')
    root.classList.add('light')
  }
  try {
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  } catch {
    // ignore
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(() => {
    const dark = getInitialDark()
    // Apply immediately (before first paint) to avoid flash
    applyTheme(dark)
    return dark
  })

  const toggle = (originX?: number, originY?: number) => {
    const next = !isDark

    // Store the toggle origin for the CSS circle-reveal animation
    const x = originX ?? window.innerWidth / 2
    const y = originY ?? window.innerHeight / 2
    document.documentElement.style.setProperty('--vt-x', `${x}px`)
    document.documentElement.style.setProperty('--vt-y', `${y}px`)

    // Use View Transitions API when available (Chrome 111+, Safari 18+).
    // flushSync forces React to apply state-driven theme classes (e.g.
    // `app-shell-dark` on AppShell/AdminLayout) SYNCHRONOUSLY inside the
    // transition callback. Without it, those updates land after the browser
    // snapshots the "new" DOM, so the app/admin colour change happens outside
    // the circle-reveal — making the animation look like it starts from
    // nowhere. Landing/auth flip via pure CSS so they always looked right.
    if (typeof document.startViewTransition === 'function') {
      document.startViewTransition(() => {
        flushSync(() => {
          applyTheme(next)
          setIsDark(next)
        })
      })
    } else {
      applyTheme(next)
      setIsDark(next)
    }
  }

  // Sync with OS preference changes (e.g. system-level toggle)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => {
      // Only follow OS if user hasn't set a manual preference
      if (!localStorage.getItem(STORAGE_KEY)) {
        setIsDark(e.matches)
        applyTheme(e.matches)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>')
  return ctx
}
