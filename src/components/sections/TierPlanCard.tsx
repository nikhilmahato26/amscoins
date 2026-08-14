import { Medal } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Figma "SilverPackage" (4:5126) — the fixed-ROI card variant. Distinct from
 * the Home/Package-detail cards: a rate-per-period headline, a duration pill,
 * and Min Investment / Total ROI rows instead of a Min/Max panel.
 */
export function TierPlanCard({
  tierLabel = 'Silver Tier',
  rate = '6.5%',
  period = 'Monthly',
  duration = '60 Days',
  minInvestment = '₹25,000',
  roi = '13.0% Fixed',
  Icon = Medal,
  className,
}: {
  tierLabel?: string
  rate?: string
  period?: string
  duration?: string
  minInvestment?: string
  roi?: string
  Icon?: LucideIcon
  className?: string
}) {
  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[20px] border-[0.677px] border-slate-400/20 bg-white/[0.03] p-[25px]',
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 right-[-14px] size-32 rounded-full bg-slate-400/10 blur-[32px]"
      />

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="flex items-center gap-2">
            <Icon className="h-4 w-[18px] text-slate-400" strokeWidth={2} aria-hidden />
            <span className="text-xs font-bold uppercase leading-[18px] tracking-[1.2px] text-slate-400">
              {tierLabel}
            </span>
          </span>
          <span className="flex items-baseline gap-2">
            <span className="text-2xl font-bold leading-8">{rate}</span>
            <span className="text-sm leading-5 text-gray-400">{period}</span>
          </span>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] uppercase leading-[15px] text-gray-400">Duration</span>
          <span className="rounded-lg border-[0.677px] border-slate-400/30 bg-slate-400/10 px-[13px] py-[4.5px] text-xs font-bold leading-[18px] text-slate-400">
            {duration}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-6">
        <div className="flex items-start justify-between">
          <span className="text-sm leading-5 text-gray-400">Min Investment</span>
          <span className="text-sm font-bold leading-5">{minInvestment}</span>
        </div>
        <div className="flex items-start justify-between">
          <span className="text-sm leading-5 text-gray-400">Total ROI</span>
          <span className="text-sm font-bold leading-5 text-emerald-400">{roi}</span>
        </div>
      </div>

      <button
        type="button"
        className={cn(
          'mt-6 flex h-[55px] w-full items-center justify-center rounded-xl border-[0.677px] border-slate-400/30',
          'text-sm font-bold uppercase leading-[21px] tracking-[0.35px] text-slate-400',
          'transition-colors hover:bg-slate-400/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
        )}
      >
        Invest Now
      </button>
    </article>
  )
}
