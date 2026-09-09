import { useState } from 'react'
import { Link } from 'react-router'

import { CoinIndexChart } from './CoinIndexChart'
import { CoinPriceTicker } from './CoinPriceTicker'
import { useCoinIndex } from '@/hooks/queries'
import { formatCoinPrice } from '@/lib/coinFormat'
import { cn } from '@/lib/utils'
import type { CoinRange } from '@/services/api/coin'

const RANGES: CoinRange[] = ['1h', '24h', '7d']

/**
 * The complete ASM Coin index card. Self-fetching, so every surface that wants
 * it renders one line. `variant` controls density only — the data and the
 * honesty label are identical everywhere.
 *
 * The "indicative" label is required: it matches the existing MarketTicker
 * convention and PRODUCT.md principle #5. Do not remove it, and do not
 * describe this number as a live market price.
 */
export function CoinIndexCard({
  variant = 'home',
  showRanges = true,
  className,
}: {
  variant?: 'home' | 'hero' | 'compact'
  showRanges?: boolean
  className?: string
}) {
  const [range, setRange] = useState<CoinRange>('24h')
  const { data, isLoading, isError } = useCoinIndex(range)

  const chartHeight = variant === 'hero' ? 220 : variant === 'compact' ? 64 : 160

  if (isLoading) {
    return (
      <div
        className={cn('animate-pulse rounded-2xl bg-asm-tint', className)}
        style={{ height: chartHeight + 96 }}
        aria-label="Loading ASM Coin index"
      />
    )
  }

  // A decorative chart must never break the page it sits on.
  if (isError || !data || data.series.length < 2) return null

  const positive = data.changePct >= 0

  return (
    <div
      className={cn(
        'rounded-2xl border border-asm-line bg-white p-4 shadow-sm',
        variant === 'hero' && 'p-5',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-bold tracking-wide text-asm-navy">ASM</span>
            <span className="rounded-full bg-asm-tint px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-asm-muted">
              indicative
            </span>
          </div>
          <div className="mt-1.5">
            <CoinPriceTicker
              paise={data.current}
              changePct={data.changePct}
              size={variant === 'compact' ? 'sm' : 'lg'}
            />
          </div>
        </div>

        {showRanges && (
          <div role="group" aria-label="Chart range" className="flex gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                  range === r
                    ? 'bg-asm-blue-tint text-asm-blue'
                    : 'text-asm-muted hover:bg-asm-tint',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-3">
        <CoinIndexChart series={data.series} positive={positive} height={chartHeight} />
      </div>

      {variant !== 'compact' && (
        <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-asm-line pt-3 text-center">
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-asm-muted">24h high</dt>
            <dd className="text-[13px] font-semibold tabular-nums text-asm-navy">
              ₹{formatCoinPrice(data.high24h)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-asm-muted">24h low</dt>
            <dd className="text-[13px] font-semibold tabular-nums text-asm-navy">
              ₹{formatCoinPrice(data.low24h)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-asm-muted">Investors</dt>
            <dd className="text-[13px] font-semibold tabular-nums text-asm-navy">
              {data.investorCount.toLocaleString('en-IN')}
            </dd>
          </div>
        </dl>
      )}

      {variant !== 'compact' && (
        <Link
          to="/plans"
          className="mt-4 flex w-full items-center justify-center rounded-xl bg-asm-blue px-4 py-3 text-[15px] font-semibold text-white transition-colors hover:bg-asm-blue/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2"
        >
          Invest in ASM Coin
        </Link>
      )}
    </div>
  )
}
