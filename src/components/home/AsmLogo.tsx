import { cn } from '@/lib/utils'

/**
 * The "A" mark: two nested chevrons reading as both a letter A and a rising
 * line. Authored geometry, not a traced picture.
 *
 * The real vector should replace this — it's built from the mockup by eye.
 */
export function AsmMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 44" className={className} aria-hidden focusable="false">
      {/* Outer chevron, navy */}
      <path d="M24 2 46 42h-10.5L24 20.5 12.5 42H2L24 2Z" fill="#102A5C" />
      {/* Inner chevron, green, offset right so it reads as a second stroke */}
      <path d="M28.5 14 44 42h-9l-9-16.5L28.5 14Z" fill="#17A34A" />
      {/* Counter that opens up the letterform */}
      <path d="M24 24.5 30 35H18l6-10.5Z" fill="#FFFFFF" />
    </svg>
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
      <AsmMark className="h-9 w-10 shrink-0" />
      <span className="flex flex-col">
        <span className="flex items-baseline gap-1.5 text-[19px] font-extrabold leading-none tracking-[0.02em] sm:text-[22px]">
          <span className="text-asm-navy">ASM</span>
          <span className="text-asm-green">COINS</span>
        </span>
        {/*
          data-tagline lets a tight container drop the strapline without a
          second prop — the header uses it to fit 320px screens.
        */}
        {showTagline ? (
          <span
            data-tagline
            className="pt-1 text-[8px] font-semibold uppercase leading-none tracking-[0.28em] text-asm-muted"
          >
            Invest · Grow · Prosper
          </span>
        ) : null}
      </span>
    </span>
  )
}
