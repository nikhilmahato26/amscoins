import { AnimatePresence, motion } from 'framer-motion'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { LogOut, X } from 'lucide-react'
import { NavLink, useNavigate } from 'react-router'

import { useAuth } from '@/auth/AuthContext'
import { AppHeader } from '@/components/app/AppHeader'
import { BottomNav } from '@/components/app/BottomNav'
import { GridBackdrop } from '@/components/app/GridBackdrop'
import { APP_NAV_LINKS } from '@/components/app/navLinks'
import { SideNav } from '@/components/app/SideNav'
import { cn } from '@/lib/utils'

/* ── Mobile slide-in drawer ─────────────────────────────────────── */

const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/* Link item stagger variants */
const linkItemVariants = {
  hidden: { opacity: 0, x: -14 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 24, delay: i * 0.06 + 0.12 },
  }),
}

function MobileDrawer({
  open,
  onClose,
  triggerRef,
}: {
  open: boolean
  onClose: () => void
  /** The element that opened the drawer — focus returns here on close. */
  triggerRef: React.RefObject<HTMLButtonElement | null>
}) {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  /* Focus trap: focus first element when opened; cycle on Tab; close on Escape */
  useEffect(() => {
    if (!open) return

    const panel = panelRef.current
    if (!panel) return

    const focusables = () =>
      Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => !el.closest('[aria-hidden="true"]')
      )

    // Focus the close button on open
    const first = focusables()[0]
    first?.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab') return

      const items = focusables()
      if (items.length === 0) return
      const last = items[items.length - 1]
      const active = document.activeElement

      if (e.shiftKey && active === items[0]) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        items[0].focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  /* Return focus to the trigger element when the drawer closes */
  const prevOpen = useRef(open)
  useEffect(() => {
    if (prevOpen.current && !open) {
      triggerRef.current?.focus()
    }
    prevOpen.current = open
  }, [open, triggerRef])

  function handleSignOut() {
    onClose()
    setUser(null)
    navigate('/login', { replace: true })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="fixed inset-0 z-40 bg-asm-navy/30 backdrop-blur-[3px] lg:hidden"
            onClick={onClose}
          />

          {/* Drawer panel — w-52 = 208 px */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring' as const, stiffness: 320, damping: 30, mass: 0.85 }}
            className={cn(
              'fixed inset-y-0 left-0 z-50 flex w-52 flex-col bg-white lg:hidden',
              'shadow-[8px_0_40px_-8px_rgba(16,42,92,0.18)]'
            )}
          >
            {/* Thin gradient accent at the top of the drawer */}
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-[3px] rounded-none bg-gradient-to-r from-asm-blue via-asm-blue to-asm-greenInk"
            />

            {/* Header */}
            <div className="flex items-center justify-between border-b border-asm-line px-4 pb-4 pt-5">
              <div className="flex items-center gap-2">
                <img src="/asm.png" alt="" className="size-8 shrink-0 rounded-xl object-contain" decoding="async" aria-hidden />
                <span>
                  <span className="font-jakarta text-[18px] font-extrabold tracking-tight text-asm-navy">ASM </span>
                  <span className="font-script text-[20px] text-asm-greenInk">Coins</span>
                </span>
              </div>
              {/* size-11 = 44px — meets WCAG 2.5.5 touch target */}
              <button
                type="button"
                onClick={onClose}
                aria-label="Close menu"
                className="flex size-11 items-center justify-center rounded-lg text-asm-muted transition-colors hover:bg-asm-tint hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
              >
                <X className="size-5" strokeWidth={2.2} />
              </button>
            </div>

            {/* Nav links — stagger on mount */}
            <nav aria-label="Primary" className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 py-4">
              {APP_NAV_LINKS.map(({ to, label, Icon, end }, i) => (
                <motion.div
                  key={to}
                  custom={i}
                  variants={linkItemVariants}
                  initial="hidden"
                  animate="visible"
                >
                  <NavLink
                    to={to}
                    end={end}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'relative flex items-center gap-3 rounded-xl px-3 py-3 text-[14px] font-semibold transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
                        isActive
                          ? 'bg-asm-blue-tint text-asm-blue'
                          : 'text-asm-muted hover:bg-asm-tint hover:text-asm-navy'
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <span
                            aria-hidden
                            className="absolute left-0 top-1/2 h-[55%] w-[3px] -translate-y-1/2 rounded-r-full bg-asm-blue"
                          />
                        )}
                        <Icon className="size-[18px] shrink-0" aria-hidden />
                        {label}
                      </>
                    )}
                  </NavLink>
                </motion.div>
              ))}
            </nav>

            {/* Sign out */}
            <motion.div
              className="border-t border-asm-line px-2.5 py-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.32, duration: 0.2 }}
            >
              <button
                type="button"
                onClick={handleSignOut}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-3',
                  'text-[14px] font-semibold text-asm-red',
                  'transition-colors hover:bg-red-50',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red'
                )}
              >
                <LogOut className="size-[18px] shrink-0" aria-hidden />
                Sign out
              </button>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

/* ── AppShell ────────────────────────────────────────────────────── */

/**
 * Shared chrome for the logged-in screens.
 *
 * Mobile: hamburger in the header opens a slide-in drawer for nav.
 * Desktop (lg+): permanent side rail; hamburger hidden.
 *
 * `width="wide"` opts a screen into a roomier column for content that can use
 * multiple columns on a large viewport.
 */
export function AppShell({
  children,
  headerVariant = 'detail',
  backTo,
  width = 'default',
  onHelp,
  className,
  contentClassName,
}: {
  children: ReactNode
  headerVariant?: 'detail' | 'root'
  backTo?: string
  width?: 'default' | 'wide'
  /** Wires the header's help (?) button. Defaults to mailto: if omitted. */
  onHelp?: () => void
  className?: string
  contentClassName?: string
}) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const navigate = useNavigate()

  const defaultHelp = useCallback(() => {
    void navigate('/app/support')
  }, [navigate])

  const openDrawer = useCallback(() => setDrawerOpen(true), [])
  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  return (
    <div
      className={cn(
        'theme-light-home relative min-h-screen overflow-x-hidden bg-asm-tint font-jakarta text-asm-navy',
        className
      )}
    >
      <GridBackdrop />
      <SideNav />

      {/* Mobile drawer */}
      <MobileDrawer open={drawerOpen} onClose={closeDrawer} triggerRef={hamburgerRef} />

      {/* Mobile bottom tab bar */}
      <BottomNav />

      <div className="lg:pl-60">
        <AppHeader
          variant={headerVariant}
          backTo={backTo}
          width={width}
          onHelp={onHelp ?? defaultHelp}
          onMenu={openDrawer}
          menuButtonRef={hamburgerRef}
        />

        <main
          className={cn(
            /* Full-width on phones; centers only from sm up. */
            /* pb-24 on mobile leaves clearance above the bottom nav bar (~64px) + breathing room. */
            'relative mx-auto w-full px-5 pb-24 pt-[72px] lg:pb-14',
            width === 'wide'
              ? 'sm:max-w-[600px] lg:max-w-[860px] xl:max-w-[1120px]'
              : 'sm:max-w-[560px] lg:max-w-[720px]',
            contentClassName
          )}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
