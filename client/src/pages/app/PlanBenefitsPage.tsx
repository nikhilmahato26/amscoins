import { Gem, Medal, ShieldCheck, Trophy, Unlock, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { type Tier } from '@/components/app/TierBadge'
import { usePlans } from '@/hooks/queries'
import { inr } from '@/lib/format'
import type { Plan } from '@/services/api/plans'

const TIER_ICONS: Record<Tier, LucideIcon> = {
  silver: Medal,
  gold: Trophy,
  diamond: Gem,
}

const PLAN_DESCRIPTIONS: Record<Tier, string> = {
  silver: 'Start your journey with Silver package',
  gold: 'Accelerate returns with Gold package',
  diamond: 'Maximum growth with Diamond package',
}

export function PlanBenefitsPage() {
  const { data: plans, isLoading, isError } = usePlans()

  return (
    <AppShell backTo="/app" width="wide" contentClassName="px-6 pt-[104px]">
      <div className="relative">
        <header className="flex flex-col items-center text-center">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-asm-navy">
            Everything Included
          </h1>
          <p className="pt-2.5 max-w-[36ch] text-sm leading-[21px] text-asm-body">
            Every plan comes with the features you need to grow confidently.
          </p>
        </header>

        {isLoading && (
          <div role="status" aria-live="polite" aria-label="Loading plan benefits" className="flex flex-col gap-4 pt-12 xl:grid xl:grid-cols-3 xl:items-start">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[260px] animate-pulse rounded-[20px] bg-white/70 ring-1 ring-asm-line" />
            ))}
          </div>
        )}

        {isError && (
          <p role="alert" className="pt-12 text-center text-sm text-asm-red">
            Failed to load plan details. Please refresh.
          </p>
        )}

        {plans && (
          <div className="flex flex-col gap-4 pt-12 xl:grid xl:grid-cols-3 xl:items-start">
            {plans.map((plan) => (
              <FeatureCard key={plan.key} plan={plan} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  )
}

function FeatureCard({ plan }: { plan: Plan }) {
  const Icon = TIER_ICONS[plan.key]
  const description = PLAN_DESCRIPTIONS[plan.key] ?? `Invest with ${plan.name} package`

  const stats: { label: string; value: string; Icon: LucideIcon }[] = [
    { label: 'Returns', value: `${plan.returnPct}%`, Icon: TIER_ICONS[plan.key] },
    { label: 'Duration', value: `${plan.durationHours}h`, Icon: Unlock },
    { label: 'Min Invest', value: inr(plan.minInvest), Icon: Users },
    { label: 'Secure', value: '100%', Icon: ShieldCheck },
  ]

  return (
    <article className="relative overflow-hidden rounded-[20px] border border-asm-line bg-white px-7 py-6 shadow-[0_2px_16px_-6px_rgba(16,42,92,0.1)]">
      <div className="flex items-center gap-[18px]">
        <BenefitBadge Icon={Icon} />
        <div className="flex min-w-0 flex-col">
          <h2 className="text-[22px] font-extrabold uppercase leading-[33px] tracking-[0.06em] text-asm-navy">
            {plan.name}
          </h2>
          <p className="pt-1 text-[13px] leading-[19.5px] text-asm-body">{description}</p>
        </div>
      </div>

      <div className="pt-[22px]">
        <span className="block h-px w-full bg-asm-line" />
      </div>

      {/* 4-up crushes these to ~78px on a 360px screen, so 2-up until sm. */}
      <div className="grid grid-cols-2 gap-2 pt-5 sm:grid-cols-4">
        {stats.map(({ label, value, Icon: StatIcon }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-2 rounded-xl bg-asm-tint px-2 py-3.5"
          >
            <StatIcon className="size-7 text-asm-blue" strokeWidth={1.5} aria-hidden />
            <span className="flex flex-col items-center">
              <span className="text-center text-[10px] font-medium uppercase leading-[13px] tracking-[0.06em] text-asm-muted">
                {label}
              </span>
              <span className="pt-[3px] text-[13px] font-bold leading-[19.5px] text-asm-navy">
                {value}
              </span>
            </span>
          </div>
        ))}
      </div>

      {/* Unlock requirement for locked plans */}
      {!plan.unlocked && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-300/60 bg-amber-50 px-4 py-2.5">
          <Zap className="size-4 shrink-0 text-amber-500" aria-hidden />
          <span className="text-[12px] text-amber-800">
            Unlock with <span className="font-bold">{plan.unlockReferrals} referrals</span>
          </span>
        </div>
      )}
    </article>
  )
}

/** Circular tier emblem in the light ASM system. */
function BenefitBadge({ Icon }: { Icon: LucideIcon }) {
  return (
    <span
      className="flex size-16 shrink-0 items-center justify-center rounded-full bg-asm-blue-tint ring-1 ring-asm-blue/10"
      aria-hidden
    >
      <Icon className="size-[26px] text-asm-blue" strokeWidth={1.5} />
    </span>
  )
}
