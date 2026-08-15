import { Clock, Gem, Lock, Medal, Trophy } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

import { usePlans } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Plan } from '@/services/api/plans'

/**
 * Desktop plans section (Figma 26:8496 "Choose Your Growth Path").
 *
 * Now fetches real plan data from the API via usePlans(). Locked plans (unlocked
 * === false) show a locked overlay with the referral threshold. Unlocked plans
 * navigate to /app/invest with { planKey } in location state.
 */

const TIER_ICONS: Record<string, LucideIcon> = {
  silver: Medal,
  gold: Trophy,
  diamond: Gem,
}

const CARD_GRADIENT =
  'linear-gradient(140deg, rgba(184,200,224,0.06) 6.17%, rgba(184,200,224,0.01) 93.83%), linear-gradient(90deg, #0E1520 0%, #0E1520 100%)'

const BUTTON_SHEEN =
  'linear-gradient(146.5deg, rgba(255,255,255,0) 41.55%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0) 58.45%)'

export function PlansPage() {
  const { data: plans, isLoading, isError } = usePlans()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-abyss font-jakarta text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -top-40 left-[10%] size-[600px] rounded-full bg-steel/[0.05] blur-[140px]" />
        <span className="absolute -right-24 top-[386px] size-[500px] rounded-full bg-brand/[0.06] blur-[140px]" />
        <span className="absolute -left-28 top-[242px] size-[400px] rounded-full bg-steel/[0.03] blur-[120px]" />
      </div>

      <main className="relative mx-auto w-full max-w-[1129px] px-6 py-16">
        <header className="flex flex-col items-center text-center">
          <span className="flex items-center gap-2 rounded-xl border border-steel/[0.18] bg-steel/[0.08] px-4 py-1.5">
            <span className="size-1.5 rounded-full bg-steel" />
            <span className="text-[11px] font-semibold uppercase tracking-[1.65px] text-steel">
              Investment Plans
            </span>
          </span>

          <h1 className="pt-4 font-dmserif text-[40px] leading-[49px] tracking-[-0.4px] text-frost">
            Choose Your Growth Path
          </h1>

          <p className="pt-3 text-sm leading-[23px] text-haze/45">
            Structured returns. Transparent terms. No surprises.
          </p>
        </header>

        {isLoading && (
          <div
            role="status"
            aria-live="polite"
            aria-label="Loading investment plans"
            className="grid gap-8 pt-14 md:grid-cols-2 lg:grid-cols-3"
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-[340px] animate-pulse rounded-[20px] border border-steel/20 bg-steel/[0.08]"
              />
            ))}
          </div>
        )}

        {isError && (
          <p role="alert" className="pt-14 text-center text-sm text-red-400">
            Failed to load plans. Please refresh.
          </p>
        )}

        {plans && (
          <div className="grid gap-8 pt-14 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <PlanCard key={plan.key} plan={plan} />
            ))}
          </div>
        )}

        <p className="pt-12 text-center text-[13px] leading-[18px] text-haze/38">
          All returns are indicative. Investments subject to terms.
        </p>
      </main>
    </div>
  )
}

function PlanCard({ plan }: { plan: Plan }) {
  const navigate = useNavigate()
  const Icon = TIER_ICONS[plan.key] ?? Medal
  const isLocked = !plan.unlocked

  function handleInvest() {
    navigate('/app/invest', { state: { planKey: plan.key } })
  }

  return (
    <article
      className={cn(
        'flex flex-col overflow-hidden rounded-[20px] border border-steel/20 p-7',
        'shadow-[0px_8px_32px_0px_rgba(0,0,0,0.35)]',
        isLocked && 'opacity-70'
      )}
      style={{ backgroundImage: CARD_GRADIENT }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-steel/[0.18] bg-steel/[0.08]">
            <Icon className="size-6 text-steel" strokeWidth={1.5} aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="text-[10px] uppercase leading-[15px] tracking-[1.8px] text-haze/45">
              Plan
            </span>
            <span className="pt-0.5 text-[17px] font-semibold leading-[25.5px] tracking-[0.34px] text-steel">
              {plan.name}
            </span>
          </span>
        </div>

        <div className="flex w-[92px] flex-col items-center rounded-xl border border-steel/20 bg-steel/[0.15] px-4 py-2.5">
          <span className="font-dmserif text-[30px] leading-[30px] text-steel">{plan.returnPct}%</span>
          <span className="pt-0.5 text-[9px] uppercase leading-[13.5px] tracking-[1.8px] text-steel opacity-70">
            Returns
          </span>
        </div>
      </div>

      <span
        aria-hidden
        className="mt-7 h-px w-full bg-gradient-to-r from-steel/20 to-transparent"
      />

      <div className="flex flex-col pt-6">
        <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px] text-haze/38">
          Duration
        </span>
        <span className="flex items-center gap-2 pt-1.5">
          <Clock className="size-4 text-frost" aria-hidden />
          <span className="text-xl font-medium leading-[30px] text-frost">{plan.durationHours} Hours</span>
        </span>
      </div>

      <div className="flex items-stretch justify-between rounded-xl border border-white/5 bg-white/[0.03] px-[18px] py-4 my-6">
        <span className="flex flex-col">
          <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px] text-haze/38">
            Min
          </span>
          <span className="pt-[5px] text-lg font-semibold leading-[27px] text-frost">{inr(plan.minInvest)}</span>
        </span>
        <span className="w-px self-stretch bg-white/[0.07]" />
        <span className="flex flex-col items-end">
          <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px] text-haze/38">
            Max
          </span>
          <span className="pt-[5px] text-lg font-semibold leading-[27px] text-frost">{inr(plan.maxInvest)}</span>
        </span>
      </div>

      {isLocked ? (
        <div
          className={cn(
            'relative mt-auto flex h-[50px] items-center justify-center gap-2 overflow-hidden rounded-xl',
            'border border-steel/20 bg-steel/[0.08]',
            'text-[12px] font-semibold uppercase tracking-[1.2px] text-haze/50'
          )}
          aria-label={`Locked plan: unlock with ${plan.unlockReferrals} referrals`}
        >
          <Lock className="size-4" aria-hidden />
          Unlock with {plan.unlockReferrals} referrals
        </div>
      ) : (
        <button
          type="button"
          onClick={handleInvest}
          aria-label={`Invest in the ${plan.name} plan`}
          className={cn(
            'relative mt-auto flex h-[50px] items-center justify-center overflow-hidden rounded-xl',
            'bg-gradient-to-b from-bluesteel-from to-bluesteel-to',
            'text-[13px] font-bold uppercase tracking-[1.56px] text-white',
            'shadow-[0px_4px_20px_0px_rgba(143,168,192,0.4)] transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-steel'
          )}
        >
          <span className="relative z-10">Invest Now</span>
          <span
            aria-hidden
            className="absolute inset-0"
            style={{ backgroundImage: BUTTON_SHEEN }}
          />
        </button>
      )}
    </article>
  )
}
