import { cn } from '@/lib/utils'

export function AsmMark({ className }: { className?: string }) {
  return (
    <img
      src="/asm.png"
      alt=""
      className={cn('shrink-0 rounded-full object-contain', className)}
      loading="eager"
      decoding="async"
    />
  )
}

/**
 * Full lockup: mark, wordmark, and the tagline rule beneath.
 */
export function AsmLogo({
  className,
  showTagline = true,
}: {
  className?: string
  showTagline?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <AsmMark className="size-9" />
      <span className="flex flex-col">
        <span className="flex items-baseline gap-1.5 text-[19px] font-extrabold leading-none tracking-[0.02em] sm:text-[22px]">
          <span className="text-asm-navy">ASM</span>
          <span className="text-asm-greenInk">COINS</span>
        </span>
        {/*
          data-tagline lets a tight container drop the strapline without a
          second prop — the header uses it to fit 320px screens.
        */}
        {showTagline ? (
          <span
            data-tagline
            className="pt-1 text-[10px] font-semibold uppercase leading-none tracking-[0.28em] text-asm-muted"
          >
            Invest · Grow · Prosper
          </span>
        ) : null}
      </span>
    </span>
  )
}
