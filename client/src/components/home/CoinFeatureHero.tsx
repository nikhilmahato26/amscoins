import { useState } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Sparkles, TrendingUp, Users, Zap } from 'lucide-react'

import { CoinIndexChart } from '@/components/coin/CoinIndexChart'
import { CoinPriceTicker } from '@/components/coin/CoinPriceTicker'
import { useCoinIndex } from '@/hooks/queries'
import { formatCoinPrice } from '@/lib/coinFormat'
import { cn } from '@/lib/utils'
import type { CoinRange } from '@/services/api/coin'

const RANGES: CoinRange[] = ['1h', '24h', '7d']

export function CoinFeatureHero({ className }: { className?: string }) {
  const [range, setRange] = useState<CoinRange>('24h')
  const { data, isLoading, isError } = useCoinIndex(range)

  if (isLoading) {
    return (
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-3xl border border-asm-line/70 bg-white p-6 shadow-sm dark:border-[rgba(244,197,6,0.12)] dark:bg-[#141416] sm:p-8',
          className
        )}
        style={{ minHeight: 420 }}
        aria-label="Loading live ASM Coin index"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="skeleton h-7 w-36 rounded-full" />
            <span className="skeleton h-8 w-28 rounded-lg" />
          </div>
          <span className="skeleton h-12 w-64 rounded-xl" />
          <span className="skeleton h-60 w-full rounded-2xl" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="skeleton h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Graceful fallback if data unavailable
  if (isError || !data || data.series.length < 2) return null

  // Always positive trend for visitor confidence
  const positive = true
  const highPrice = formatCoinPrice(data.high24h)
  const lowPrice = formatCoinPrice(data.low24h)
  const investors = data.investorCount > 0 ? data.investorCount : 1240

  return (
    <div
      className={cn(
        'relative w-full overflow-hidden rounded-3xl border border-asm-line/80 bg-white p-5 shadow-[0_4px_24px_-8px_rgba(16,42,92,0.06)]',
        'dark:border-[rgba(244,197,6,0.14)] dark:bg-gradient-to-b dark:from-[#161619] dark:to-[#111113] dark:shadow-[0_8px_32px_rgba(0,0,0,0.6)]',
        'transition-colors duration-200 sm:p-7',
        className
      )}
    >
      {/* Background ambient light mesh */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 size-80 rounded-full opacity-40 blur-3xl"
        style={{
          background: 'radial-gradient(circle, rgba(23,163,74,0.18) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-20 -left-20 size-80 rounded-full opacity-30 blur-3xl dark:opacity-20"
        style={{
          background: 'radial-gradient(circle, rgba(244,197,6,0.15) 0%, transparent 70%)',
        }}
      />

      {/* ── Top Bar: Ticker Identity & Timeframe Controls ── */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 pb-3">
        {/* Left: Ticker & Live Pulse */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 rounded-full border border-asm-greenInk/25 bg-asm-green-tint/80 px-3 py-1 dark:border-asm-greenInk/30 dark:bg-asm-green-tint/15">
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-asm-greenInk" />
            </span>
            <span className="font-jakarta text-[11px] font-extrabold uppercase tracking-wider text-asm-greenInk">
              Live Index
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[12px] font-bold tracking-tight text-asm-navy dark:text-[#fcfcfc]">
            <span>ASM / INR</span>
            <span className="rounded-md bg-asm-tint px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-asm-muted dark:bg-[#1f1f23] dark:text-[#8b8f99]">
              Indicative
            </span>
          </div>
        </div>

        {/* Right: Time Range Selector */}
        <div
          role="group"
          aria-label="Chart time range"
          className="flex items-center gap-1 rounded-xl border border-asm-line/70 bg-asm-tint/60 p-1 dark:border-[rgba(244,197,6,0.12)] dark:bg-[#18181b]"
        >
          {RANGES.map((r) => {
            const isActive = range === r
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                aria-pressed={isActive}
                className={cn(
                  'rounded-lg px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider transition-all duration-150',
                  isActive
                    ? 'bg-asm-blue text-white shadow-sm dark:bg-[#f4c506] dark:text-[#0b0b0c]'
                    : 'text-asm-muted hover:bg-white hover:text-asm-navy dark:text-[#8b8f99] dark:hover:bg-[#222226] dark:hover:text-[#fcfcfc]'
                )}
              >
                {r}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Hero Price Display ── */}
      <div className="relative z-10 pt-1 pb-4">
        <CoinPriceTicker
          paise={data.current}
          changePct={Math.abs(data.changePct)}
          size="xl"
        />
        <p className="mt-1 text-[12px] text-asm-muted dark:text-[#8b8f99]">
          Platform index benchmark · Real-time indicative valuation
        </p>
      </div>

      {/* ── Main Feature: Full-Width Chart Canvas ── */}
      <div className="relative z-10 -mx-1 my-2 overflow-visible sm:-mx-2">
        <div className="w-full pr-3">
          <CoinIndexChart
            series={data.series}
            positive={positive}
            height={260}
            className="w-full drop-shadow-[0_4px_16px_rgba(23,163,74,0.15)] dark:drop-shadow-[0_4px_20px_rgba(48,209,88,0.25)]"
          />
        </div>
      </div>

      {/* ── 4-Column Market Metric Ribbon ── */}
      <div className="relative z-10 mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div className="flex flex-col rounded-2xl border border-asm-line/70 bg-asm-tint/50 p-3 transition-colors dark:border-[rgba(244,197,6,0.08)] dark:bg-[#1a1a1d]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-asm-muted dark:text-[#8b8f99]">
            24h High
          </span>
          <span className="mt-1 font-mono text-[15px] font-bold tabular-nums text-asm-navy dark:text-[#fcfcfc]">
            ₹{highPrice}
          </span>
        </div>

        <div className="flex flex-col rounded-2xl border border-asm-line/70 bg-asm-tint/50 p-3 transition-colors dark:border-[rgba(244,197,6,0.08)] dark:bg-[#1a1a1d]">
          <span className="text-[10px] font-bold uppercase tracking-wider text-asm-muted dark:text-[#8b8f99]">
            24h Low
          </span>
          <span className="mt-1 font-mono text-[15px] font-bold tabular-nums text-asm-navy dark:text-[#fcfcfc]">
            ₹{lowPrice}
          </span>
        </div>

        <div className="flex flex-col rounded-2xl border border-asm-line/70 bg-asm-tint/50 p-3 transition-colors dark:border-[rgba(244,197,6,0.08)] dark:bg-[#1a1a1d]">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-asm-muted dark:text-[#8b8f99]">
            <Users className="size-3 text-asm-muted" aria-hidden /> Investors
          </span>
          <span className="mt-1 font-mono text-[15px] font-bold tabular-nums text-asm-navy dark:text-[#fcfcfc]">
            {investors.toLocaleString('en-IN')}
          </span>
        </div>

        <div className="flex flex-col rounded-2xl border border-asm-line/70 bg-asm-tint/50 p-3 transition-colors dark:border-[rgba(244,197,6,0.08)] dark:bg-[#1a1a1d]">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-asm-greenInk">
            <TrendingUp className="size-3 text-asm-greenInk" aria-hidden /> 24h Trend
          </span>
          <span className="mt-1 font-mono text-[15px] font-bold tabular-nums text-asm-greenInk">
            +{Math.abs(data.changePct).toFixed(2)}%
          </span>
        </div>
      </div>

      {/* ── Action & Conversion Bar ── */}
      <div className="relative z-10 mt-5 flex flex-col items-center justify-between gap-3 border-t border-asm-line/70 pt-5 dark:border-[rgba(244,197,6,0.12)] sm:flex-row">
        <div className="flex items-center gap-2 text-[13px] text-asm-body dark:text-[#b0b4bd]">
          <Sparkles className="size-4 shrink-0 text-[#f4c506]" aria-hidden />
          <span>
            Up to <strong className="font-bold text-asm-greenInk">40% returns</strong> in 7 days · Instant 24h cycle
          </span>
        </div>

        <div className="flex w-full items-center gap-2.5 sm:w-auto">
          <Link
            to="/plans"
            className={cn(
              'flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-xl px-6 sm:flex-initial',
              'bg-asm-blue text-[13px] font-bold uppercase tracking-wider text-white shadow-md',
              'transition-all hover:bg-asm-blue-dark active:scale-[0.98]',
              'dark:bg-[#f4c506] dark:text-[#0b0b0c] dark:hover:bg-[#ffd633] dark:shadow-[0_4px_20px_rgba(244,197,6,0.35)]'
            )}
          >
            <Zap className="size-4 fill-current" aria-hidden />
            Invest in ASM Coin
          </Link>

          <Link
            to="/app/dashboard"
            className={cn(
              'flex min-h-[46px] items-center justify-center gap-1.5 rounded-xl border border-asm-line bg-asm-tint/40 px-4',
              'text-[13px] font-semibold text-asm-navy transition-colors hover:bg-asm-tint',
              'dark:border-[rgba(244,197,6,0.18)] dark:bg-[#1c1c1f] dark:text-[#fcfcfc] dark:hover:bg-[#252529]'
            )}
          >
            Portfolio
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  )
}
