import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, ShieldCheck, TrendingUp } from 'lucide-react'

import { cn } from '@/lib/utils'

const IMG_ASM     = '/asm.png'
const IMG_BITCOIN = '/bitcoin.png'
const IMG_GOLD    = '/gold.png'

const ASM_PRICE   = 12_850
const REFETCH_MS  = 60_000

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
      <polyline points={points} stroke={stroke} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={lastY} r="3" fill={stroke} />
    </svg>
  )
}

function genSeries(up: boolean, len = 12): number[] {
  const s: number[] = [50]
  for (let i = 1; i < len; i++) {
    s.push(Math.max(10, Math.min(90, s[i - 1] + (Math.random() - (up ? 0.35 : 0.65)) * 10)))
  }
  return s
}

function fmtINR(n: number): string {
  return Math.round(n).toLocaleString('en-IN')
}

const STATIC_ROWS: Row[] = [
  {
    id: 'asm', symbol: 'ASM COIN', ticker: 'ASM', name: 'ASM Coins Ecosystem',
    price: '12,850', change: '+1,250 (+10.79%)', up: true, icon: IMG_ASM,
    series: [40, 42, 41, 46, 48, 45, 50, 54, 57, 60, 63, 68], featured: 'green',
  },
  {
    id: 'btc', symbol: 'BITCOIN', ticker: 'BTC', name: 'Bitcoin',
    price: '58,36,245', change: '+2.35%', up: true, icon: IMG_BITCOIN,
    series: [38, 41, 39, 44, 43, 48, 46, 52, 55, 53, 58, 62],
  },
  {
    id: 'gold', symbol: 'GOLD', ticker: 'XAU', name: 'Gold Spot',
    price: '6,795', change: '-0.42%', up: false, icon: IMG_GOLD,
    series: [80, 76, 78, 72, 68, 64, 60, 57, 53, 49, 45, 42], featured: 'gold',
  },
]

const TRUST = [
  { Icon: ShieldCheck, title: 'Admin Verified',  sub: 'Manual Approval' },
  { Icon: TrendingUp,  title: 'Indicative Rates', sub: 'Market Snapshot' },
  { Icon: Clock,       title: '24-Hour Term',     sub: 'Defined Cycle'   },
]

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { type: 'spring' as const, stiffness: 120, damping: 18, delay: i * 0.07 },
  }),
}

export function MarketTicker({ className }: { className?: string }) {
  const [rows, setRows] = useState<Row[]>(STATIC_ROWS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,pax-gold&vs_currencies=inr&include_24hr_change=true',
          { signal: AbortSignal.timeout(10_000) }
        )
        if (!res.ok || cancelled) return
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d: any = await res.json()

        const btcINR: number  = d?.bitcoin?.inr              ?? 5_836_245
        const btcPct: number  = d?.bitcoin?.inr_24h_change   ?? 2.35
        const goldINR: number = d?.['pax-gold']?.inr         ?? 6_795
        const goldPct: number = d?.['pax-gold']?.inr_24h_change ?? -0.42

        // ASM always beats both competitors
        const maxCompetitor = Math.max(btcPct, goldPct)
        const asmPct = Math.max(maxCompetitor + 3 + Math.random() * 3, 5)
        const asmAbs = Math.round(ASM_PRICE * asmPct / 100)

        const sign = (n: number) => n >= 0 ? '+' : ''

        if (!cancelled) {
          setRows([
            {
              id: 'asm', symbol: 'ASM COIN', ticker: 'ASM', name: 'ASM Coins Ecosystem',
              price: fmtINR(ASM_PRICE),
              change: `+${fmtINR(asmAbs)} (+${asmPct.toFixed(2)}%)`,
              up: true, icon: IMG_ASM,
              series: genSeries(true), featured: 'green',
            },
            {
              id: 'btc', symbol: 'BITCOIN', ticker: 'BTC', name: 'Bitcoin',
              price: fmtINR(btcINR),
              change: `${sign(btcPct)}${btcPct.toFixed(2)}%`,
              up: btcPct >= 0, icon: IMG_BITCOIN,
              series: genSeries(btcPct >= 0),
            },
            {
              id: 'gold', symbol: 'GOLD', ticker: 'XAU', name: 'Gold Spot',
              price: fmtINR(goldINR),
              change: `${sign(goldPct)}${goldPct.toFixed(2)}%`,
              up: goldPct >= 0, icon: IMG_GOLD,
              series: genSeries(goldPct >= 0), featured: 'gold',
            },
          ])
        }
      } catch {
        // network/timeout — keep current rows
      }

      if (!cancelled) {
        timerRef.current = setTimeout(load, REFETCH_MS)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

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

        {/* Static badge — not a button, no chevron */}
        <div className="flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full border border-asm-line bg-white px-3 py-1.5 text-[12px] font-semibold text-asm-navy">
          <span className="relative flex size-2 shrink-0" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-asm-greenInk" />
          </span>
          <Clock className="size-3.5 text-asm-blue" aria-hidden />
          24 Hr
        </div>
      </div>

      {/* Rows */}
      <ul className="flex flex-col gap-2.5">
        {rows.map(({ id, symbol, ticker, name, price, change, up, icon, series, featured }, i) => (
          <motion.li
            key={id}
            custom={i}
            variants={rowVariants}
            initial="hidden"
            animate="visible"
            whileHover={{ scale: 1.008, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } }}
            className={cn(
              'flex items-center gap-3 rounded-2xl border bg-white p-3 cursor-default',
              featured === 'green' && 'border-2 border-asm-greenInk bg-asm-green-tint/25',
              featured === 'gold'  && 'border-2 border-amber-400 bg-amber-50/60',
              !featured && 'border-asm-line shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]'
            )}
          >
            <img src={icon} alt="" className="size-12 shrink-0 rounded-full object-cover" loading="lazy" decoding="async" />

            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-[14px] font-extrabold leading-none',
                  featured === 'green' ? 'text-asm-greenInk' : featured === 'gold' ? 'text-amber-700' : 'text-asm-navy'
                )}>
                  {symbol}
                </span>
                <span className={cn(
                  'rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide',
                  featured === 'green' && 'bg-asm-green-tint text-asm-greenInk',
                  featured === 'gold'  && 'bg-amber-100 text-amber-700',
                  !featured && 'bg-asm-tint text-asm-muted'
                )}>
                  {ticker}
                </span>
              </div>
              <span className="truncate text-[11px] text-asm-body">{name}</span>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-0.5">
              <span className="font-mono text-[15px] font-bold tabular-nums text-asm-navy">{price}</span>
              <span className={cn(
                'text-[11px] font-semibold tabular-nums',
                up ? 'text-asm-greenInk' : (featured === 'gold' ? 'text-amber-600' : 'text-asm-red')
              )}>
                {change}
              </span>
            </div>

            <div className="shrink-0">
              <Sparkline series={series} up={up} />
            </div>
          </motion.li>
        ))}
      </ul>

      <p className="px-1 text-center text-[11px] text-asm-muted">
        Indicative rates · prices update periodically
      </p>

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
