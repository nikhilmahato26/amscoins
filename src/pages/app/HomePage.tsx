import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  ChartNoAxesCombined,
  Headphones,
  MapPin,
  Receipt,
  Rocket,
  ShieldCheck,
  TrendingUp,
  User,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { HeroMark } from '@/components/home/HeroMark'
import { HomeHeader, HomeMenu, HomeSideNav, HomeTabBar } from '@/components/home/HomeChrome'
import { Sparkline } from '@/components/home/Sparkline'
import { cn } from '@/lib/utils'

/*
 * ---------------------------------------------------------------------------
 * PLACEHOLDER CONTENT
 *
 * Every figure below came from the supplied mockup, not from a data source.
 * Two groups need attention before this ships:
 *
 * 1. PLATFORM_STATS and the trust strip are factual claims about the business.
 *    They must be true and substantiable — for an investment product in India
 *    they are consumer-facing representations, not decoration.
 *
 * 2. MARKET is static. The panel is labelled "Live Market" and shows a
 *    timestamp, so it needs a real feed before it can carry that label
 *    honestly. Wire it up or relabel it.
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

const MARKET: {
  symbol: string
  pair: string
  price: string
  change: string
  positive: boolean
  series: number[]
  swatch: string
  glyph: string
}[] = [
  {
    symbol: 'BTC',
    pair: 'USDT',
    price: '₹58,36,245.60',
    change: '+2.35%',
    positive: true,
    series: [38, 41, 39, 44, 43, 48, 46, 52, 55, 53, 58, 62],
    swatch: 'bg-[#F7931A]',
    glyph: '₿',
  },
  {
    symbol: 'GOLD',
    pair: 'XAU',
    price: '₹6,795.35',
    change: '+1.82%',
    positive: true,
    series: [30, 33, 31, 36, 38, 35, 40, 42, 41, 46, 48, 51],
    swatch: 'bg-[#E8B84B]',
    glyph: 'Au',
  },
  {
    symbol: 'SILVER',
    pair: 'XAG',
    price: '₹89.42',
    change: '+0.76%',
    positive: true,
    series: [42, 40, 44, 43, 46, 45, 48, 47, 50, 49, 52, 54],
    swatch: 'bg-[#B1B5BB]',
    glyph: 'Ag',
  },
  {
    symbol: 'CRUDE OIL',
    pair: 'USOIL',
    price: '₹6,350.70',
    change: '+1.21%',
    positive: true,
    series: [34, 37, 35, 39, 42, 40, 44, 43, 47, 49, 48, 53],
    swatch: 'bg-[#1F2937]',
    glyph: 'Oil',
  },
  {
    symbol: 'USD',
    pair: 'INR',
    price: '₹83.32',
    change: '+0.18%',
    positive: true,
    series: [46, 47, 46, 48, 49, 48, 50, 51, 50, 52, 53, 54],
    swatch: 'bg-[#2563EB]',
    glyph: '$',
  },
]

const PLANS: {
  name: string
  returns: string
  duration: string
  min: string
  max: string
  accent: 'silver' | 'gold' | 'diamond'
}[] = [
  {
    name: 'Silver Plan',
    returns: '25%',
    duration: '36 Hours',
    min: '₹1,000',
    max: '₹50,000',
    accent: 'silver',
  },
  {
    name: 'Gold Plan',
    returns: '30%',
    duration: '36 Hours',
    min: '₹3,000',
    max: '₹5,000',
    accent: 'gold',
  },
  {
    name: 'Diamond Plan',
    returns: '40%',
    duration: '36 Hours',
    min: '₹5,000',
    max: '₹5,00,000',
    accent: 'diamond',
  },
]

const QUICK_ACTIONS: { to: string; label: string; Icon: LucideIcon; tone: string }[] = [
  { to: '/app/invest', label: 'Deposit', Icon: ArrowDownToLine, tone: 'text-asm-greenInk' },
  { to: '/app/withdraw', label: 'Withdrawal', Icon: ArrowUpFromLine, tone: 'text-asm-blue' },
  { to: '/app/transactions', label: 'Transactions', Icon: Receipt, tone: 'text-asm-blue' },
  { to: '/app/referral', label: 'Referral', Icon: Users, tone: 'text-[#7C3AED]' },
  { to: '/app/account', label: 'My Profile', Icon: User, tone: 'text-asm-greenInk' },
]

export function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="theme-light-home min-h-screen bg-white font-jakarta text-asm-navy">
      <HomeSideNav />
      <HomeMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:pl-60">
        <HomeHeader menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />

        <main className="mx-auto w-full max-w-[420px] px-4 pb-28 sm:max-w-[600px] lg:max-w-[900px] lg:pb-14 xl:max-w-[1120px]">
          <Hero />

          <section className="pt-5" aria-label="Platform guarantees">
            <div className="grid grid-cols-3 gap-2.5">
              {TRUST_SIGNALS.map(({ Icon, title, note, tone }) => (
                <div
                  key={title}
                  className="flex flex-col items-start gap-2 rounded-xl border border-asm-line bg-white p-3"
                >
                  <span
                    className={cn(
                      'flex size-8 items-center justify-center rounded-lg',
                      tone === 'green' ? 'bg-asm-green-tint' : 'bg-asm-blue-tint'
                    )}
                  >
                    <Icon
                      className={cn(
                        'size-[18px]',
                        tone === 'green' ? 'text-asm-greenInk' : 'text-asm-blue'
                      )}
                      strokeWidth={2.2}
                      aria-hidden
                    />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-bold uppercase leading-tight tracking-[0.04em]">
                      {title}
                    </span>
                    <span className="text-[11px] leading-tight text-asm-body">{note}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3 pt-5 sm:flex-row">
            <Link
              to="/app/invest"
              className={cn(
                'group flex flex-1 items-center justify-center gap-3 rounded-xl bg-asm-blue px-6 py-4',
                'text-[15px] font-bold uppercase tracking-[0.08em] text-white',
                'shadow-[0_10px_22px_-12px_rgb(11_79_216_/_0.75)]',
                'transition-colors hover:bg-asm-blue-dark'
              )}
            >
              Start Investing
              <Rocket
                className="size-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
                strokeWidth={2.2}
                aria-hidden
              />
            </Link>
            <Link
              to="/plans"
              className={cn(
                'flex flex-1 items-center justify-center gap-3 rounded-xl border border-asm-blue/35 bg-white px-6 py-4',
                'text-[15px] font-bold uppercase tracking-[0.08em] text-asm-blue',
                'transition-colors hover:border-asm-blue hover:bg-asm-blue-tint'
              )}
            >
              Investment Plans
              <ChartNoAxesCombined className="size-[18px]" strokeWidth={2.2} aria-hidden />
            </Link>
          </section>

          <section className="mt-6 rounded-xl border border-asm-line bg-white" aria-label="Platform figures">
            <dl className="grid grid-cols-2 divide-asm-line sm:grid-cols-4 sm:divide-x">
              {PLATFORM_STATS.map(({ Icon, value, label }, index) => (
                <div
                  key={label}
                  className={cn(
                    'flex items-center gap-2.5 p-3.5',
                    index < 2 && 'border-b border-asm-line sm:border-b-0'
                  )}
                >
                  <Icon className="size-[22px] shrink-0 text-asm-blue" strokeWidth={1.9} aria-hidden />
                  <div className="flex min-w-0 flex-col">
                    <dt className="order-2 truncate text-[11px] leading-tight text-asm-body">
                      {label}
                    </dt>
                    <dd className="order-1 text-[17px] font-extrabold leading-tight tabular-nums">
                      {value}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </section>

          <LiveMarket />

          <PlansSection />

          <section className="pt-8" aria-labelledby="quick-actions">
            <h2
              id="quick-actions"
              className="pb-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-asm-blue"
            >
              Quick Actions
            </h2>
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
              {QUICK_ACTIONS.map(({ to, label, Icon, tone }) => (
                <Link
                  key={label}
                  to={to}
                  className={cn(
                    'flex flex-col items-center gap-2 rounded-xl border border-asm-line bg-white px-2 py-3.5',
                    'transition-colors hover:border-asm-blue/40 hover:bg-asm-tint'
                  )}
                >
                  <Icon className={cn('size-[22px]', tone)} strokeWidth={2} aria-hidden />
                  <span className="text-center text-[10px] font-bold uppercase leading-tight tracking-[0.06em]">
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-6 flex items-center gap-4 rounded-xl bg-gradient-to-r from-asm-blue-tint to-asm-green-tint p-4">
            <UserPlus className="size-8 shrink-0 text-asm-blue" strokeWidth={1.8} aria-hidden />
            <div className="flex min-w-0 flex-1 flex-col">
              <h2 className="text-base font-extrabold leading-tight text-asm-blue">Invite &amp; Earn</h2>
              <p className="pt-0.5 text-xs leading-snug text-asm-body">
                Refer your friends and earn exciting rewards
              </p>
            </div>
            <Link
              to="/app/referral"
              className={cn(
                'group flex min-h-11 shrink-0 items-center gap-2 rounded-lg border border-asm-greenInk bg-white px-3.5',
                'text-[11px] font-bold uppercase tracking-[0.08em] text-asm-greenInk',
                'transition-colors hover:bg-asm-greenInk hover:text-white'
              )}
            >
              Refer Now
              <ArrowRight
                className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
                strokeWidth={2.4}
                aria-hidden
              />
            </Link>
          </section>
        </main>
      </div>

      <HomeTabBar />
    </div>
  )
}

function Hero() {
  return (
    <section className="grid items-center gap-4 pt-5 lg:grid-cols-[1.05fr_1fr] lg:gap-10 lg:pt-10">
      <div className="animate-rise">
        <h1 className="text-[26px] leading-[1.12] tracking-[-0.02em] lg:text-[40px]">
          <span className="block font-semibold text-asm-navy">Smart Investment</span>
          <span className="block pt-0.5 font-extrabold">
            <span className="text-asm-navy">Secure </span>
            <span className="text-asm-green">Future</span>
          </span>
        </h1>

        <p className="max-w-[46ch] pt-3 text-sm leading-relaxed text-asm-body lg:text-base">
          ASM Coins is a trusted investment platform empowering people of India to build wealth and
          achieve financial freedom.
        </p>

        <div className="mt-4 flex items-center gap-3 rounded-xl border border-asm-line bg-white p-3.5">
          <MapPin className="size-6 shrink-0 text-asm-blue" strokeWidth={2.1} aria-hidden />
          <span className="flex flex-col">
            <span className="text-sm font-extrabold uppercase leading-tight tracking-[0.06em]">
              India
            </span>
            <span className="text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-asm-body">
              Our country, our pride, our strength
            </span>
          </span>
        </div>
      </div>

      <HeroMark className="mx-auto aspect-square w-full max-w-[230px] animate-rise lg:max-w-[340px]" />
    </section>
  )
}

function LiveMarket() {
  return (
    <section className="mt-6 overflow-hidden rounded-xl border border-asm-line bg-white">
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-2">
        <h2 className="flex items-center gap-2 text-[13px] font-extrabold uppercase tracking-[0.1em]">
          <span className="relative flex size-2">
            <span className="absolute inset-0 animate-live-pulse rounded-full bg-asm-green" />
          </span>
          Live Market
        </h2>
        <Link
          to="/app/market"
          className={cn(
            '-mr-2 flex min-h-11 items-center rounded-lg px-2',
            'text-[11px] font-bold uppercase tracking-[0.1em] text-asm-greenInk hover:underline'
          )}
        >
          View all
        </Link>
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-asm-line bg-asm-tint/60">
            <th
              scope="col"
              className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted"
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
              className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted"
            >
              24h
            </th>
            <th
              scope="col"
              className="px-4 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted"
            >
              Chart
            </th>
          </tr>
        </thead>
        <tbody>
          {MARKET.map(({ symbol, pair, price, change, positive, series, swatch, glyph }) => (
            <tr key={symbol} className="border-b border-asm-line/70 last:border-b-0">
              <th scope="row" className="px-4 py-2.5 text-left font-normal">
                <span className="flex items-center gap-2.5">
                  <span
                    className={cn(
                      'flex size-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white',
                      swatch
                    )}
                    aria-hidden
                  >
                    {glyph}
                  </span>
                  <span className="flex items-baseline gap-1">
                    <span className="text-[13px] font-bold">{symbol}</span>
                    <span className="text-[11px] text-asm-muted">/ {pair}</span>
                  </span>
                </span>
              </th>
              <td className="px-2 py-2.5 text-right text-[13px] font-semibold tabular-nums">
                {price}
              </td>
              <td className="px-2 py-2.5 text-right text-[12px] font-bold tabular-nums text-asm-greenInk">
                {change}
              </td>
              <td className="px-4 py-2.5">
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

const PLAN_ACCENT = {
  silver: {
    ring: 'ring-[#B1B5BB]/50',
    chip: 'bg-gradient-to-b from-[#E4E8EE] to-[#B1B5BB]',
    figure: 'text-asm-blue',
    button: 'bg-asm-blue hover:bg-asm-blue-dark',
  },
  gold: {
    ring: 'ring-[#E8B84B]/60',
    chip: 'bg-gradient-to-b from-[#F7DE9B] to-[#D9A227]',
    figure: 'text-asm-greenInk',
    button: 'bg-asm-greenInk hover:bg-[#0E6E32]',
  },
  diamond: {
    ring: 'ring-[#7DD3FC]/60',
    chip: 'bg-gradient-to-b from-[#BAE6FD] to-[#38BDF8]',
    figure: 'text-asm-blue',
    button: 'bg-asm-blue hover:bg-asm-blue-dark',
  },
} as const

function PlansSection() {
  return (
    <section className="pt-8" aria-labelledby="plans-heading">
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

      <div className="grid grid-cols-3 gap-2.5 pt-4 max-[420px]:grid-cols-1 sm:gap-4">
        {PLANS.map(({ name, returns, duration, min, max, accent }) => {
          const a = PLAN_ACCENT[accent]
          return (
            <article
              key={name}
              className={cn(
                'flex flex-col items-center rounded-xl bg-white p-3 ring-1',
                a.ring,
                'sm:p-4'
              )}
            >
              <span
                className={cn('flex size-9 items-center justify-center rounded-full', a.chip)}
                aria-hidden
              />
              <h3 className="pt-2 text-center text-[11px] font-bold uppercase leading-tight tracking-[0.06em] sm:text-xs">
                {name}
              </h3>

              <p className={cn('pt-2 text-[26px] font-extrabold leading-none tabular-nums', a.figure)}>
                {returns}
              </p>
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-asm-muted">
                Returns
              </p>

              <p className="pt-2.5 text-[9px] font-bold uppercase tracking-[0.14em] text-asm-muted">
                Duration
              </p>
              <p className="text-[13px] font-bold uppercase tabular-nums">{duration}</p>

              <dl className="mt-3 flex w-full items-start justify-between border-t border-asm-line pt-2.5">
                <div className="flex flex-col">
                  <dt className="text-[8px] font-bold uppercase tracking-[0.1em] text-asm-muted">
                    Min
                  </dt>
                  <dd className="text-[11px] font-bold tabular-nums">{min}</dd>
                </div>
                <div className="flex flex-col items-end">
                  <dt className="text-[8px] font-bold uppercase tracking-[0.1em] text-asm-muted">
                    Max
                  </dt>
                  <dd className="text-[11px] font-bold tabular-nums">{max}</dd>
                </div>
              </dl>

              <Link
                to="/app/invest"
                aria-label={`Invest in the ${name}`}
                className={cn(
                  'mt-3 flex min-h-11 w-full items-center justify-center rounded-lg px-2 py-2.5',
                  'text-[10px] font-bold uppercase tracking-[0.1em] text-white transition-colors sm:text-[11px]',
                  a.button
                )}
              >
                Invest Now
              </Link>
            </article>
          )
        })}
      </div>
    </section>
  )
}
