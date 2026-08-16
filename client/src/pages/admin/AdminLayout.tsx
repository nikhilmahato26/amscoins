import { useCallback, useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'framer-motion'
import { LayoutDashboard, ArrowDownToLine, ArrowUpFromLine, Users, LifeBuoy, LogOut, Menu, Settings, X } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { authService } from '@/services/authService'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/deposits', label: 'Deposits', icon: ArrowDownToLine, end: false },
  { to: '/admin/withdrawals', label: 'Withdrawals', icon: ArrowUpFromLine, end: false },
  { to: '/admin/users', label: 'Users', icon: Users, end: false },
  { to: '/admin/support', label: 'Support', icon: LifeBuoy, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
] as const

function Brand() {
  return (
    <span className="flex items-center gap-2.5">
      <span
        className="flex size-7 items-center justify-center rounded-lg bg-asm-blue text-[11px] font-extrabold tracking-tight text-white"
        aria-hidden
      >
        A
      </span>
      <span className="text-[13px] font-bold tracking-tight text-asm-navy">
        ASM <span className="font-normal text-asm-muted">Admin</span>
      </span>
    </span>
  )
}

function navLinkClass({ isActive }: { isActive: boolean }) {
  return cn(
    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
    isActive ? 'bg-asm-blue-tint text-asm-blue' : 'text-asm-body hover:bg-asm-tint hover:text-asm-navy',
  )
}

export function AdminLayout() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  function handleLogout() {
    setDrawerOpen(false)
    authService.logout()
    setUser(null)
    void navigate('/login')
  }

  /* Escape closes the drawer. */
  useEffect(() => {
    if (!drawerOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  /* Return focus to the hamburger when the drawer closes. */
  const prevOpen = useRef(drawerOpen)
  useEffect(() => {
    if (prevOpen.current && !drawerOpen) hamburgerRef.current?.focus()
    prevOpen.current = drawerOpen
  }, [drawerOpen])

  return (
    <div className="theme-light-home min-h-screen bg-asm-tint font-sans text-asm-navy">
      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-asm-line bg-white lg:flex">
        <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-asm-line px-5">
          <Brand />
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Admin navigation">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={navLinkClass}>
              <Icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="shrink-0 border-t border-asm-line p-3">
          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-asm-body transition-colors',
              'hover:bg-red-50 hover:text-asm-red',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
            )}
          >
            <LogOut className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
            Log out
          </button>
        </div>
      </aside>

      {/* ── Mobile top bar with hamburger ── */}
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-asm-line bg-white/95 px-4 backdrop-blur-md lg:hidden">
        <Brand />
        <button
          ref={hamburgerRef}
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          aria-haspopup="dialog"
          className="flex size-11 items-center justify-center rounded-lg text-asm-body transition-colors hover:text-asm-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
        >
          <Menu className="size-6" strokeWidth={2} aria-hidden />
        </button>
      </header>

      {/* ── Mobile drawer ── */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              aria-hidden
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-asm-navy/30 backdrop-blur-[3px] lg:hidden"
              onClick={closeDrawer}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Admin menu"
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 320, damping: 30, mass: 0.85 }}
              className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white shadow-[8px_0_40px_-8px_rgba(16,42,92,0.18)] lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-asm-line px-4 pb-4 pt-5">
                <Brand />
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Close menu"
                  className="flex size-11 items-center justify-center rounded-lg text-asm-muted transition-colors hover:bg-asm-tint hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
                >
                  <X className="size-5" strokeWidth={2.2} aria-hidden />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Admin navigation">
                {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
                  <NavLink key={to} to={to} end={end} onClick={closeDrawer} className={navLinkClass}>
                    <Icon className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                    {label}
                  </NavLink>
                ))}
              </nav>
              <div className="border-t border-asm-line p-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-asm-red transition-colors',
                    'hover:bg-red-50',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red',
                  )}
                >
                  <LogOut className="size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                  Log out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ── Main content ── */}
      <main className="flex min-h-screen flex-col lg:ml-60">
        <Outlet />
      </main>
    </div>
  )
}
