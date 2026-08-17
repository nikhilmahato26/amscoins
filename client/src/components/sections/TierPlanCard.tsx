import { Medal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { cn } from '@/lib/utils'

/**
 * Figma "SilverPackage" (4:5126) — the fixed-ROI card variant, re-skinned to the
 * light ASM system. A rate-per-period headline, a duration pill, and Min
 * Investment / Total ROI rows. Pass `to` to make the action a real link.
 */
export function TierPlanCard({
  tierLabel = 'Silver Tier',
  rate = '25%',
  period = 'Per Term',
  duration = '24 Hours',
  minInvestment = '₹1,000',
  roi = '25% Fixed',
  Icon = Medal,
  to,
  className,
}: {
  tierLabel?: string
  rate?: string
  period?: string
  duration?: string
  minInvestment?: string
  roi?: string
  Icon?: LucideIcon
  /** When set, the action renders as a link to this route. */
  to?: string
  className?: string
}) {
  const actionClass = cn(
    'mt-6 flex h-[52px] w-full items-center justify-center rounded-xl bg-asm-blue',
    'text-sm font-bold uppercase leading-[21px] tracking-[0.35px] text-white',
    'shadow-[0_8px_24px_-8px_rgba(11,79,216,0.5)] transition-colors hover:bg-asm-blue-dark',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2'
  )

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[20px] border border-asm-line bg-white p-[25px] shadow-[0_2px_16px_-6px_rgba(16,42,92,0.1)]',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-[18px] text-asm-blue" strokeWidth={2} aria-hidden />
            <span className="text-xs font-bold uppercase leading-[18px] tracking-[1.2px] text-asm-muted">
              {tierLabel}
            </span>
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold leading-8 text-asm-navy">{rate}</span>
            <span className="text-sm leading-5 text-asm-muted">{period}</span>
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-semibold uppercase leading-[15px] tracking-[0.08em] text-asm-muted">Duration</span>
          <span className="rounded-lg bg-asm-blue-tint px-[13px] py-[4.5px] text-xs font-bold leading-[18px] text-asm-blue">
            {duration}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6">
        <div className="flex items-start justify-between">
          <span className="text-sm leading-5 text-asm-body">Min Investment</span>
          <span className="text-sm font-bold leading-5 text-asm-navy">{minInvestment}</span>
        </div>
        <div className="flex items-start justify-between">
          <span className="text-sm leading-5 text-asm-body">Total ROI</span>
          <span className="text-sm font-bold leading-5 text-asm-green">{roi}</span>
        </div>
      </div>

      {to ? (
        <Link to={to} className={actionClass}>
          Invest Now
        </Link>
      ) : (
        <button type="button" className={actionClass}>
          Invest Now
        </button>
      )}
    </article>
  )
}
