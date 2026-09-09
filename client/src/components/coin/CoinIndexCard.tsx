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
  chartVariant = 'compact',
  showRanges = true,
  showCta = true,
  className,
}: {
  variant?: 'home' | 'hero' | 'compact'
  /** Passed straight through to CoinIndexChart. The admin control page is
   * the only caller that wants 'full' — every other surface stays compact. */
  chartVariant?: 'compact' | 'full'
  showRanges?: boolean
  /** The admin preview steers the index rather than buying into it. */
  showCta?: boolean
  className?: string
}) {
  const [range, setRange] = useState<CoinRange>('24h')
  const { data, isLoading, isError } = useCoinIndex(range)

  // In the hero the chart is the composition, not a widget inside it, so it
  // gets real height and drops the card chrome entirely. The full chart
  // variant needs its own headroom for the price/time axes and legend, so
  // it gets a taller default than the plain 'home' card too.
  const isHero = variant === 'hero'
  const chartHeight = isHero ? 300 : variant === 'compact' ? 64 : chartVariant === 'full' ? 320 : 160

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

  // Always show green on hero (landing) and home card — a red chart would
  // undermine visitor / user confidence. The admin compact variant keeps
  // the real colour so admins see the true market direction.
  const forceGreen = variant !== 'compact'
  const positive = forceGreen ? true : data.changePct >= 0
  const showInvestors = data.investorCount > 0

  return (
    <div
      className={cn(
        // Hero: no border, no shadow, no surface — it reads as part of the
        // hero itself rather than a card floating on top of it.
        isHero
          ? 'w-full'
          : 'rounded-2xl border border-asm-line bg-white p-4 shadow-sm dark:border-skin-line dark:bg-skin-surface',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'font-bold tracking-wide text-asm-navy dark:text-skin-text',
                isHero ? 'text-[15px]' : 'text-[13px]',
              )}
            >
              ASM
            </span>
            <span className="rounded-full bg-asm-tint dark:bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-asm-muted dark:text-white/70">
              indicative
            </span>
          </div>
          <div className="mt-1.5">
            <CoinPriceTicker
              paise={data.current}
              changePct={forceGreen ? Math.abs(data.changePct) : data.changePct}
              size={variant === 'compact' ? 'sm' : isHero ? 'xl' : 'lg'}
            />
          </div>
        </div>

        {showRanges && (
          <div role="group" aria-label="Chart range" className="flex shrink-0 gap-1">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={range === r}
                className={cn(
                  'rounded-md px-2 py-1 text-[11px] font-semibold transition-colors',
                  range === r
                    ? 'bg-asm-blue-tint text-asm-blue dark:bg-skin-accent dark:text-skin-on-accent'
                    : 'text-asm-muted hover:bg-asm-tint dark:text-skin-muted dark:hover:bg-white/10',
                )}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* pr-2 gives the live end-dot room to pulse without clipping on the
          container edge — it sits exactly at the last point's x. */}
      <div className={isHero ? 'mt-4 pr-2' : 'mt-3'}>
        <CoinIndexChart
          series={data.series}
          positive={positive}
          height={chartHeight}
          variant={chartVariant}
          rangeLabel={range}
        />
      </div>

      {variant !== 'compact' && (
        <dl
          className={cn(
            'grid gap-2',
            // Nobody holds ASM Coin until the plan goes live, and a hero that
            // announces "0 investors" argues against itself. Show the count
            // once it's a real number; until then the range carries the slot.
            showInvestors ? 'grid-cols-3' : 'grid-cols-2',
            // Hero stats sit left-aligned under the chart with a hairline rule
            // instead of a boxed footer, so they read as caption, not as a card row.
            isHero
              ? 'mt-4 border-t border-asm-line/60 dark:border-skin-line/60 pt-4 text-left'
              : 'mt-3 border-t border-asm-line dark:border-skin-line pt-3 text-center',
          )}
        >
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-asm-muted dark:text-skin-muted">24h high</dt>
            <dd
              className={cn(
                'font-semibold tabular-nums text-asm-navy dark:text-skin-text',
                isHero ? 'text-[15px]' : 'text-[13px]',
              )}
            >
              ₹{formatCoinPrice(data.high24h)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wide text-asm-muted dark:text-skin-muted">24h low</dt>
            <dd
              className={cn(
                'font-semibold tabular-nums text-asm-navy dark:text-skin-text',
                isHero ? 'text-[15px]' : 'text-[13px]',
              )}
            >
              ₹{formatCoinPrice(data.low24h)}
            </dd>
          </div>
          {showInvestors && (
            <div>
              <dt className="text-[10px] uppercase tracking-wide text-asm-muted dark:text-skin-muted">Investors</dt>
              <dd
                className={cn(
                  'font-semibold tabular-nums text-asm-navy dark:text-skin-text',
                  isHero ? 'text-[15px]' : 'text-[13px]',
                )}
              >
                {data.investorCount.toLocaleString('en-IN')}
              </dd>
            </div>
          )}
        </dl>
      )}

      {/* The hero carries its own CTAs — a third button here would compete
          with them. Only the standalone card needs its own way in. */}
      {variant === 'home' && showCta && (
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
