import { CircleUserRound, House, Trophy, Users, Wallet } from 'lucide-react'
import { NavLink } from 'react-router'

import { cn } from '@/lib/utils'

const LINKS = [
  { to: '/app', label: 'Home', Icon: House, end: true },
  { to: '/app/withdraw', label: 'Withdraw', Icon: Wallet, end: false },
  { to: '/app/leaderboard', label: 'Leaders', Icon: Trophy, end: false },
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
        'border-t border-asm-line bg-white/95 px-4 pt-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))] backdrop-blur-[20px] shadow-[0_-4px_16px_-4px_rgba(16,42,92,0.08)] lg:hidden',
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
              'flex flex-col items-center gap-1 rounded-lg px-2 py-[5px] transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
              isActive ? 'text-asm-blue' : 'text-asm-muted hover:text-asm-navy'
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
