import { useState } from 'react'
import {
  ArrowRight,
  ChartNoAxesCombined,
  Coins,
  Headphones,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import asmCoin from '@/assets/asm.jpeg'
import btcCoin from '@/assets/btc.jpeg'
import goldCoin from '@/assets/gold.jpeg'
// sliver.jpeg is the green mark supplied for the silver coin row.
import silverCoin from '@/assets/sliver.jpeg'
import diamondMedallion from '@/assets/plans/diamond.png'
import goldMedallion from '@/assets/plans/gold.png'
import silverMedallion from '@/assets/plans/silver.png'
import { AsmMark } from '@/components/home/AsmLogo'
import { IndiaFlag } from '@/components/home/IndiaFlag'
import { Sparkline } from '@/components/home/Sparkline'
import {
  LandingFooter,
  LandingHeader,
  LandingMenu,
} from '@/components/landing/LandingChrome'
import { cn } from '@/lib/utils'

/*
 * ---------------------------------------------------------------------------
 * PLACEHOLDER CONTENT
 *
 * Every figure below came from the supplied mockup, not from a data source.
 *
 * 1. PLATFORM_STATS and the trust strip are factual claims about the business.
 *    On a public page for an investment product in India these are consumer
 *    representations, not decoration. They must be true and substantiable.
 *
 * 2. MARKET is a static table. The mockup labels it "Live Market"; that label
 *    is not used here because nothing on this page is live. It reads
 *    "Market snapshot / indicative rates" until a real feed is wired up. Swap
 *    the heading back once prices actually update.
 *
 * 3. Plan returns and limits are commercial terms. They come from the Figma
 *    plan cards and need sign-off from whoever owns the product.
 * ---------------------------------------------------------------------------
 */

const TRUST_SIGNALS: { Icon: LucideIcon; title: string; note: string; tone: 'green' | 'blue' }[] = [
  { Icon: ShieldCheck, title: '100% Secure', note: 'SSL Encrypted', tone: 'green' },
  { Icon: Zap, title: 'Instant Payout', note: 'Withdraw Anytime', tone: 'blue' },
  { Icon: Headphones, title: '24/7 Support', note: 'Always Here For You', tone: 'blue' },
]

const PLATFORM_STATS: { Icon: LucideIcon; value: string; label: string }[] = [
  { Icon: Users, value: '25K+', label: 'Happy Investors' },
  { Icon: TrendingUp, value: '₹50Cr+', label: 'Total Investments' },
  { Icon: Wallet, value: '₹12Cr+', label: 'Total Payouts' },
  { Icon: ShieldCheck, value: '99.9%', label: 'Uptime & Security' },
]

/**
 * Movement is mixed on purpose. The mockup shows every asset green, which is
 * the most recognisable tell of a fabricated market and works against the
 * credibility the rest of the page is trying to earn.
 */
const MARKET: {
  symbol: string
  pair: string
  price: string
  change: string
  positive: boolean
  series: number[]
  icon: string
}[] = [
  {
    // ASM is the platform's own coin, so this price cannot be sourced from an
    // exchange — it has to come from whoever sets it. Placeholder until then.
    symbol: 'ASM',
    pair: 'INR',
    price: '₹12.40',
    change: '+1.65%',
    positive: true,
    series: [40, 42, 41, 45, 44, 47, 46, 50, 52, 51, 55, 58],
    icon: asmCoin,
  },
  {
    symbol: 'BTC',
    pair: 'USDT',
    price: '₹58,36,245.60',
    change: '+2.35%',
    positive: true,
    series: [38, 41, 39, 44, 43, 48, 46, 52, 55, 53, 58, 62],
    icon: btcCoin,
  },
  {
    symbol: 'GOLD',
    pair: 'XAU',
    price: '₹6,795.35',
    change: '+1.82%',
    positive: true,
    series: [30, 33, 31, 36, 38, 35, 40, 42, 41, 46, 48, 51],
    icon: goldCoin,
  },
  {
    symbol: 'SILVER',
    pair: 'XAG',
    price: '₹89.42',
    change: '-0.42%',
    positive: false,
    series: [52, 51, 53, 50, 48, 49, 47, 48, 45, 46, 44, 43],
    icon: silverCoin,
  },
]

const PLANS: {
  slug: string
  name: string
  returns: string
  duration: string
  min: string
  max: string
  accent: 'silver' | 'gold' | 'diamond'
}[] = [
  {
    slug: 'silver',
    name: 'Silver Plan',
    returns: '25%',
    duration: '36 Hours',
    min: '₹1,000',
    max: '₹50,000',
    accent: 'silver',
  },
  {
    slug: 'gold',
    name: 'Gold Plan',
    returns: '30%',
    duration: '36 Hours',
    min: '₹3,000',
    max: '₹5,000',
    accent: 'gold',
  },
  {
    slug: 'diamond',
    name: 'Diamond Plan',
    returns: '40%',
    duration: '36 Hours',
    min: '₹5,000',
    max: '₹5,00,000',
    accent: 'diamond',
  },
]

const HOW_IT_WORKS: { step: string; title: string; body: string }[] = [
  {
    step: '01',
    title: 'Create your account',
    body: 'Register with your mobile number and complete verification once.',
  },
  {
    step: '02',
    title: 'Choose a plan',
    body: 'Pick the plan whose limits and duration suit the amount you want to commit.',
  },
  {
    step: '03',
    title: 'Track and withdraw',
    body: 'Follow your position from the dashboard and withdraw to UPI when the term closes.',
  },
]

export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="theme-light-home min-h-screen bg-white font-jakarta text-asm-navy">
      <LandingHeader menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />
      <LandingMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="mx-auto w-full max-w-[1180px] px-4 pb-6 lg:px-8">
        <Hero />

        <section className="pt-6" aria-label="Platform guarantees">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            {TRUST_SIGNALS.map(({ Icon, title, note, tone }) => (
              <div
                key={title}
                className="flex items-center gap-3 rounded-xl border border-asm-line bg-white p-3.5"
              >
                <span
                  className={cn(
                    'flex size-9 shrink-0 items-center justify-center rounded-lg',
                    tone === 'green' ? 'bg-asm-green-tint' : 'bg-asm-blue-tint'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-[19px]',
                      tone === 'green' ? 'text-asm-greenInk' : 'text-asm-blue'
                    )}
                    strokeWidth={2.2}
                    aria-hidden
                  />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[12px] font-bold uppercase leading-tight tracking-[0.04em]">
                    {title}
                  </span>
                  <span className="pt-0.5 text-[12px] leading-tight text-asm-body">{note}</span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section
          className="mt-4 rounded-xl border border-asm-line bg-white"
          aria-label="Platform figures"
        >
          <dl className="grid grid-cols-2 divide-asm-line sm:grid-cols-4 sm:divide-x">
            {PLATFORM_STATS.map(({ Icon, value, label }, index) => (
              <div
                key={label}
                className={cn(
                  'flex items-center gap-3 p-4',
                  index < 2 && 'border-b border-asm-line sm:border-b-0'
                )}
              >
                <Icon className="size-6 shrink-0 text-asm-blue" strokeWidth={1.9} aria-hidden />
                <div className="flex min-w-0 flex-col">
                  <dt className="order-2 truncate text-[11px] leading-tight text-asm-body">
                    {label}
                  </dt>
                  <dd className="order-1 text-[19px] font-extrabold leading-tight tabular-nums">
                    {value}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        <MarketSnapshot />

        <PlansSection />

        <HowItWorks />

        <section
          id="referral"
          className="mt-8 flex flex-col items-start gap-4 rounded-xl bg-gradient-to-r from-asm-blue-tint to-asm-green-tint p-5 sm:flex-row sm:items-center"
        >
          <UserPlus className="size-9 shrink-0 text-asm-blue" strokeWidth={1.8} aria-hidden />
          <div className="flex min-w-0 flex-1 flex-col">
            <h2 className="text-lg font-extrabold leading-tight text-asm-blue">Invite &amp; Earn</h2>
            <p className="pt-1 text-[13px] leading-snug text-asm-body">
              Refer your friends and earn rewards on what they invest. Terms apply.
            </p>
          </div>
          <Link
            to="/register"
            className={cn(
              'group flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-asm-greenInk bg-white px-4',
              'text-[12px] font-bold uppercase tracking-[0.08em] text-asm-greenInk',
              'transition-colors hover:bg-asm-greenInk hover:text-white'
            )}
          >
            Join the programme
            <ArrowRight
              className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
              strokeWidth={2.4}
              aria-hidden
            />
          </Link>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}

function Hero() {
  return (
    <section className="pt-6 lg:pt-10">
      <div className="animate-rise">
        <h1 className="text-[21px] leading-[1.15] tracking-[-0.01em] sm:text-[26px] lg:text-[32px]">
          <span className="block font-semibold text-asm-navy">Smart Investment</span>
          <span className="block pt-0.5 font-extrabold">
            <span className="text-asm-navy">Secure </span>
            <span className="text-asm-green">Future</span>
          </span>
        </h1>

        <p className="max-w-[48ch] pt-3 text-[13px] leading-relaxed text-asm-body sm:text-sm">
          ASM Coins is an investment platform built for people across India who want a clear,
          straightforward way to grow what they have saved.
        </p>

        {/* Start Investing removed on request. The header Get Started button
            is now the only direct route to registration from the hero area. */}
        <div className="flex pt-6">
          <a
            href="#plans"
            className={cn(
              'flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-asm-blue/35 bg-white px-6 sm:w-auto',
              'text-[14px] font-bold uppercase tracking-[0.08em] text-asm-blue',
              'transition-colors hover:border-asm-blue hover:bg-asm-blue-tint'
            )}
          >
            Investment Plans
            <ChartNoAxesCombined className="size-[18px]" strokeWidth={2.2} aria-hidden />
          </a>
        </div>

        {/* Flag chip on the left, mark immediately to its right. */}
        <div className="mt-5 flex items-center gap-3">
          <div className="flex items-center gap-2.5 rounded-lg border border-asm-line bg-white py-1.5 pl-1.5 pr-3">
            <IndiaFlag className="h-6 w-9 shrink-0 rounded-[3px] shadow-[0_1px_3px_rgb(16_42_92_/_0.25)]" />
            <span className="flex flex-col">
              <span className="text-[12px] font-extrabold uppercase leading-tight tracking-[0.06em]">
                India
              </span>
              <span className="text-[9px] font-semibold uppercase leading-tight tracking-[0.08em] text-asm-body">
                Our country, our pride
              </span>
            </span>
          </div>

          <AsmMark className="size-12 animate-rise ring-1 ring-asm-line sm:size-14" />
        </div>
      </div>
    </section>
  )
}

function MarketSnapshot() {
  return (
    <section
      className="mt-4 overflow-hidden rounded-xl border border-asm-line bg-white"
      aria-labelledby="market-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-4 pb-2 pt-3">
        <div className="flex min-w-0 flex-col">
          <h2
            id="market-heading"
            className="text-[13px] font-extrabold uppercase tracking-[0.1em]"
          >
            Market snapshot
          </h2>
          <p className="pt-0.5 text-[11px] text-asm-body">
            Indicative rates, refreshed daily. Not a live feed.
          </p>
        </div>
      </div>

      {/*
        One table, no horizontal scroll. The chart column is dropped below sm
        because a sparkline is the least useful thing on a 360px screen, and
        making the table scroll sideways to keep it would hide the prices.
      */}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-asm-line bg-asm-tint/60">
            <th
              scope="col"
              className="px-3 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted sm:px-4"
            >
              Asset
            </th>
            <th
              scope="col"
              className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted"
            >
              Price
            </th>
            <th
              scope="col"
              className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted sm:px-2"
            >
              24h
            </th>
            <th
              scope="col"
              className="hidden px-4 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted sm:table-cell"
            >
              Chart
            </th>
          </tr>
        </thead>
        <tbody>
          {MARKET.map(({ symbol, pair, price, change, positive, series, icon }) => (
            <tr key={symbol} className="border-b border-asm-line/70 last:border-b-0">
              <th scope="row" className="px-3 py-3 text-left font-normal sm:px-4">
                <span className="flex items-center gap-2 sm:gap-2.5">
                  <img
                    src={icon}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    className="size-8 shrink-0 rounded-full bg-white object-contain ring-1 ring-asm-line"
                  />
                  <span className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
                    <span className="text-[13px] font-bold leading-tight">{symbol}</span>
                    <span className="text-[10px] leading-tight text-asm-muted sm:text-[11px]">
                      <span className="hidden sm:inline">/ </span>
                      {pair}
                    </span>
                  </span>
                </span>
              </th>
              <td className="px-2 py-3 text-right text-[13px] font-semibold tabular-nums">
                {price}
              </td>
              <td
                className={cn(
                  'px-3 py-3 text-right text-[12px] font-bold tabular-nums sm:px-2',
                  positive ? 'text-asm-greenInk' : 'text-asm-red'
                )}
              >
                {change}
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">
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

/*
 * The medallions are transparent PNGs and taller than they are wide, because of
 * the crown. They are sized by height with the width left to follow, and fitted
 * with object-contain — a circular crop would cut the crown off.
 */
const PLAN_ACCENT = {
  silver: {
    ring: 'ring-[#B1B5BB]/50',
    medallion: silverMedallion,
    figure: 'text-asm-blue',
    button: 'bg-asm-blue hover:bg-asm-blue-dark',
  },
  gold: {
    ring: 'ring-[#E8B84B]/60',
    medallion: goldMedallion,
    figure: 'text-asm-greenInk',
    button: 'bg-asm-greenInk hover:bg-[#0E6E32]',
  },
  diamond: {
    ring: 'ring-[#7DD3FC]/60',
    medallion: diamondMedallion,
    figure: 'text-asm-blue',
    button: 'bg-asm-blue hover:bg-asm-blue-dark',
  },
} as const

function PlansSection() {
  return (
    <section id="plans" className="scroll-mt-4 pt-10" aria-labelledby="plans-heading">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-asm-blue/40" />
        <h2
          id="plans-heading"
          className="whitespace-nowrap text-[13px] font-extrabold uppercase tracking-[0.14em] text-asm-blue"
        >
          Our Investment Plans
        </h2>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-asm-blue/40" />
      </div>

      {/*
        Swipeable on mobile, grid from sm. Stacking three full-width cards put
        the third plan two screens down, which stops it being a comparison; a
        snap rail keeps the next card visible at the right edge so it reads as
        "there are more" without scrolling the page.
      */}
      <div
        className={cn(
          '-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-5',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-0'
        )}
      >
        {PLANS.map(({ slug, name, returns, duration, min, max, accent }) => {
          const a = PLAN_ACCENT[accent]
          return (
            <article
              key={slug}
              className={cn(
                'flex w-[62%] min-w-[196px] shrink-0 snap-start flex-col items-center rounded-xl bg-white p-4 ring-1',
                'sm:w-auto sm:min-w-0 sm:p-5',
                a.ring
              )}
            >
              <img
                src={a.medallion}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-[88px] w-auto max-w-full object-contain sm:h-28"
              />
              <h3 className="pt-3 text-center text-xs font-bold uppercase leading-tight tracking-[0.06em]">
                {name}
              </h3>

              <p
                className={cn('pt-2.5 text-[30px] font-extrabold leading-none tabular-nums', a.figure)}
              >
                {returns}
              </p>
              <p className="pt-0.5 text-[9px] font-bold uppercase tracking-[0.14em] text-asm-muted">
                Returns
              </p>

              <p className="pt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-asm-muted">
                Duration
              </p>
              <p className="text-[13px] font-bold uppercase tabular-nums">{duration}</p>

              <dl className="mt-3.5 flex w-full items-start justify-between border-t border-asm-line pt-3">
                <div className="flex flex-col">
                  <dt className="text-[8px] font-bold uppercase tracking-[0.1em] text-asm-muted">
                    Min
                  </dt>
                  <dd className="text-[12px] font-bold tabular-nums">{min}</dd>
                </div>
                <div className="flex flex-col items-end">
                  <dt className="text-[8px] font-bold uppercase tracking-[0.1em] text-asm-muted">
                    Max
                  </dt>
                  <dd className="text-[12px] font-bold tabular-nums">{max}</dd>
                </div>
              </dl>

              {/*
                The chosen plan rides along in the query string so registration
                can carry it through instead of dropping the selection.
              */}
              <Link
                to={`/register?plan=${slug}`}
                aria-label={`Get started with the ${name}`}
                className={cn(
                  'mt-4 flex min-h-11 w-full items-center justify-center rounded-lg px-2',
                  'text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors',
                  a.button
                )}
              >
                Get Started
              </Link>
            </article>
          )
        })}
      </div>

      <p className="pt-4 text-center text-[11px] leading-relaxed text-asm-body">
        Returns shown are plan terms, not guarantees. Read the full terms before you invest.
      </p>
    </section>
  )
}

function HowItWorks() {
  return (
    <section id="about" className="scroll-mt-4 pt-10" aria-labelledby="about-heading">
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-asm-blue/40" />
        <h2
          id="about-heading"
          className="whitespace-nowrap text-[13px] font-extrabold uppercase tracking-[0.14em] text-asm-blue"
        >
          How It Works
        </h2>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-asm-blue/40" />
      </div>

      <ol className="grid gap-3 pt-5 sm:grid-cols-3 sm:gap-4">
        {HOW_IT_WORKS.map(({ step, title, body }) => (
          <li
            key={step}
            className="flex flex-col rounded-xl border border-asm-line bg-white p-4 sm:p-5"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-asm-blue-tint text-[13px] font-extrabold tabular-nums text-asm-blue">
              {step}
            </span>
            <h3 className="pt-3 text-[15px] font-extrabold leading-tight">{title}</h3>
            <p className="pt-1.5 text-[13px] leading-relaxed text-asm-body">{body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col items-start gap-4 rounded-xl border border-asm-line bg-asm-tint p-5 sm:flex-row sm:items-center">
        <Coins className="size-9 shrink-0 text-asm-blue" strokeWidth={1.8} aria-hidden />
        <p className="flex-1 text-[13px] leading-relaxed text-asm-body">
          Questions before you start? Our support team answers on WhatsApp and email, every day.
        </p>
        <Link
          to="/register"
          className={cn(
            'flex min-h-11 shrink-0 items-center rounded-lg bg-asm-blue px-5',
            'text-[12px] font-bold uppercase tracking-[0.08em] text-white',
            'transition-colors hover:bg-asm-blue-dark'
          )}
        >
          Create account
        </Link>
      </div>
    </section>
  )
}
