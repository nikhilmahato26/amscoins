import { motion } from 'framer-motion'
import { Clock, Lock, ShieldCheck, Unlock, Zap } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { AppShell } from '@/components/app/AppShell'
import { TierBadge } from '@/components/app/TierBadge'
import { CoinIndexCard } from '@/components/coin/CoinIndexCard'
import { usePlans } from '@/hooks/queries'
import { durationLabel, inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Plan } from '@/services/api/plans'
import type { PlanKey } from '@/types'

/**
 * Packages / Plans gallery — the authoritative light theme (`theme-light-home`):
 * white surfaces, navy text, asm-blue primary action, green profit accent.
 * Mirrors the plan cards on the app home so the two never read as two products.
 */

/** Per-plan accent, matching the home plan cards. */
const PLAN_STYLE: Record<PlanKey, { ring: string; figure: string; glow: string }> = {
  silver:  { ring: 'ring-[#CED5E1]',      figure: 'text-[#868B95]', glow: 'rgba(134,139,149,0.14)' },
  gold:    { ring: 'ring-[#FF9E45]/50',   figure: 'text-[#F37400]', glow: 'rgba(243,116,0,0.14)' },
  diamond: { ring: 'ring-asm-blue/30',    figure: 'text-asm-blue',  glow: 'rgba(11,79,216,0.14)' },
  asmcoin: { ring: 'ring-asm-blue/30',    figure: 'text-asm-blue',  glow: 'rgba(11,79,216,0.14)' },
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

export function PlansPage() {
  const { data: plans, isLoading, isError } = usePlans()

  // ASM Coin is not a peer of the tier trio — it is ungated, it has a live
  // index, and it is the one plan anyone can enter today. Putting it in the
  // same equal-cards grid would argue the opposite, so it leads on its own.
  const coin = plans?.find((p) => p.key === 'asmcoin')
  const tierPlans = plans?.filter((p) => p.key !== 'asmcoin') ?? []

  return (
    <AppShell headerVariant="root" width="wide">
      <header className="flex flex-col items-center pt-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-asm-blue/15 bg-asm-blue-tint px-3.5 py-1.5">
          <span className="size-1.5 rounded-full bg-asm-blue" />
          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-asm-blue">
            Investment Packages
          </span>
        </span>

        <h1 className="mt-4 text-[30px] font-extrabold leading-tight tracking-tight text-asm-navy sm:text-[40px]">
          Choose Your Growth Path
        </h1>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-asm-body">
          Structured returns. Transparent terms. No surprises.
        </p>
      </header>

      {isLoading && (
        <div role="status" aria-live="polite" aria-label="Loading investment plans" className="grid gap-6 pt-12 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-[360px] animate-pulse rounded-2xl border border-asm-line bg-white/70" />
          ))}
        </div>
      )}

      {isError && (
        <p role="alert" className="pt-12 text-center text-sm text-asm-red">
          Failed to load packages. Please refresh.
        </p>
      )}

      {coin && <FeaturedCoinPlan plan={coin} />}

      {plans && tierPlans.length > 0 && (
        <>
          {coin && (
            <h2 className="pt-12 text-[11px] font-extrabold uppercase tracking-[0.14em] text-asm-muted">
              Tier packages
            </h2>
          )}
          <motion.div
            initial="hidden"
            animate="visible"
            transition={{ staggerChildren: 0.08 }}
            className={cn(
              'grid gap-6 sm:grid-cols-2',
              tierPlans.length > 2 && 'lg:grid-cols-3',
              coin ? 'pt-5' : 'pt-12',
            )}
          >
            {tierPlans.map((plan) => (
              <PlanCard key={plan.key} plan={plan} />
            ))}
          </motion.div>
        </>
      )}

      <p className="mt-10 text-center text-[12px] leading-relaxed text-asm-muted">
        Returns shown are plan terms, not guarantees.{' '}
        <span className="text-asm-body">Read the full terms before you invest.</span>
      </p>
    </AppShell>
  )
}

/**
 * The ASM Coin band. Carries the live index because the index is the reason
 * anyone stops here — the terms alone read like every other package.
 *
 * The chart is indicative and never affects a payout; the return is the fixed
 * plan term shown beside it.
 */
function FeaturedCoinPlan({ plan }: { plan: Plan }) {
  const navigate = useNavigate()

  const points = [
    { Icon: Unlock, label: 'No referrals needed to invest' },
    { Icon: Zap, label: `${plan.returnPct}% paid in one payout at maturity` },
    { Icon: ShieldCheck, label: 'Withdraw your returns with no TDS' },
  ]

  return (
    <motion.section
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      aria-label={`${plan.name} package`}
      className="mt-12 overflow-hidden rounded-[24px] bg-gradient-to-br from-asm-blue-tint to-asm-blue-tint/25 p-6 sm:p-8"
    >
      {/* Three children, in the order a phone should read them: what it is,
          the proof, then the ask. At lg the first and third stack in the left
          column and the chart takes the right, so the ask still sits under the
          pitch rather than below a full-height chart. */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1fr)] lg:items-center lg:gap-12">
        <div className="flex flex-col items-start lg:col-start-1 lg:row-start-1">
          <span className="inline-flex items-center gap-2 rounded-full bg-asm-blue px-3 py-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">
              Open to everyone
            </span>
          </span>

          <div className="mt-4 flex items-center gap-3">
            <TierBadge tier="asmcoin" size={56} />
            <div className="flex flex-col">
              <h2 className="text-[26px] font-extrabold leading-none tracking-tight text-asm-navy sm:text-[32px]">
                {plan.name}
              </h2>
              <span className="mt-1 text-[13px] text-asm-body">
                {plan.returnPct}% in {durationLabel(plan.durationHours)}
              </span>
            </div>
          </div>

          <ul className="mt-6 flex flex-col gap-2.5">
            {points.map(({ Icon, label }) => (
              <li key={label} className="flex items-center gap-2.5 text-[14px] text-asm-body">
                <Icon className="size-4 shrink-0 text-asm-blue" aria-hidden />
                {label}
              </li>
            ))}
          </ul>
        </div>

        {/* The band carries its own CTA below, so the card must not add a second. */}
        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
          <CoinIndexCard variant="home" showCta={false} />
        </div>

        <div className="flex flex-col items-start lg:col-start-1 lg:row-start-2">
          <dl className="flex items-stretch gap-6">
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-widest text-asm-muted">Min</dt>
              <dd className="mt-0.5 font-mono text-[16px] font-bold tabular-nums text-asm-navy">{inr(plan.minInvest)}</dd>
            </div>
            <span className="w-px self-stretch bg-asm-line" />
            <div>
              <dt className="text-[9px] font-bold uppercase tracking-widest text-asm-muted">Max</dt>
              <dd className="mt-0.5 font-mono text-[16px] font-bold tabular-nums text-asm-navy">{inr(plan.maxInvest)}</dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => navigate(`/app/invest?plan=${plan.key}`, { state: { planKey: plan.key } })}
            aria-label={`Invest in the ${plan.name} package`}
            className={cn(
              'mt-5 flex min-h-[50px] w-full items-center justify-center rounded-xl bg-asm-blue px-6 sm:w-auto',
              'text-[13px] font-bold uppercase tracking-[0.08em] text-white',
              'transition-colors hover:bg-asm-blue-dark active:scale-[0.98]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2'
            )}
          >
            Invest in {plan.name}
          </button>
        </div>
      </div>
    </motion.section>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const navigate = useNavigate()
  const s = PLAN_STYLE[plan.key] ?? PLAN_STYLE.silver
  const unlocked = plan.unlocked

  return (
    <motion.article
      variants={fadeUp}
      whileHover={unlocked ? { y: -4, boxShadow: `0 20px 40px -12px ${s.glow}, 0 4px 16px -4px rgba(16,42,92,0.10)` } : undefined}
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      className={cn(
        'relative flex flex-col items-center overflow-hidden rounded-2xl bg-white p-6 ring-1',
        'shadow-[0_2px_16px_-4px_rgba(16,42,92,0.08)]',
        s.ring
      )}
    >
      <div className={cn('flex w-full flex-col items-center transition-all duration-300', !unlocked && 'pointer-events-none select-none opacity-50 blur-[1.5px]')}>
        <TierBadge tier={plan.key} size={92} />

        <div className="mt-3 flex flex-col items-center gap-0.5">
          <span className={cn('text-[34px] font-extrabold leading-none tabular-nums', s.figure)}>{plan.returnPct}%</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-asm-muted">Returns</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Clock className="size-4 text-asm-blue" aria-hidden />
          <span className="text-[15px] font-bold capitalize text-asm-navy">{durationLabel(plan.durationHours)}</span>
        </div>

        <div className="mt-4 flex w-full items-stretch justify-between rounded-xl bg-asm-tint px-4 py-2.5">
          <span className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-asm-muted">Min</span>
            <span className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-asm-navy">{inr(plan.minInvest)}</span>
          </span>
          <span className="w-px self-stretch bg-asm-line" />
          <span className="flex flex-col items-end">
            <span className="text-[9px] font-bold uppercase tracking-widest text-asm-muted">Max</span>
            <span className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-asm-navy">{inr(plan.maxInvest)}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate(`/app/invest?plan=${plan.key}`, { state: { planKey: plan.key } })}
          aria-label={`Invest in the ${plan.name} package`}
          className={cn(
            'mt-4 flex min-h-[46px] w-full items-center justify-center rounded-xl bg-asm-blue',
            'text-[12px] font-bold uppercase tracking-[0.08em] text-white',
            'transition-colors hover:bg-asm-blue-dark active:scale-[0.98]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1'
          )}
        >
          Invest Now
        </button>
      </div>

      {/* Locked overlay */}
      {!unlocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 p-5 text-center backdrop-blur-[1px]">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full border border-slate-200 bg-slate-100 shadow-sm">
            <Lock className="size-7 text-slate-500" strokeWidth={2.2} aria-hidden />
          </div>
          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">{plan.name} Locked</span>
          <h3 className="mt-1 text-[16px] font-extrabold leading-tight text-asm-navy">
            Unlock with {plan.unlockReferrals} referrals
          </h3>
          <Link
            to="/app/referral"
            aria-label={`Unlock ${plan.name} on referral page`}
            className="mt-4 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F08800] via-[#E67E00] to-[#DC7000] px-4 text-[12px] font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_-6px_rgba(230,126,0,0.55)] transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Lock className="size-4" strokeWidth={2.4} aria-hidden />
            Unlock Tier
          </Link>
        </div>
      )}
    </motion.article>
  )
}
