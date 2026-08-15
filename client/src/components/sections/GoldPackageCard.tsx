import { Trophy } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Figma "Gold Package" (26:8431).
 *
 * Built as drawn, including the solid #FFC30F fill. Note that fill leaves the
 * gray-400 labels and amber-500 button text at roughly 1.5-2:1 contrast, which
 * fails WCAG AA badly — it looks like the tint was meant to be something like
 * amber-500/10 rather than a solid fill. Flagged rather than silently changed.
 */
export function GoldPackageCard({
  rate = '30%',
  period = 'Per Term',
  minInvestment = '₹3,000',
  roi = '30% Fixed',
  className,
}: {
  rate?: string
  period?: string
  minInvestment?: string
  roi?: string
  className?: string
}) {
  return (
    <article
      className={cn(
        'relative flex flex-col gap-6 overflow-hidden rounded-[20px] border border-amber-500/20 bg-gold-solid p-[25px] backdrop-blur-md',
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-amber-500/10 blur-[32px]"
      />

      <div className="flex flex-col items-center gap-1">
        <span className="flex items-center gap-2">
          <Trophy className="h-4 w-[18px] text-amber-500" strokeWidth={2} aria-hidden />
          <span className="text-xs font-bold uppercase leading-4 tracking-[1.2px] text-amber-500">
            Gold Tier
          </span>
        </span>
        <span className="flex items-baseline gap-1">
          <span className="text-2xl font-bold leading-8">{rate}</span>
          <span className="text-sm leading-5 text-gray-400">{period}</span>
        </span>
      </div>

      <div className="flex flex-col gap-3">
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
          'flex w-full items-center justify-center rounded-xl border border-amber-500/30 py-[17px]',
          'text-sm font-bold uppercase leading-5 tracking-[0.35px] text-amber-500',
          'transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
        )}
      >
        Invest Now
      </button>
    </article>
  )
}
