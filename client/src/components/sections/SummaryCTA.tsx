import { ArrowRight } from 'lucide-react'

import { cn } from '@/lib/utils'

const GOLD_BUTTON = 'linear-gradient(135deg, #D4AF37 0%, #F3E2B3 50%, #AA8A2E 100%)'

/**
 * Figma "Section - Summary & CTA" (26:10428). Sits over a bottom-up scrim so
 * it reads as a sticky footer above scrolling content.
 */
export function SummaryCTA({
  total = '₹1,000.00',
  yield_ = '₹125.00',
  className,
}: {
  total?: string
  yield_?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex w-full flex-col px-6 pb-6 pt-12',
        'bg-gradient-to-t from-surface-nav via-surface-nav/95 to-transparent',
        className
      )}
    >
      <div className="flex w-full max-w-[448px] flex-col gap-4">
        <div className="flex items-center justify-between rounded-2xl border border-gold-antique/20 bg-white/[0.03] p-[17px] backdrop-blur-md">
          <span className="flex flex-col">
            <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">
              Total Investment
            </span>
            <span className="text-xl font-bold leading-7">{total}</span>
          </span>
          <span className="flex flex-col items-end">
            <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">
              Monthly Yield
            </span>
            <span className="text-xl font-bold leading-7 text-gold-antique">{yield_}</span>
          </span>
        </div>

        <button
          type="button"
          className={cn(
            'flex w-full items-center justify-center gap-3 rounded-2xl py-5',
            'text-lg font-bold leading-7 text-surface-nav',
            'drop-shadow-[0px_0px_12.5px_rgba(212,175,55,0.5)] transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
          )}
          style={{ backgroundImage: GOLD_BUTTON }}
        >
          Invest Now
          <ArrowRight className="size-[18px]" aria-hidden />
        </button>
      </div>
    </div>
  )
}
