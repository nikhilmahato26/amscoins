import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, History, LifeBuoy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import heroCoin from '@/assets/hero-coin.png'
import { AppShell } from '@/components/app/AppShell'
import { MarketTicker } from '@/components/app/MarketTicker'
import { ReferralBanner } from '@/components/app/ReferralBanner'
import { TierBadge, type Tier } from '@/components/app/TierBadge'
import { cn } from '@/lib/utils'

const STATS = [
  { label: 'Total locked', value: '₹42.8 Cr+' },
  { label: 'Active investors', value: '12.5k+' },
]

/**
 * Placeholder plans. Return figures come from the desktop plan cards in Figma
 * (26:8496 / 26:8588), since the mobile cards all carry the same
 * "SilverPackage" placeholder label.
 *
 * Diamond's min/max reads ₹3,000-₹5,000 on the current mobile card, identical
 * to Gold. Every other Diamond card in the file says ₹5,000-₹5,00,000, so that
 * looks like a copy-paste slip and we use the latter here.
 */
const PLANS: { tier: Tier; name: string; returns: string; duration: string; min: string; max: string }[] = [
  { tier: 'silver', name: 'Silver', returns: '25%', duration: '36 Hours', min: '₹1,000', max: '₹5,000' },
  { tier: 'gold', name: 'Gold', returns: '30%', duration: '36 Hours', min: '₹3,000', max: '₹5,000' },
  { tier: 'diamond', name: 'Diamond', returns: '40%', duration: '36 Hours', min: '₹5,000', max: '₹5,00,000' },
]

const FEATURES = [
  'Choose Silver, Gold, or Diamond plans designed to help you grow your wealth.',
  'Track your investments, payouts, and portfolio with a secure investment platform.',
  'Deposit, withdraw, track transactions, and manage your investments—all in one place.',
]

const QUICK_ACTIONS: { label: string; to: string; Icon: LucideIcon }[] = [
  { label: 'Deposit', to: '/app/invest', Icon: ArrowDownToLine },
  { label: 'Withdraw', to: '/app/withdraw', Icon: ArrowUpFromLine },
  { label: 'History', to: '/app/history', Icon: History },
  { label: 'Support', to: '/app/support', Icon: LifeBuoy },
]

export function HomePage() {
  return (
    <AppShell headerVariant="root" width="wide" contentClassName="px-0 pt-[104px]">
      <div>
        {/* Hero */}
        <section className="relative flex flex-col items-center px-[15px]">
          <h1 className="max-w-[640px] text-center font-poppins text-4xl font-extrabold leading-tight lg:text-5xl">
            Jump start your wealth portfolio
          </h1>
          <p className="max-w-[520px] pt-8 text-center font-poppins text-lg font-medium leading-snug">
            ASM COIN is the easiest way to grow your wealth.
          </p>

          <div className="flex w-[215px] items-center gap-4 pt-12">
            {STATS.map(({ label, value }, index) => (
              <div key={label} className="flex items-center gap-4">
                {index > 0 ? <span className="h-8 w-px bg-white/10" /> : null}
                <span className="flex flex-col">
                  <span className="text-[10px] uppercase leading-[15px] text-gray-400">{label}</span>
                  <span className="text-lg font-bold leading-7">{value}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="relative mt-8 h-[380px] w-full max-w-[520px]">
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 size-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#A020F0]/30 blur-[70px]"
            />
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 size-[150px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF00FF]/30 blur-[60px]"
            />
            <img
              src={heroCoin}
              alt=""
              className="relative size-full object-contain"
              fetchPriority="high"
            />
          </div>
        </section>

        <div className="flex flex-col gap-10 px-[18px] pt-2">
          <MarketTicker />

          {/* Plans */}
          <section className="flex flex-col gap-4">
            <h2 className="text-xl font-bold leading-7">Investment Packages</h2>
            <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start xl:grid-cols-3">
              {PLANS.map((plan) => (
                <PlanCard key={plan.tier} {...plan} />
              ))}
            </div>
          </section>

          {/* Features */}
          <section className="flex flex-col gap-16">
            <h2 className="font-poppins text-[32px] font-extrabold leading-tight">
              All your investments. All on <span className="text-[#8231CB]">ASM Coins.</span>
            </h2>
            <ul className="flex flex-col gap-[30px] md:grid md:grid-cols-3 md:items-start md:gap-8">
              {FEATURES.map((feature) => (
                <li key={feature} className="flex items-center gap-[30px] md:flex-col md:items-start md:gap-4">
                  <CheckCircle2 className="size-8 shrink-0 text-brand" aria-hidden />
                  <span className="flex-1 font-poppins text-base font-medium leading-6">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <ReferralBanner />

          {/* Quick actions */}
          <section className="flex items-start justify-center gap-4">
            {QUICK_ACTIONS.map(({ label, to, Icon }) => (
              <Link
                key={label}
                to={to}
                className="flex min-w-0 flex-1 flex-col items-center gap-2 focus-visible:outline-none"
              >
                <span
                  className={cn(
                    'flex size-14 items-center justify-center rounded-2xl border border-white/10',
                    'bg-gradient-to-b from-white/[0.08] to-white/[0.02] transition-colors hover:border-white/25'
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="text-[11px] font-medium uppercase leading-[16.5px] tracking-[-0.55px] text-gray-400">
                  {label}
                </span>
              </Link>
            ))}
          </section>
        </div>
      </div>
    </AppShell>
  )
}

function PlanCard({
  tier,
  name,
  returns,
  duration,
  min,
  max,
}: {
  tier: Tier
  name: string
  returns: string
  duration: string
  min: string
  max: string
}) {
  return (
    <article className="relative flex flex-col gap-3 overflow-hidden rounded-[20px] border-2 border-plate bg-plate/10 px-[25px] py-4">
      <span
        aria-hidden
        className="pointer-events-none absolute -top-10 right-[-14px] size-32 rounded-full bg-slate-400/10 blur-[32px]"
      />

      <div className="flex flex-col items-center gap-1">
        <TierBadge tier={tier} size={133} />

        <div className="flex flex-col items-center gap-5">
          <div className="flex flex-col items-center">
            <span className="text-[32px] font-bold leading-none">{returns}</span>
            <span className="text-sm uppercase leading-5 text-gray-400">Returns</span>
          </div>

          <div className="flex flex-col items-center pt-1.5">
            <span className="text-sm leading-5 text-haze/45">Duration</span>
            <span className="text-xl font-medium leading-[30px] text-frost">{duration}</span>
          </div>
        </div>
      </div>

      <div className="flex items-stretch justify-between rounded-xl border border-black/10 bg-white/20 px-[18px] py-3">
        <span className="flex w-[62px] flex-col">
          <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px]">Min</span>
          <span className="pt-[5px] text-lg font-semibold leading-[27px] text-frost">{min}</span>
        </span>
        <span className="w-px self-stretch bg-white/[0.07]" />
        <span className="flex w-[62px] flex-col items-end">
          <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px]">Max</span>
          <span className="pt-[5px] text-lg font-semibold leading-[27px] text-frost">{max}</span>
        </span>
      </div>

      <div className="rounded-xl border-[0.677px] border-slate-400/30">
        <Link
          to="/app/invest"
          aria-label={`Invest in the ${name} package`}
          className={cn(
            'flex h-[55px] items-center justify-center rounded-xl bg-plate',
            'text-sm font-bold uppercase tracking-[0.35px] text-white transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
          )}
        >
          Invest Now
        </Link>
      </div>
    </article>
  )
}
