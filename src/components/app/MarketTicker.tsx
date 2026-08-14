import { motion } from 'framer-motion'
import { ChevronDown, ChevronRight, Clock, ShieldCheck, TrendingUp, Users } from 'lucide-react'
import { Link } from 'react-router'

import { cn } from '@/lib/utils'

// Public-folder images — Vite serves /public at the site root.
const IMG_ASM     = '/asm.png'
const IMG_BITCOIN = '/bitcoin.png'
const IMG_GOLD    = '/gold.png'
const IMG_SILVER  = '/silver.png'

/**
 * Inline sparkline: normalised polyline + endpoint dot.
 * Green for uptrend (growth = trust), amber for downtrend.
 */
function Sparkline({ series, up }: { series: number[]; up: boolean }) {
  const W = 72, H = 30
  const max = Math.max(...series)
  const min = Math.min(...series)
  const range = max - min || 1
  const PAD = 3
  const points = series
    .map((v, i) => {
      const x = (i / (series.length - 1)) * (W - PAD)
      const y = H - PAD - ((v - min) / range) * (H - PAD * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  const lastX = (W - PAD).toFixed(1)
  const lastY = (H - PAD - ((series[series.length - 1] - min) / range) * (H - PAD * 2)).toFixed(1)
  const stroke = up ? '#15803D' : '#D97706'
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden>
      <polyline
        points={points}
        stroke={stroke}
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={lastX} cy={lastY} r="3" fill={stroke} />
    </svg>
  )
}

type Row = {
  id: string
  symbol: string
  ticker: string
  name: string
  price: string
  change: string
  up: boolean
  icon: string
  series: number[]
  featured?: 'green' | 'gold'
}

const ROWS: Row[] = [
  {
    id: 'asm',
    symbol: 'ASM COIN',
    ticker: 'ASM',
    name: 'ASM Coins Ecosystem',
    price: '12,850',
    change: '+1,250 (+10.79%)',
    up: true,
    icon: IMG_ASM,
    series: [40, 42, 41, 46, 48, 45, 50, 54, 57, 60, 63, 68],
    featured: 'green',
  },
  {
    id: 'btc',
    symbol: 'BITCOIN',
    ticker: 'BTC',
    name: 'Bitcoin',
    price: '58,36,245',
    change: '+2.35%',
    up: true,
    icon: IMG_BITCOIN,
    series: [38, 41, 39, 44, 43, 48, 46, 52, 55, 53, 58, 62],
    featured: undefined,
  },
  {
    id: 'gold',
    symbol: 'GOLD',
    ticker: 'XAU',
    name: 'Gold Spot',
    price: '6,795',
    change: '-0.42%',
    up: false,
    icon: IMG_GOLD,
    series: [80, 76, 78, 72, 68, 64, 60, 57, 53, 49, 45, 42],
    featured: 'gold',
  },
  {
    id: 'silv',
    symbol: 'SILVER',
    ticker: 'XAG',
    name: 'Silver Spot',
    price: '89',
    change: '+2.23%',
    up: true,
    icon: IMG_SILVER,
    series: [35, 38, 36, 42, 40, 45, 43, 48, 51, 47, 53, 56],
    featured: undefined,
  },
]

const TRUST = [
  { Icon: ShieldCheck, title: 'Secure',    sub: '100% Protected' },
  { Icon: TrendingUp,  title: 'Real-time', sub: 'Live Market Data' },
  { Icon: Users,       title: 'Trusted',   sub: 'By Thousands' },
]

/* Row stagger variants */
const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 120, damping: 18, delay: i * 0.07 },
  }),
}

export function MarketTicker({ className }: { className?: string }) {
  return (
    <section className={cn('flex flex-col gap-4', className)} aria-labelledby="market-heading">

      {/* Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="market-heading" className="font-jakarta text-[26px] font-extrabold leading-tight tracking-tight">
            <span className="text-asm-navy">Live </span>
            <span className="text-asm-blue">Market</span>
          </h2>
          <p className="mt-0.5 text-[12px] text-asm-body">Real-time prices. Real opportunities.</p>
        </div>

        <button
          type="button"
          className={[
            'flex shrink-0 items-center gap-1.5 rounded-full border border-asm-line bg-white',
            'py-1.5 pl-3 pr-2 text-[12px] font-semibold text-asm-navy',
            'transition-colors hover:bg-asm-tint',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
          ].join(' ')}
        >
          {/* Pulsing live dot */}
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-asm-greenInk" />
          </span>
          <Clock className="size-3.5 text-asm-blue" aria-hidden />
          24 Hr
          <ChevronDown className="size-3.5 text-asm-muted" aria-hidden />
        </button>
      </div>

      {/* Rows */}
      <ul className="flex flex-col gap-2.5">
        {ROWS.map(({ id, symbol, ticker, name, price, change, up, icon, series, featured }, i) => (
          <motion.li
            key={id}
            custom={i}
            variants={rowVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.008, transition: { type: 'spring', stiffness: 400, damping: 30 } }}
            className={cn(
              'flex items-center gap-3 rounded-2xl border bg-white p-3',
              'cursor-default',
              featured === 'green' && 'border-2 border-asm-greenInk bg-asm-green-tint/25',
              featured === 'gold'  && 'border-2 border-amber-400 bg-amber-50/60',
              !featured && 'border-asm-line shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]'
            )}
          >
            {/* Icon */}
            <img
              src={icon}
              alt=""
              className="size-12 shrink-0 rounded-full object-cover"
              loading="lazy"
              decoding="async"
            />

            {/* Symbol + description */}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'text-[14px] font-extrabold leading-none',
                    featured === 'green' ? 'text-asm-greenInk' : featured === 'gold' ? 'text-amber-700' : 'text-asm-navy'
                  )}
                >
                  {symbol}
                </span>
                <span
                  className={cn(
                    'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                    featured === 'green' && 'bg-asm-green-tint text-asm-greenInk',
                    featured === 'gold'  && 'bg-amber-100 text-amber-700',
                    !featured && 'bg-asm-tint text-asm-muted'
                  )}
                >
                  {ticker}
                </span>
              </div>
              <span className="truncate text-[11px] text-asm-body">{name}</span>
            </div>

            {/* Price + change */}
            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="font-mono text-[15px] font-bold tabular-nums text-asm-navy">
                {price}
              </span>
              <span
                className={cn(
                  'text-[11px] font-semibold tabular-nums',
                  up ? 'text-asm-greenInk' : (featured === 'gold' ? 'text-amber-600' : 'text-asm-red')
                )}
              >
                {change}
              </span>
            </div>

            {/* Sparkline */}
            <div className="shrink-0">
              <Sparkline series={series} up={up} />
            </div>
          </motion.li>
        ))}
      </ul>

      {/* See all */}
      <Link
        to="/app/market"
        className={[
          'flex min-h-[44px] items-center justify-center gap-2 rounded-2xl',
          'border border-asm-line bg-white text-[13px] font-semibold text-asm-blue',
          'transition-colors hover:bg-asm-blue-tint',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
        ].join(' ')}
      >
        See all markets
        <ChevronRight className="size-4" aria-hidden />
      </Link>

      {/* Trust bar */}
      <div className="flex items-stretch divide-x divide-asm-line rounded-2xl border border-asm-line bg-white px-2 py-3">
        {TRUST.map(({ Icon, title, sub }) => (
          <div key={title} className="flex flex-1 flex-col items-center gap-1 px-2">
            <Icon className="size-5 text-asm-blue" strokeWidth={1.8} aria-hidden />
            <span className="text-[12px] font-bold text-asm-navy">{title}</span>
            <span className="text-center text-[10px] leading-tight text-asm-body">{sub}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
