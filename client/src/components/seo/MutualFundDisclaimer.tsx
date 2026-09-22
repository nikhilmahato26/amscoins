import { cn } from '@/lib/utils'

/**
 * SEBI-mandated mutual fund risk disclaimer.
 * Must appear on every investor-facing page.
 */
export function MutualFundDisclaimer({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        'text-[11px] font-semibold leading-relaxed text-skin-muted',
        className
      )}
    >
      Mutual fund investments are subject to market risks. Read all
      scheme-related documents carefully before investing. Past performance does
      not guarantee future results.
    </p>
  )
}
