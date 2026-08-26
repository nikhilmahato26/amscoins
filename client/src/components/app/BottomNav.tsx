import { NavLink, useLocation } from 'react-router'
import { House, TrendingUp, Trophy, CircleUserRound } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { to: '/app',             label: 'Home',      Icon: House,            end: true  },
  { to: '/app/investments', label: 'Invest',     Icon: TrendingUp,       end: false },
  { to: '/app/leaderboard', label: 'Leaders',    Icon: Trophy,           end: false },
  { to: '/app/account',     label: 'Account',    Icon: CircleUserRound,  end: false },
] as const

/**
 * Fixed glassy bottom tab bar — mobile only (hidden on lg+).
 * Mount inside AppShell so it sits above the main content area.
 */
export function BottomNav() {
  const { pathname } = useLocation()

  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 inset-x-0 z-30 lg:hidden',
        'bg-white/88 backdrop-blur-md',
        'border-t border-asm-line',
        'shadow-nav',
        /* safe area bottom on iOS */
        'pb-[env(safe-area-inset-bottom,0px)]'
      )}
    >
      <ul className="flex items-stretch" role="list">
        {TABS.map(({ to, label, Icon, end }) => {
          const active = end ? pathname === to : pathname.startsWith(to)
          return (
            <li key={to} className="flex flex-1">
              <NavLink
                to={to}
                end={end}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-1 flex-col items-center justify-center gap-0.5 pb-2 pt-2.5 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-inset"
              >
                {/* Active indicator bar at top */}
                {active && (
                  <span
                    aria-hidden
                    className="absolute inset-x-4 top-0 h-[2.5px] rounded-b-full bg-asm-blue"
                  />
                )}
                <Icon
                  className={cn(
                    'size-[22px] transition-colors',
                    active ? 'text-asm-blue' : 'text-asm-muted'
                  )}
                  strokeWidth={active ? 2.4 : 2}
                  aria-hidden
                />
                <span
                  className={cn(
                    'text-[10px] font-bold tracking-[0.03em] transition-colors',
                    active ? 'text-asm-blue' : 'text-asm-muted'
                  )}
                >
                  {label}
                </span>
              </NavLink>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
