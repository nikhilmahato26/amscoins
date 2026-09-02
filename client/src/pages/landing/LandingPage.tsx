import { animate, motion, useInView, useMotionValue } from 'framer-motion'
import {
  ArrowRight,
  Award,
  ChartNoAxesCombined,
  Clock,
  Headphones,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'

import asmCoin from '@/assets/asm.jpeg'
import btcCoin from '@/assets/btc.jpeg'
import goldCoin from '@/assets/gold.jpeg'
import diamondMedallion from '@/assets/plans/diamond.png'
import goldMedallion from '@/assets/plans/gold.png'
import silverMedallion from '@/assets/plans/silver.png'
import { Sparkline } from '@/components/home/Sparkline'
import {
  LandingFooter,
  LandingHeader,
  LandingMenu,
} from '@/components/landing/LandingChrome'
import { cn } from '@/lib/utils'

/* ── Framer Motion variants ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 80, damping: 18 },
  },
}

/* ── Data ── */
const TRUST_PILLS: { Icon: LucideIcon; label: string }[] = [
  { Icon: ShieldCheck, label: 'Admin Verified'       },
  { Icon: Zap,         label: '3-Hour Payouts'       },
  { Icon: Headphones,  label: 'Daily Support'        },
  { Icon: TrendingUp,  label: '30%–40% Returns'      },
  { Icon: Clock,       label: '72-Hour Cycles'       },
  { Icon: Wallet,      label: 'Direct UPI Payout'    },
]

type MarketRow = {
  symbol: string; pair: string; price: string; change: string;
  positive: boolean; series: number[]; icon: string
}

const ASM_BASE_PRICE = 12_850

const MARKET_STATIC: MarketRow[] = [
  { symbol: 'ASM',  pair: 'INR',  price: '₹12,850.00',    change: '+10.79%', positive: true,  series: [40,42,41,46,48,45,50,54,57,60,63,68], icon: asmCoin  },
  { symbol: 'BTC',  pair: 'USDT', price: '₹58,36,245.60', change: '+2.35%',  positive: true,  series: [38,41,39,44,43,48,46,52,55,53,58,62], icon: btcCoin  },
  { symbol: 'GOLD', pair: 'XAU',  price: '₹6,795.35',     change: '+1.82%',  positive: true,  series: [30,33,31,36,38,35,40,42,41,46,48,51], icon: goldCoin },
]

function genMarketSeries(up: boolean, len = 12): number[] {
  const s: number[] = [50]
  for (let i = 1; i < len; i++) {
    s.push(Math.max(10, Math.min(90, s[i - 1] + (Math.random() - (up ? 0.35 : 0.65)) * 10)))
  }
  return s
}

function fmtLandingINR(n: number): string {
  return '₹' + Math.round(n).toLocaleString('en-IN') + '.00'
}

const PLANS: {
  slug: string; name: string; returns: string; duration: string;
  min: string; max: string; unlockNote: string; accent: 'silver' | 'gold' | 'diamond'
}[] = [
  { slug: 'silver',  name: 'Silver Plan',  returns: '30%', duration: '72 Hours', min: '₹1,000', max: '₹10,000',   unlockNote: 'Default Tier',              accent: 'silver'  },
  { slug: 'gold',    name: 'Gold Plan',    returns: '40%', duration: '72 Hours', min: '₹3,000', max: '₹3,00,000',  unlockNote: 'Unlocks with 21 referrals', accent: 'gold'    },
  { slug: 'diamond', name: 'Diamond Plan', returns: '40%', duration: '72 Hours', min: '₹5,000', max: '₹5,00,000',  unlockNote: 'Unlocks with 52 referrals', accent: 'diamond' },
]

/* ── CountUp component (Task 2) ── */
function CountUp({
  to,
  suffix = '',
  prefix = '',
  duration = 1.8,
}: {
  to: number
  suffix?: string
  prefix?: string
  duration?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-10% 0px' })
  const motionVal = useMotionValue(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(motionVal, to, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate(v) {
        if (ref.current) ref.current.textContent = `${prefix}${Math.round(v).toLocaleString('en-IN')}${suffix}`
      },
    })
    return controls.stop
  }, [inView, motionVal, to, duration, prefix, suffix])

  return (
    <span ref={ref}>{prefix}0{suffix}</span>
  )
}

/* ── TrustSection (Task 3) ── */
function TrustSection() {
  return (
    <section aria-labelledby="trust-heading" className="bg-skin-tint px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <h2 id="trust-heading" className="mb-6 text-center font-jakarta text-[22px] font-extrabold text-skin-text sm:text-[28px]">
          Why investors trust ASM Coins
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {/* Regulatory */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-skin-line bg-skin-surface p-5 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-skin-tint">
              <ShieldCheck className="size-6 text-skin-accent" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-[14px] font-bold text-skin-text">Registered in India</span>
            <span className="text-[13px] leading-snug text-skin-body">Committed to regulatory compliance. Your investment is documented and protected.</span>
          </div>

          {/* Human approval */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-skin-line bg-skin-surface p-5 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-skin-tint">
              <Award className="size-6 text-asm-greenInk" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-[14px] font-bold text-skin-text">Human-Approved Payouts</span>
            <span className="text-[13px] leading-snug text-skin-body">Every withdrawal is manually reviewed and approved by our team — no black-box automation.</span>
          </div>

          {/* UPI speed */}
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-skin-line bg-skin-surface p-5 text-center">
            <span className="flex size-12 items-center justify-center rounded-xl bg-amber-50">
              <Zap className="size-6 text-amber-600" strokeWidth={1.75} aria-hidden />
            </span>
            <span className="text-[14px] font-bold text-skin-text">Fast UPI Payouts</span>
            <span className="text-[13px] leading-snug text-skin-body">Returns credited directly to your UPI ID. No bank transfer delays, no intermediaries.</span>
          </div>
        </div>

        {/* Payment marks */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-skin-muted">Accepted payment methods</span>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {['UPI', 'Paytm', 'PhonePe', 'Google Pay'].map((method) => (
              <span
                key={method}
                className="rounded-lg border border-skin-line bg-skin-surface px-3 py-1.5 text-[13px] font-bold text-skin-body shadow-sm"
              >
                {method}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ── PatrioticStrip (Task 5) ── */
function PatrioticStrip() {
  return (
    <div className="overflow-hidden border-y border-skin-accent/10 bg-gradient-to-r from-skin-tint via-skin-surface to-skin-tint py-3">
      <p className="text-center text-[12px] font-bold tracking-[0.1em] text-skin-text/70 uppercase">
        🇮🇳 Our Country · Our Pride · Our Strength — Invest in India&apos;s growth
      </p>
    </div>
  )
}

/* ── HOW_STEPS (Task 4) ── */
const HOW_STEPS = [
  {
    n: '01',
    title: 'Deposit funds',
    body: 'Add money to your ASM Coins wallet via UPI, Paytm, PhonePe, or Google Pay. Minimum ₹1,000.',
    icon: Wallet,
    tone: 'blue' as const,
  },
  {
    n: '02',
    title: 'Pick your plan',
    body: 'Choose Silver (30%), Gold (40%), or Diamond (40%) based on your investment amount.',
    icon: TrendingUp,
    tone: 'green' as const,
  },
  {
    n: '03',
    title: 'Withdraw your return',
    body: 'After 24 hours your principal + return is credited. Withdraw to UPI in minutes.',
    icon: ChartNoAxesCombined,
    tone: 'blue' as const,
  },
] as const

function HowItWorksSection() {
  return (
    <section id="about" aria-labelledby="how-heading" className="px-4 py-12 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 text-center text-[12px] font-bold uppercase tracking-[0.12em] text-skin-accent">Simple process</div>
        <h2 id="how-heading" className="mb-8 text-center font-jakarta text-[22px] font-extrabold text-skin-text sm:text-[28px]">
          Start earning in 3 steps
        </h2>

        <div className="flex flex-col gap-6 sm:flex-row sm:gap-4">
          {HOW_STEPS.map(({ n, title, body, icon: Icon, tone }) => (
            <div key={n} className="relative flex flex-1 flex-col gap-4 rounded-2xl border border-skin-line bg-skin-surface p-5">
              {/* Step number — large, light weight, positioned top-right */}
              <span
                aria-hidden
                className="absolute right-4 top-3 font-jakarta text-[48px] font-extrabold leading-none text-skin-tint"
              >
                {n}
              </span>
              <span
                className={cn(
                  'flex size-11 items-center justify-center rounded-xl',
                  tone === 'blue' ? 'bg-skin-tint' : 'bg-skin-tint'
                )}
              >
                <Icon
                  className={cn('size-5', tone === 'blue' ? 'text-skin-accent' : 'text-asm-greenInk')}
                  strokeWidth={1.75}
                  aria-hidden
                />
              </span>
              <div>
                <h3 className="text-[15px] font-bold text-skin-text">{title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-skin-body">{body}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 24-hour callout */}
        <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-skin-accent/20 bg-skin-tint px-4 py-3">
          <Clock className="size-4 text-skin-accent" strokeWidth={2} aria-hidden />
          <span className="text-[13px] font-semibold text-skin-accent">24-hour investment cycles — deposit today, withdraw tomorrow</span>
        </div>
      </div>
    </section>
  )
}

/* ── Page ── */
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen overflow-x-hidden bg-skin-bg font-jakarta text-skin-text transition-colors">
      <LandingHeader menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />
      <LandingMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main>
        {/* Hero constrained to max-width */}
        <div className="mx-auto w-full max-w-[1180px]">
          <Hero />
        </div>

        {/* Full-bleed strips */}
        <PatrioticStrip />
        <TrustMarquee />

        {/* ── Stats bar — full-bleed border, centered content ── */}
        <section aria-label="Platform statistics" className="border-y border-skin-line bg-skin-surface py-8">
          <div className="mx-auto max-w-3xl px-4">
            <div className="grid grid-cols-3 divide-x divide-skin-line">
              {[
                { value: 25000, suffix: '+', label: 'Investors' },
                { value: 50, prefix: '₹', suffix: 'Cr+', label: 'Investments' },
                { value: 12, prefix: '₹', suffix: 'Cr+', label: 'Payouts' },
              ].map(({ value, suffix, prefix, label }) => (
                <div key={label} className="flex flex-col items-center gap-1 px-4 text-center">
                  <span className="font-jakarta text-[28px] font-extrabold text-skin-text sm:text-[36px]">
                    <CountUp to={value} suffix={suffix} prefix={prefix} />
                  </span>
                  <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-skin-muted">{label}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 text-center text-[11px] text-skin-muted">
              Figures updated periodically. Past performance does not guarantee future returns.
            </p>
          </div>
        </section>

        {/* Full-bleed bg-skin-tint section */}
        <TrustSection />

        {/* Remaining content constrained to max-width */}
        <div className="mx-auto w-full max-w-[1180px] pb-8">
          <MarketSnapshot />
          <PlansSection />
          <HowItWorksSection />

          {/* ── Invite & Level Up ── */}
          <section
            id="referral"
            className="mx-4 mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[#0B4FD8] to-[#0E6E32] ring-1 ring-transparent transition-colors lg:mx-8 dark:from-[#3a2e08] dark:to-[#0B0B0C] dark:ring-skin-line"
          >
          <div className="relative px-5 py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 h-full w-[60%] opacity-10"
              style={{ background: 'radial-gradient(circle at 80% 30%, #fff 0%, transparent 70%)' }}
            />
            <UserPlus className="mb-3 size-8 text-white/80" strokeWidth={1.8} aria-hidden />
            <h2 className="text-[22px] font-extrabold leading-tight text-white">Invite &amp; Level Up</h2>
            <p className="mt-1.5 max-w-[38ch] text-[13px] leading-relaxed text-white/75">
              Refer members to unlock Gold (40%) and Diamond tiers with higher limits. Referrals credit when friends complete their first deposit.
            </p>
            <Link
              to="/register"
              className={cn(
                'group mt-5 inline-flex items-center gap-2 rounded-xl bg-skin-surface px-5 py-3',
                'text-[13px] font-bold uppercase tracking-[0.06em] text-[#0B4FD8]',
                'transition-colors hover:bg-blue-50',
                'dark:bg-[#F4C506] dark:text-[#0B0B0C] dark:hover:bg-[#FFD700]'
              )}
            >
              Start Referring
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                strokeWidth={2.4}
                aria-hidden
              />
            </Link>
          </div>
          </section>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}

/* ── Hero (Task 1) ── */
function Hero() {
  return (
    <section className="relative px-4 pb-8 pt-7 lg:px-8">
      {/* Ambient top wash — full viewport width so it reads as light, not a box.
         Blue/green in light, warm gold in dark. */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 h-[460px] w-screen -translate-x-1/2 dark:hidden"
        style={{
          background:
            'radial-gradient(130% 90% at 50% 0%, rgba(11,79,216,0.07) 0%, rgba(21,128,61,0.04) 34%, transparent 68%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 hidden h-[460px] w-screen -translate-x-1/2 dark:block"
        style={{
          background:
            'radial-gradient(130% 90% at 50% 0%, rgba(244,197,6,0.11) 0%, rgba(244,197,6,0.04) 40%, transparent 72%)',
        }}
      />

      <motion.div variants={container} initial="hidden" animate="visible" className="relative">

        {/* Live price pill */}
        <motion.div variants={fadeUp} className="mb-5 inline-flex">
          <div className="inline-flex items-center gap-2 rounded-full border border-asm-greenInk/20 bg-skin-tint px-3.5 py-1.5">
            <span className="relative flex size-[7px] shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-60" />
              <span className="relative inline-flex size-[7px] rounded-full bg-asm-greenInk" />
            </span>
            <span className="font-jakarta text-[11px] font-bold uppercase tracking-[0.14em] text-asm-greenInk">
              Live · ASM COIN ₹12,850 &nbsp;+10.79%
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="font-jakarta text-[42px] font-extrabold leading-[1.1] tracking-tight text-skin-text sm:text-[52px] lg:text-[60px]"
        >
          Smart Investment,{' '}
          <span className="text-skin-accent">Secure Future</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={fadeUp} className="mt-3 max-w-[34ch] text-[16px] leading-snug text-skin-body sm:text-[18px]">
          25–40% returns in 24 hours. UPI payout. Human-approved.
        </motion.p>

        {/* CTA pair */}
        <motion.div variants={fadeUp} className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            to="/register"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-skin-accent px-6 text-[15px] font-bold text-skin-on-accent shadow-[0_4px_16px_-4px_rgba(11,79,216,0.5)] transition-all hover:bg-skin-accent-hover hover:shadow-[0_6px_20px_-4px_rgba(11,79,216,0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-accent focus-visible:ring-offset-2 dark:shadow-[0_4px_16px_-4px_rgba(244,197,6,0.4)] dark:hover:shadow-[0_6px_20px_-4px_rgba(244,197,6,0.45)]"
          >
            Start Investing <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
          </Link>
          <a
            href="#plans"
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-skin-line bg-skin-surface px-6 text-[15px] font-semibold text-skin-text transition-colors hover:border-skin-accent hover:text-skin-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-accent"
          >
            See Plans
          </a>
        </motion.div>

      </motion.div>
    </section>
  )
}

/* ── Trust Marquee ── */
function TrustMarquee() {
  return (
    <div
      className="relative overflow-hidden border-y border-skin-line bg-skin-tint/60 py-3"
      aria-hidden
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-skin-tint to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-skin-tint to-transparent" />

      {/* Double list for seamless loop */}
      <div className="flex animate-marquee gap-4 will-change-transform">
        {[...TRUST_PILLS, ...TRUST_PILLS].map(({ Icon, label }, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full border border-skin-line bg-skin-surface px-3.5 py-1.5"
          >
            <Icon className="size-3.5 shrink-0 text-skin-accent" strokeWidth={2.2} aria-hidden />
            <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.05em] text-skin-text">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Market Snapshot ── */
function MarketSnapshot() {
  const [rows, setRows] = useState<MarketRow[]>(MARKET_STATIC)
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
        const goldPct: number = d?.['pax-gold']?.inr_24h_change ?? 1.82

        const maxCompetitor = Math.max(btcPct, goldPct)
        const asmPct = Math.max(maxCompetitor + 3 + Math.random() * 3, 5)

        const sign = (n: number) => n >= 0 ? '+' : ''

        if (!cancelled) {
          setRows([
            {
              symbol: 'ASM', pair: 'INR',
              price: fmtLandingINR(ASM_BASE_PRICE),
              change: `${sign(asmPct)}${asmPct.toFixed(2)}%`,
              positive: true, series: genMarketSeries(true), icon: asmCoin,
            },
            {
              symbol: 'BTC', pair: 'USDT',
              price: fmtLandingINR(btcINR),
              change: `${sign(btcPct)}${btcPct.toFixed(2)}%`,
              positive: btcPct >= 0, series: genMarketSeries(btcPct >= 0), icon: btcCoin,
            },
            {
              symbol: 'GOLD', pair: 'XAU',
              price: fmtLandingINR(goldINR),
              change: `${sign(goldPct)}${goldPct.toFixed(2)}%`,
              positive: goldPct >= 0, series: genMarketSeries(goldPct >= 0), icon: goldCoin,
            },
          ])
        }
      } catch {
        // network/timeout — keep current rows
      }

      if (!cancelled) {
        timerRef.current = setTimeout(load, 60_000)
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  return (
    <section
      className="mx-4 mt-6 overflow-hidden rounded-2xl border border-skin-line bg-skin-surface shadow-[0_2px_14px_-4px_rgba(16,42,92,0.06)] lg:mx-8"
      aria-labelledby="market-heading"
    >
      <div className="flex items-center gap-3 border-b border-skin-line px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="relative flex size-[7px] shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-60" />
              <span className="relative inline-flex size-[7px] rounded-full bg-asm-greenInk" />
            </span>
            <h2
              id="market-heading"
              className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-skin-text"
            >
              Market snapshot
            </h2>
          </div>
          <p className="mt-0.5 text-[10px] text-skin-muted">Indicative rates · prices update periodically</p>
        </div>
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-skin-tint/70">
            <th scope="col" className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-skin-muted">Asset</th>
            <th scope="col" className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-skin-muted">Price</th>
            <th scope="col" className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-skin-muted sm:px-2">24h</th>
            <th scope="col" className="hidden px-4 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-skin-muted sm:table-cell">Chart</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-skin-line/60">
          {rows.map(({ symbol, pair, price, change, positive, series, icon }) => (
            <tr key={symbol} className="transition-colors hover:bg-skin-tint/40">
              <th scope="row" className="px-4 py-3.5 text-left font-normal">
                <span className="flex items-center gap-2.5">
                  <img
                    src={icon}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    className="size-8 shrink-0 rounded-full bg-skin-surface object-contain ring-1 ring-skin-line"
                  />
                  <span className="flex flex-col">
                    <span className="text-[13px] font-bold leading-tight">{symbol}</span>
                    <span className="text-[10px] leading-tight text-skin-muted">{pair}</span>
                  </span>
                </span>
              </th>
              <td className="px-2 py-3.5 text-right text-[13px] font-semibold tabular-nums">{price}</td>
              <td className={cn('px-3 py-3.5 text-right text-[12px] font-bold tabular-nums sm:px-2', positive ? 'text-asm-greenInk' : 'text-asm-red')}>
                {change}
              </td>
              <td className="hidden px-4 py-3.5 sm:table-cell">
                <span className="flex justify-end">
                  <Sparkline values={series} positive={positive} />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

/* ── Plan accent config ── */
const PLAN_ACCENT = {
  silver: {
    ring: 'ring-[#B1B5BB]/40 dark:ring-white/15',
    strip: 'from-[#CED5E1] to-[#9CA8B8]',
    medallion: silverMedallion,
    figure: 'text-skin-text',
    button: 'bg-skin-accent hover:bg-skin-accent-hover',
    badge: 'bg-[#CED5E1]/40 text-[#5A6472] dark:bg-white/10 dark:text-skin-body',
  },
  gold: {
    ring: 'ring-[#E8B84B]/50',
    strip: 'from-[#F4C506] to-[#E8A000]',
    medallion: goldMedallion,
    figure: 'text-asm-greenInk dark:text-[#F4C506]',
    button: 'bg-asm-greenInk hover:bg-[#0E6E32] dark:bg-[#F4C506] dark:hover:bg-[#FFD700]',
    badge: 'bg-amber-50 text-amber-700 dark:bg-[#F4C506]/15 dark:text-[#F4C506]',
  },
  diamond: {
    ring: 'ring-[#7DD3FC]/50',
    strip: 'from-[#0B4FD8] to-[#1E93FE]',
    medallion: diamondMedallion,
    figure: 'text-skin-accent dark:text-[#5AB0FF]',
    button: 'bg-skin-accent hover:bg-skin-accent-hover dark:bg-[#1E93FE] dark:hover:bg-[#3AA5FF]',
    badge: 'bg-skin-tint text-skin-accent dark:bg-[#1E93FE]/15 dark:text-[#7DD3FC]',
  },
} as const

/* ── Plans Section (Task 5) ── */
function PlansSection() {
  return (
    <section id="plans" className="scroll-mt-4 pt-8" aria-labelledby="plans-heading">
      <div className="mb-5 flex items-end justify-between px-4 lg:px-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-skin-accent">Investment Plans</p>
          <h2 id="plans-heading" className="mt-0.5 text-[22px] font-extrabold leading-tight text-skin-text">
            Choose your tier
          </h2>
        </div>
        <a
          href="#about"
          className="flex items-center gap-1 text-[12px] font-bold text-skin-accent hover:text-skin-accent-hover"
        >
          How it works
          <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
        </a>
      </div>

      <div
        className={cn(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-pl-4 pb-2',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-8'
        )}
      >
        {/* Left spacer — ensures first card has 16px gap from screen edge on mobile */}
        <span className="w-4 shrink-0 sm:hidden" aria-hidden />
        {PLANS.map(({ slug, name, returns, duration, min, max, unlockNote, accent }) => {
          const a = PLAN_ACCENT[accent]
          return (
            <motion.article
              key={slug}
              whileHover={{ y: -4, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } }}
              className={cn(
                'flex w-[80%] min-w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-skin-surface ring-1',
                'sm:w-auto sm:min-w-0',
                a.ring
              )}
            >
              {/* Tier gradient top strip */}
              <div className={cn('h-[5px] w-full bg-gradient-to-r', a.strip)} />

              <div className="flex flex-col items-center px-4 pb-5 pt-4">
                <img
                  src={a.medallion}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-[96px] w-auto max-w-full object-contain drop-shadow-md"
                />

                <span className={cn('mt-1.5 rounded-full px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-[0.1em]', a.badge)}>
                  {name}
                </span>
                <span className="mt-1 text-[10px] font-semibold text-skin-muted">
                  {unlockNote}
                </span>

                {/* Return % — largest element on the card */}
                <div className="flex flex-col items-center py-4">
                  <span className={cn('font-jakarta text-[44px] font-extrabold leading-none', a.figure)}>
                    {returns}
                  </span>
                  <span className="mt-1 text-[13px] font-semibold text-skin-muted">annual equivalent return</span>
                </div>

                <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-skin-muted">Duration</p>
                <p className="text-[13px] font-bold uppercase tabular-nums">{duration}</p>

                <dl className="mt-3.5 flex w-full items-start justify-between border-t border-skin-line pt-3">
                  <div className="flex flex-col">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-skin-muted">Min</dt>
                    <dd className="text-[12px] font-bold tabular-nums">{min}</dd>
                  </div>
                  <div className="flex flex-col items-end">
                    <dt className="text-[10px] font-bold uppercase tracking-[0.1em] text-skin-muted">Max</dt>
                    <dd className="text-[12px] font-bold tabular-nums">{max}</dd>
                  </div>
                </dl>

                <Link
                  to={`/register?plan=${slug}`}
                  aria-label={`Get started with the ${name}`}
                  className={cn(
                    'mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl px-2',
                    'text-[11px] font-bold uppercase tracking-[0.1em] text-skin-on-accent transition-colors',
                    a.button
                  )}
                >
                  Get Started
                </Link>
              </div>
            </motion.article>
          )
        })}
      </div>

      <p className="mt-4 px-4 text-center text-[11px] leading-relaxed text-skin-body lg:px-8">
        Returns shown are plan terms, not guarantees. Read the full terms before you invest.
      </p>
    </section>
  )
}
