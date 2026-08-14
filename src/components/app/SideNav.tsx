import { CircleUserRound, House, Users, Wallet } from 'lucide-react'
import { NavLink } from 'react-router'

import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/app', label: 'Home', Icon: House, end: true },
  { to: '/app/withdraw', label: 'Withdraw', Icon: Wallet, end: false },
  { to: '/app/referral', label: 'Referral', Icon: Users, end: false },
  { to: '/app/account', label: 'Account', Icon: CircleUserRound, end: false },
] as const

/**
 * Desktop counterpart to BottomNav. The Figma file is mobile-only, so this rail
 * is an addition rather than a translation — same destinations, laid out for a
 * wide viewport.
 */
export function SideNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed inset-y-0 left-0 z-30 hidden w-60 flex-col gap-1 border-r border-white/10',
        'bg-surface-nav/90 px-4 py-8 backdrop-blur-[20px] lg:flex',
        className
      )}
    >
      <p className="select-none px-3 pb-8 text-[28px] leading-none text-brand">
        <span className="font-jakarta font-extrabold tracking-tight">ASM </span>
        <span className="font-script">Coins</span>
      </p>

      {LINKS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              isActive
                ? 'bg-brand/15 text-brand'
                : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
            )
          }
        >
          <Icon className="size-[18px] shrink-0" aria-hidden />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
