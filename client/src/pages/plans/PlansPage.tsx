import { motion } from 'framer-motion'
import { Clock, Lock } from 'lucide-react'
import { Link, useNavigate } from 'react-router'

import { AppShell } from '@/components/app/AppShell'
import { TierBadge, type Tier } from '@/components/app/TierBadge'
import { usePlans } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Plan } from '@/services/api/plans'

/**
 * Packages / Plans gallery — the authoritative light theme (`theme-light-home`):
 * white surfaces, navy text, asm-blue primary action, green profit accent.
 * Mirrors the plan cards on the app home so the two never read as two products.
 */

/** Per-tier accent, matching the home plan cards. */
const PLAN_STYLE: Record<Tier, { ring: string; figure: string; glow: string }> = {
  silver:  { ring: 'ring-[#CED5E1]',      figure: 'text-[#868B95]', glow: 'rgba(134,139,149,0.14)' },
  gold:    { ring: 'ring-[#FF9E45]/50',   figure: 'text-[#F37400]', glow: 'rgba(243,116,0,0.14)' },
  diamond: { ring: 'ring-asm-blue/30',    figure: 'text-asm-blue',  glow: 'rgba(11,79,216,0.14)' },
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

export function PlansPage() {
  const { data: plans, isLoading, isError } = usePlans()

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
        <div role="status" aria-live="polite" aria-label="Loading investment plans" className="mx-auto grid w-full max-w-2xl gap-6 pt-12 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-[360px] animate-pulse rounded-2xl border border-asm-line bg-white/70" />
          ))}
        </div>
      )}

      {isError && (
        <p role="alert" className="pt-12 text-center text-sm text-asm-red">
          Failed to load packages. Please refresh.
        </p>
      )}

      {plans && (
        <motion.div
          initial="hidden"
          animate="visible"
          transition={{ staggerChildren: 0.08 }}
          className="mx-auto grid w-full max-w-2xl gap-6 pt-12 sm:grid-cols-2"
        >
          {plans.map((plan) => (
            <PlanCard key={plan.key} plan={plan} />
          ))}
        </motion.div>
      )}

      <p className="mt-10 text-center text-[12px] leading-relaxed text-asm-muted">
        Returns shown are plan terms, not guarantees.{' '}
        <span className="text-asm-body">Read the full terms before you invest.</span>
      </p>
    </AppShell>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const navigate = useNavigate()
  const tier = plan.key as Tier
  const s = PLAN_STYLE[tier] ?? PLAN_STYLE.silver
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
        <TierBadge tier={tier} size={92} />

        <div className="mt-3 flex flex-col items-center gap-0.5">
          <span className={cn('text-[34px] font-extrabold leading-none tabular-nums', s.figure)}>{plan.returnPct}%</span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-asm-muted">Returns</span>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Clock className="size-4 text-asm-blue" aria-hidden />
          <span className="text-[15px] font-bold text-asm-navy">{plan.durationHours} Hours</span>
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
