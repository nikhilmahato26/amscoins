import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatCoinChange, formatCoinPrice } from '@/lib/coinFormat'

/**
 * The big live number. Flashes green or red for a moment whenever the price
 * changes — that flash is what makes the whole card read as live rather than
 * as a static image.
 *
 * The value is announced politely so screen-reader users get the price without
 * being interrupted on every 30s poll.
 */
export function CoinPriceTicker({
  paise,
  changePct,
  size = 'lg',
}: {
  paise: number
  changePct: number
  size?: 'sm' | 'lg'
}) {
  const previous = useRef(paise)
  const [flash, setFlash] = useState<'up' | 'down' | null>(null)

  useEffect(() => {
    if (paise === previous.current) return
    setFlash(paise > previous.current ? 'up' : 'down')
    previous.current = paise
    const timer = setTimeout(() => setFlash(null), 600)
    return () => clearTimeout(timer)
  }, [paise])

  const positive = changePct >= 0

  return (
    <div className="flex items-baseline gap-2">
      <span
        aria-live="polite"
        className={cn(
          'font-bold tabular-nums tracking-tight transition-colors duration-500',
          size === 'lg' ? 'text-[34px] leading-none' : 'text-[20px] leading-none',
          flash === 'up' && 'text-asm-greenInk',
          flash === 'down' && 'text-asm-red',
          !flash && 'text-asm-navy',
        )}
      >
        ₹{formatCoinPrice(paise)}
      </span>
      <span
        className={cn(
          'font-semibold tabular-nums',
          size === 'lg' ? 'text-[15px]' : 'text-[13px]',
          positive ? 'text-asm-greenInk' : 'text-asm-red',
        )}
      >
        {positive ? '▲' : '▼'} {formatCoinChange(changePct)}
      </span>
    </div>
  )
}
