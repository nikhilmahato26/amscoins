import { useEffect } from 'react'
import { Bell, ChartNoAxesCombined, House, Menu, User, Users, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'

import { AsmLogo, AsmMark } from '@/components/home/AsmLogo'
import { cn } from '@/lib/utils'

type NavItem = { to: string; label: string; Icon: LucideIcon; end?: boolean }

/** Every destination reachable from the home chrome, rail and drawer alike. */
const NAV: NavItem[] = [
  { to: '/app', label: 'Home', Icon: House, end: true },
  { to: '/app/invest', label: 'Investments', Icon: ChartNoAxesCombined },
  { to: '/app/withdraw', label: 'Wallet', Icon: Wallet },
  { to: '/app/referral', label: 'Referral', Icon: Users },
  { to: '/app/account', label: 'Profile', Icon: User },
]

/** Top bar: menu, centred lockup, notifications. */
export function HomeHeader({
  unread = true,
  onMenu,
  menuOpen = false,
  className,
}: {
  unread?: boolean
  onMenu?: () => void
  menuOpen?: boolean
  className?: string
}) {
  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-asm-line/80',
        'bg-white/90 px-4 py-3 backdrop-blur-md',
        className
      )}
    >
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open menu"
        aria-expanded={menuOpen}
        aria-controls="home-menu"
        className="-m-1 flex size-11 items-center justify-center rounded-lg text-asm-navy transition-colors hover:bg-asm-tint lg:hidden"
      >
        <Menu className="size-6" strokeWidth={2.25} />
      </button>

      {/* The rail already carries navigation from lg up, so the slot only needs
          to hold the lockup centred. */}
      <span className="hidden size-11 lg:block" aria-hidden />

      <AsmLogo className="shrink-0" />

      <button
        type="button"
        aria-label={unread ? 'Notifications, unread' : 'Notifications'}
        className="relative -m-1 flex size-11 items-center justify-center rounded-lg text-asm-navy transition-colors hover:bg-asm-tint"
      >
        <Bell className="size-[22px]" strokeWidth={2} />
        {unread ? (
          <span className="absolute right-2 top-2 size-2 rounded-full bg-asm-green ring-2 ring-white" />
        ) : null}
      </button>
    </header>
  )
}

/**
 * Light side rail for the home page. The shared dark `SideNav` cannot be reused
 * here: this page runs on the light mockup palette, and dropping a navy rail
 * against white broke the theme.
 */
export function HomeSideNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-1 border-r border-asm-line',
        'bg-white px-4 py-7 lg:flex',
        className
      )}
    >
      <div className="px-2 pb-7">
        <AsmLogo />
      </div>

      {NAV.map((item) => (
        <RailLink key={item.to} {...item} />
      ))}
    </nav>
  )
}

/** Mobile drawer behind the header hamburger. Escape and backdrop both close. */
export function HomeMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-asm-navy/40 backdrop-blur-[2px]"
      />

      <div
        id="home-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          'absolute inset-y-0 left-0 flex w-[78%] max-w-[300px] flex-col gap-1 bg-white px-4 py-5',
          'shadow-[8px_0_32px_-12px_rgb(16_42_92_/_0.35)]'
        )}
      >
        <div className="flex items-center justify-between pb-6">
          <AsmLogo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-m-1 flex size-11 items-center justify-center rounded-lg text-asm-navy transition-colors hover:bg-asm-tint"
          >
            <X className="size-5" strokeWidth={2.25} />
          </button>
        </div>

        <nav aria-label="All sections" className="flex flex-col gap-1">
          {NAV.map((item) => (
            <RailLink key={item.to} {...item} onClick={onClose} />
          ))}
        </nav>
      </div>
    </div>
  )
}

function RailLink({ to, label, Icon, end, onClick }: NavItem & { onClick?: () => void }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
          isActive
            ? 'bg-asm-tint text-asm-blue'
            : 'text-asm-muted hover:bg-asm-tint/60 hover:text-asm-navy'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-[18px] shrink-0" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
          {label}
        </>
      )}
    </NavLink>
  )
}

const TABS: NavItem[] = [
  { to: '/app', label: 'Home', Icon: House, end: true },
  { to: '/app/invest', label: 'Investments', Icon: ChartNoAxesCombined },
  { to: '/app/withdraw', label: 'Wallet', Icon: Wallet },
  { to: '/app/account', label: 'Profile', Icon: User },
]

/**
 * Bottom tab bar with the raised brand action in the middle, matching the
 * mockup. Hidden from lg up, where the app uses its side rail.
 */
export function HomeTabBar({ className }: { className?: string }) {
  const [left, right] = [TABS.slice(0, 2), TABS.slice(2)]

  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-asm-line bg-white',
        'shadow-[0_-8px_24px_-16px_rgb(16_42_92_/_0.22)] lg:hidden',
        className
      )}
    >
      <div className="mx-auto flex max-w-[520px] items-stretch justify-between px-2 pb-1.5 pt-2">
        {left.map((tab) => (
          <Tab key={tab.to} {...tab} />
        ))}

        <NavLink
          to="/app/invest"
          aria-label="New investment"
          className="relative -mt-7 flex w-16 shrink-0 justify-center"
        >
          <span
            className={cn(
              'flex size-14 items-center justify-center rounded-full border-4 border-white bg-white',
              'shadow-[0_10px_24px_-8px_rgb(16_42_92_/_0.35)] transition-transform hover:-translate-y-0.5'
            )}
          >
            <AsmMark className="h-7 w-8" />
          </span>
        </NavLink>

        {right.map((tab) => (
          <Tab key={tab.to} {...tab} />
        ))}
      </div>
    </nav>
  )
}

function Tab({ to, label, Icon, end }: { to: string; label: string; Icon: LucideIcon; end?: boolean }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'flex flex-1 flex-col items-center gap-1 rounded-lg py-1 transition-colors',
          isActive ? 'text-asm-blue' : 'text-asm-muted hover:text-asm-navy'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon className="size-[22px]" strokeWidth={isActive ? 2.4 : 2} aria-hidden />
          <span className="text-[10px] font-semibold uppercase tracking-[0.06em]">{label}</span>
        </>
      )}
    </NavLink>
  )
}
