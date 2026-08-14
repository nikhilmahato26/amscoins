import { CircleUserRound, House, Users, Wallet } from 'lucide-react'
import { NavLink } from 'react-router'

import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/app', label: 'Home', Icon: House, end: true },
  { to: '/app/withdraw', label: 'Withdraw', Icon: Wallet, end: false },
  { to: '/app/referral', label: 'Referral', Icon: Users, end: false },
  { to: '/app/account', label: 'Account', Icon: CircleUserRound, end: false },
] as const

/** Persistent bottom tab bar shared by the app screens. */
export function BottomNav({ className }: { className?: string }) {
  return (
    <nav
      aria-label="Primary"
      className={cn(
        'fixed bottom-0 left-1/2 z-30 flex w-[370px] max-w-full -translate-x-1/2 items-center justify-between',
        'border-t border-white/10 bg-surface-nav/90 p-4 backdrop-blur-[20px] lg:hidden',
        className
      )}
    >
      {LINKS.map(({ to, label, Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              'flex flex-col items-center gap-1 rounded-lg px-2 py-0.5 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              isActive ? 'text-brand-deep' : 'text-gray-500 hover:text-gray-300'
            )
          }
        >
          <Icon className="size-[18px]" aria-hidden />
          <span className="font-jakarta text-[10px] font-bold uppercase leading-[15px]">{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
