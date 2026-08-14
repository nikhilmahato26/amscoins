import { motion } from 'framer-motion'
import {
  ArrowRight,
  ChartNoAxesCombined,
  Coins,
  Headphones,
  Rocket,
  ShieldCheck,
  TrendingUp,
  UserPlus,
  Users,
  Wallet,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import asmCoin from '@/assets/asm.jpeg'
import btcCoin from '@/assets/btc.jpeg'
import goldCoin from '@/assets/gold.jpeg'
import silverCoin from '@/assets/market-silver.png'
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

/*
 * ---------------------------------------------------------------------------
 * PLACEHOLDER CONTENT
 * Every figure below came from the supplied mockup, not from a data source.
 * Plan returns and limits are commercial terms needing sign-off.
 * ---------------------------------------------------------------------------
 */

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
  { Icon: ShieldCheck, label: '100% Secure'       },
  { Icon: Zap,         label: 'Instant Payout'    },
  { Icon: Headphones,  label: '24/7 Support'      },
  { Icon: Users,       label: '25K+ Investors'    },
  { Icon: TrendingUp,  label: '₹50 Cr+ Invested'  },
  { Icon: Wallet,      label: 'Withdraw Anytime'  },
]

const PLATFORM_STATS: { Icon: LucideIcon; value: string; label: string; tone: 'blue' | 'green' }[] = [
  { Icon: Users,       value: '25K+',   label: 'Happy Investors',   tone: 'blue'  },
  { Icon: TrendingUp,  value: '₹50Cr+', label: 'Total Investments', tone: 'green' },
  { Icon: Wallet,      value: '₹12Cr+', label: 'Total Payouts',     tone: 'blue'  },
  { Icon: ShieldCheck, value: '99.9%',  label: 'Uptime & Security', tone: 'green' },
]

const MARKET: {
  symbol: string; pair: string; price: string; change: string;
  positive: boolean; series: number[]; icon: string
}[] = [
  { symbol: 'ASM',    pair: 'INR',  price: '₹12.40',        change: '+1.65%', positive: true,  series: [40,42,41,45,44,47,46,50,52,51,55,58], icon: asmCoin    },
  { symbol: 'BTC',    pair: 'USDT', price: '₹58,36,245.60', change: '+2.35%', positive: true,  series: [38,41,39,44,43,48,46,52,55,53,58,62], icon: btcCoin    },
  { symbol: 'GOLD',   pair: 'XAU',  price: '₹6,795.35',     change: '+1.82%', positive: true,  series: [30,33,31,36,38,35,40,42,41,46,48,51], icon: goldCoin   },
  { symbol: 'SILVER', pair: 'XAG',  price: '₹89.42',        change: '-0.42%', positive: false, series: [52,51,53,50,48,49,47,48,45,46,44,43], icon: silverCoin },
]

const PLANS: {
  slug: string; name: string; returns: string; duration: string;
  min: string; max: string; accent: 'silver' | 'gold' | 'diamond'
}[] = [
  { slug: 'silver',  name: 'Silver Plan',  returns: '25%', duration: '36 Hours', min: '₹1,000', max: '₹50,000',   accent: 'silver'  },
  { slug: 'gold',    name: 'Gold Plan',    returns: '30%', duration: '36 Hours', min: '₹3,000', max: '₹50,000',   accent: 'gold'    },
  { slug: 'diamond', name: 'Diamond Plan', returns: '40%', duration: '36 Hours', min: '₹5,000', max: '₹5,00,000', accent: 'diamond' },
]

const HOW_IT_WORKS: { step: string; title: string; body: string }[] = [
  { step: '01', title: 'Create your account', body: 'Register with your mobile number and complete verification once.'                                      },
  { step: '02', title: 'Choose a plan',        body: 'Pick the plan whose limits and duration suit the amount you want to commit.'                          },
  { step: '03', title: 'Track and withdraw',   body: 'Follow your position from the dashboard and withdraw to UPI when the term closes.'                    },
]

/* ── Page ── */
export function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="theme-light-home min-h-screen bg-white font-jakarta text-asm-navy">
      <LandingHeader menuOpen={menuOpen} onMenu={() => setMenuOpen(true)} />
      <LandingMenu open={menuOpen} onClose={() => setMenuOpen(false)} />

      <main className="mx-auto w-full max-w-[1180px] pb-8">
        <Hero />
        <TrustMarquee />

        {/* ── Stats ── */}
        <section className="px-4 pt-6 lg:px-8" aria-label="Platform figures">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {PLATFORM_STATS.map(({ Icon, value, label, tone }) => (
              <div
                key={label}
                className="flex flex-col rounded-2xl border border-asm-line bg-white p-4 shadow-[0_2px_14px_-4px_rgba(16,42,92,0.07)]"
              >
                <span
                  className={cn(
                    'mb-3 flex size-9 shrink-0 items-center justify-center rounded-xl',
                    tone === 'green' ? 'bg-asm-green-tint' : 'bg-asm-blue-tint'
                  )}
                >
                  <Icon
                    className={cn('size-[18px]', tone === 'green' ? 'text-asm-greenInk' : 'text-asm-blue')}
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
                <span className="text-[22px] font-extrabold leading-none tabular-nums text-asm-navy">
                  {value}
                </span>
                <span className="mt-1 text-[11px] leading-tight text-asm-body">{label}</span>
              </div>
            ))}
          </div>
        </section>

        <MarketSnapshot />
        <PlansSection />
        <HowItWorks />

        {/* ── Invite & Earn ── */}
        <section
          id="referral"
          className="mx-4 mt-8 overflow-hidden rounded-2xl lg:mx-8"
          style={{ background: 'linear-gradient(135deg, #0B4FD8 0%, #0E6E32 100%)' }}
        >
          <div className="relative px-5 py-6">
            <div
              aria-hidden
              className="pointer-events-none absolute right-0 top-0 h-full w-[60%] opacity-10"
              style={{ background: 'radial-gradient(circle at 80% 30%, #fff 0%, transparent 70%)' }}
            />
            <UserPlus className="mb-3 size-8 text-white/80" strokeWidth={1.8} aria-hidden />
            <h2 className="text-[22px] font-extrabold leading-tight text-white">Invite &amp; Earn</h2>
            <p className="mt-1.5 max-w-[34ch] text-[13px] leading-relaxed text-white/75">
              Refer your friends and earn rewards on what they invest. Terms apply.
            </p>
            <Link
              to="/register"
              className={cn(
                'group mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3',
                'text-[13px] font-bold uppercase tracking-[0.06em] text-asm-blue',
                'transition-colors hover:bg-asm-blue-tint'
              )}
            >
              Join the programme
              <ArrowRight
                className="size-4 transition-transform duration-300 group-hover:translate-x-0.5"
                strokeWidth={2.4}
                aria-hidden
              />
            </Link>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  )
}

/* ── Hero ── */
function Hero() {
  return (
    <section className="relative overflow-hidden px-4 pb-8 pt-7 lg:px-8">
      {/* Subtle radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[340px]"
        style={{
          background:
            'radial-gradient(ellipse 90% 60% at 15% 0%, rgba(11,79,216,0.07) 0%, transparent 70%), radial-gradient(ellipse 60% 40% at 85% 10%, rgba(21,128,61,0.06) 0%, transparent 60%)',
        }}
      />

      <motion.div variants={container} initial="hidden" animate="visible" className="relative">

        {/* Live price pill */}
        <motion.div variants={fadeUp} className="mb-5 inline-flex">
          <div className="inline-flex items-center gap-2 rounded-full border border-asm-greenInk/20 bg-asm-green-tint px-3.5 py-1.5">
            <span className="relative flex size-[7px] shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-60" />
              <span className="relative inline-flex size-[7px] rounded-full bg-asm-greenInk" />
            </span>
            <span className="font-jakarta text-[11px] font-bold uppercase tracking-[0.14em] text-asm-greenInk">
              Live · ASM ₹12.40 &nbsp;+1.65%
            </span>
          </div>
        </motion.div>

        {/* Headline */}
        <motion.h1
          variants={fadeUp}
          className="text-[38px] font-extrabold leading-[1.08] tracking-[-0.02em] sm:text-[48px]"
        >
          <span className="block text-asm-navy">Smart</span>
          <span className="block text-asm-navy">Investment,</span>
          <span className="block text-asm-blue">Secure Future.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p variants={fadeUp} className="mt-4 max-w-[38ch] text-[14px] leading-relaxed text-asm-body">
          ASM Coins is a straightforward investment platform built for people across India who want to grow what they have saved.
        </motion.p>

        {/* CTAs */}
        <motion.div variants={fadeUp} className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/register"
            className={cn(
              'group flex min-h-[52px] flex-1 items-center justify-center gap-2.5 rounded-xl bg-asm-blue px-6',
              'text-[14px] font-bold uppercase tracking-[0.07em] text-white',
              'shadow-[0_12px_28px_-10px_rgba(11,79,216,0.55)]',
              'transition-all hover:bg-asm-blue-dark hover:shadow-[0_16px_32px_-10px_rgba(11,79,216,0.65)]'
            )}
          >
            Start Investing
            <Rocket
              className="size-[18px] transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              strokeWidth={2.2}
              aria-hidden
            />
          </Link>
          <a
            href="#plans"
            className={cn(
              'flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-xl border-2 border-asm-blue/25 bg-white px-6',
              'text-[14px] font-bold uppercase tracking-[0.07em] text-asm-blue',
              'transition-all hover:border-asm-blue/50 hover:bg-asm-blue-tint'
            )}
          >
            Investment Plans
            <ChartNoAxesCombined className="size-[18px]" strokeWidth={2.2} aria-hidden />
          </a>
        </motion.div>

        {/* Social proof micro-row */}
        <motion.div variants={fadeUp} className="mt-5 flex items-center gap-2.5">
          <div className="flex -space-x-2" aria-hidden>
            {['RK', 'PM', 'SN'].map((initials) => (
              <span
                key={initials}
                className="flex size-7 items-center justify-center rounded-full border-2 border-white bg-asm-blue-tint text-[9px] font-extrabold text-asm-blue ring-1 ring-asm-line"
              >
                {initials}
              </span>
            ))}
          </div>
          <p className="text-[12px] font-semibold text-asm-body">
            <span className="font-extrabold text-asm-navy">25,000+</span> investors already earning
          </p>
        </motion.div>

      </motion.div>
    </section>
  )
}

/* ── Trust Marquee ── */
function TrustMarquee() {
  return (
    <div
      className="relative overflow-hidden border-y border-asm-line bg-asm-tint/60 py-3"
      aria-hidden
    >
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-[#F4F7FE] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-[#F4F7FE] to-transparent" />

      {/* Double list for seamless loop */}
      <div className="flex animate-marquee gap-4 will-change-transform">
        {[...TRUST_PILLS, ...TRUST_PILLS].map(({ Icon, label }, i) => (
          <div
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            className="flex shrink-0 items-center gap-2 rounded-full border border-asm-line bg-white px-3.5 py-1.5"
          >
            <Icon className="size-3.5 shrink-0 text-asm-blue" strokeWidth={2.2} aria-hidden />
            <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-[0.05em] text-asm-navy">
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
  return (
    <section
      className="mx-4 mt-6 overflow-hidden rounded-2xl border border-asm-line bg-white shadow-[0_2px_14px_-4px_rgba(16,42,92,0.06)] lg:mx-8"
      aria-labelledby="market-heading"
    >
      <div className="flex items-center gap-3 border-b border-asm-line px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2">
            <span className="relative flex size-[7px] shrink-0" aria-hidden>
              <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-60" />
              <span className="relative inline-flex size-[7px] rounded-full bg-asm-greenInk" />
            </span>
            <h2
              id="market-heading"
              className="text-[12px] font-extrabold uppercase tracking-[0.12em] text-asm-navy"
            >
              Market snapshot
            </h2>
          </div>
          <p className="mt-0.5 text-[10px] text-asm-muted">Indicative rates · not a live feed</p>
        </div>
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="bg-asm-tint/70">
            <th scope="col" className="px-4 py-2 text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted">Asset</th>
            <th scope="col" className="px-2 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted">Price</th>
            <th scope="col" className="px-3 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted sm:px-2">24h</th>
            <th scope="col" className="hidden px-4 py-2 text-right text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted sm:table-cell">Chart</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-asm-line/60">
          {MARKET.map(({ symbol, pair, price, change, positive, series, icon }) => (
            <tr key={symbol} className="transition-colors hover:bg-asm-tint/40">
              <th scope="row" className="px-4 py-3.5 text-left font-normal">
                <span className="flex items-center gap-2.5">
                  <img
                    src={icon}
                    alt=""
                    width={32}
                    height={32}
                    loading="lazy"
                    decoding="async"
                    className="size-8 shrink-0 rounded-full bg-white object-contain ring-1 ring-asm-line"
                  />
                  <span className="flex flex-col">
                    <span className="text-[13px] font-bold leading-tight">{symbol}</span>
                    <span className="text-[10px] leading-tight text-asm-muted">{pair}</span>
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
    ring: 'ring-[#B1B5BB]/40',
    strip: 'from-[#CED5E1] to-[#9CA8B8]',
    medallion: silverMedallion,
    figure: 'text-asm-navy',
    button: 'bg-asm-blue hover:bg-asm-blue-dark',
    badge: 'bg-[#CED5E1]/40 text-[#5A6472]',
  },
  gold: {
    ring: 'ring-[#E8B84B]/50',
    strip: 'from-[#F4C506] to-[#E8A000]',
    medallion: goldMedallion,
    figure: 'text-asm-greenInk',
    button: 'bg-asm-greenInk hover:bg-[#0E6E32]',
    badge: 'bg-amber-50 text-amber-700',
  },
  diamond: {
    ring: 'ring-[#7DD3FC]/50',
    strip: 'from-[#0B4FD8] to-[#1E93FE]',
    medallion: diamondMedallion,
    figure: 'text-asm-blue',
    button: 'bg-asm-blue hover:bg-asm-blue-dark',
    badge: 'bg-asm-blue-tint text-asm-blue',
  },
} as const

/* ── Plans Section ── */
function PlansSection() {
  return (
    <section id="plans" className="scroll-mt-4 pt-8" aria-labelledby="plans-heading">
      <div className="mb-5 flex items-end justify-between px-4 lg:px-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-asm-blue">Investment Plans</p>
          <h2 id="plans-heading" className="mt-0.5 text-[22px] font-extrabold leading-tight text-asm-navy">
            Choose your tier
          </h2>
        </div>
        <a
          href="#about"
          className="flex items-center gap-1 text-[12px] font-bold text-asm-blue hover:text-asm-blue-dark"
        >
          How it works
          <ArrowRight className="size-3.5" strokeWidth={2.5} aria-hidden />
        </a>
      </div>

      <div
        className={cn(
          'flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2',
          '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          'sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible sm:px-8'
        )}
      >
        {PLANS.map(({ slug, name, returns, duration, min, max, accent }) => {
          const a = PLAN_ACCENT[accent]
          return (
            <motion.article
              key={slug}
              whileHover={{ y: -4, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } }}
              className={cn(
                'flex w-[80%] min-w-[220px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-white ring-1',
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

                <p className={cn('mt-3 text-[44px] font-extrabold leading-none tabular-nums', a.figure)}>
                  {returns}
                </p>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-asm-muted">Returns</p>

                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-asm-muted">Duration</p>
                <p className="text-[13px] font-bold uppercase tabular-nums">{duration}</p>

                <dl className="mt-3.5 flex w-full items-start justify-between border-t border-asm-line pt-3">
                  <div className="flex flex-col">
                    <dt className="text-[8px] font-bold uppercase tracking-[0.1em] text-asm-muted">Min</dt>
                    <dd className="text-[12px] font-bold tabular-nums">{min}</dd>
                  </div>
                  <div className="flex flex-col items-end">
                    <dt className="text-[8px] font-bold uppercase tracking-[0.1em] text-asm-muted">Max</dt>
                    <dd className="text-[12px] font-bold tabular-nums">{max}</dd>
                  </div>
                </dl>

                <Link
                  to={`/register?plan=${slug}`}
                  aria-label={`Get started with the ${name}`}
                  className={cn(
                    'mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl px-2',
                    'text-[11px] font-bold uppercase tracking-[0.1em] text-white transition-colors',
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

      <p className="mt-4 px-4 text-center text-[11px] leading-relaxed text-asm-body lg:px-8">
        Returns shown are plan terms, not guarantees. Read the full terms before you invest.
      </p>
    </section>
  )
}

/* ── How It Works ── */
function HowItWorks() {
  return (
    <section id="about" className="scroll-mt-4 px-4 pt-10 lg:px-8" aria-labelledby="about-heading">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-asm-blue">Getting started</p>
      <h2 id="about-heading" className="mt-0.5 text-[22px] font-extrabold leading-tight text-asm-navy">
        How it works
      </h2>

      {/* Timeline */}
      <ol className="relative mt-6 sm:grid sm:grid-cols-3 sm:gap-4">
        {/* Vertical connector — mobile only */}
        <div aria-hidden className="absolute left-[19px] top-0 h-full w-px bg-asm-line sm:hidden" />

        {HOW_IT_WORKS.map(({ step, title, body }) => (
          <li key={step} className="relative flex gap-4 pb-8 last:pb-0 sm:flex-col sm:gap-3 sm:pb-0">
            <span className="relative z-[1] flex size-10 shrink-0 items-center justify-center rounded-2xl bg-asm-blue-tint text-[13px] font-extrabold tabular-nums text-asm-blue ring-2 ring-white">
              {step}
            </span>
            <div className="pt-1.5 sm:pt-0">
              <h3 className="text-[15px] font-extrabold leading-tight text-asm-navy">{title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-asm-body">{body}</p>
            </div>
          </li>
        ))}
      </ol>

      {/* Support nudge */}
      <div className="mt-7 flex flex-col items-start gap-4 rounded-2xl border border-asm-line bg-asm-tint/70 p-5 sm:flex-row sm:items-center">
        <Coins className="size-8 shrink-0 text-asm-blue" strokeWidth={1.8} aria-hidden />
        <p className="flex-1 text-[13px] leading-relaxed text-asm-body">
          Questions before you start? Our support team answers on WhatsApp and email, every day.
        </p>
        <Link
          to="/register"
          className={cn(
            'flex min-h-[44px] shrink-0 items-center rounded-xl bg-asm-blue px-5',
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
