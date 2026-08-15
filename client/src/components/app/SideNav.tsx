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
        'fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-asm-line',
        'bg-white px-4 py-8 lg:flex',
        className
      )}
    >
      {/* Gradient accent at top matching AppHeader */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-asm-blue via-[#0B4FD8] to-asm-greenInk opacity-80"
      />

      {/* Logo */}
      <div className="flex select-none items-center gap-2.5 px-3 pb-8">
        <div className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-asm-blue-tint">
          <img src="/asm.png" alt="" className="size-8 shrink-0 rounded-xl object-contain" aria-hidden />
        </div>
        <span>
          <span className="font-jakarta text-[20px] font-extrabold tracking-tight text-asm-navy">ASM </span>
          <span className="font-script text-[22px] text-asm-greenInk">Coins</span>
        </span>
      </div>

      {/* Nav links */}
      <div className="flex flex-1 flex-col gap-0.5">
        {LINKS.map(({ to, label, Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold',
                'transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
                isActive
                  ? 'bg-asm-blue-tint text-asm-blue'
                  : 'text-asm-muted hover:bg-asm-tint hover:text-asm-navy'
              )
            }
          >
            {({ isActive }) => (
              <>
                {/* Active left indicator bar */}
                {isActive && (
                  <span
                    aria-hidden
                    className="absolute left-0 top-1/2 h-[55%] w-[3px] -translate-y-1/2 rounded-r-full bg-asm-blue"
                  />
                )}
                {/* Icon with scale on hover */}
                <Icon
                  className={cn(
                    'size-[18px] shrink-0 transition-transform duration-150',
                    'group-hover:scale-110',
                    isActive && 'scale-110'
                  )}
                  aria-hidden
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </div>

      {/* Bottom section: subtle brand mark */}
      <div className="px-3 pt-4">
        <div className="rounded-xl bg-asm-tint px-3 py-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">Need help?</p>
          <a
            href="mailto:support@asmcoins.com"
            className="mt-0.5 block text-[12px] font-semibold text-asm-blue hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1 rounded"
          >
            support@asmcoins.com
          </a>
        </div>
      </div>
    </nav>
  )
}
