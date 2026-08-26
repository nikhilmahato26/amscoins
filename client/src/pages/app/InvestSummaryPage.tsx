import { ArrowRight, Clock, TrendingUp } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { AppShell } from '@/components/app/AppShell'
import { usePlans } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Tier } from '@/types'

interface LocationState {
  planKey?: Tier
  amount?: number // paise
}

/**
 * Figma 26:10329 — Investment summary, re-skinned to the light ASM system.
 *
 * Reads planKey + amount (paise) from the URL query first, falling back to
 * router state, so a refresh or a shared/deep link no longer dead-ends on an
 * empty "no plan selected" screen. Proceeds to payment carrying the same values
 * in both the query string and router state.
 */
export function InvestSummaryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const state = location.state as LocationState | null

  const { data: plans, isLoading, isError } = usePlans()

  const planKey = (params.get('plan') as Tier | null) ?? state?.planKey ?? null
  const amountPaise = Number(params.get('amt')) || state?.amount || 0
  const hasSelection = Boolean(planKey) && amountPaise > 0

  const plan = plans?.find((p) => p.key === planKey)
  const expectedReturn = plan ? Math.round((amountPaise * plan.returnPct) / 100) : 0

  function handleProceed() {
    if (!plan || !hasSelection) return
    const search = `?plan=${plan.key}&amt=${amountPaise}`
    navigate(`/app/payment${search}`, { state: { planKey: plan.key, amount: amountPaise } })
  }

  return (
    <AppShell headerVariant="detail" backTo="/app/invest">
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div className="flex items-center gap-3 pb-1">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-asm-blue-tint">
            <TrendingUp className="size-5 text-asm-blue" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="flex flex-col">
            <span className="text-xl font-extrabold leading-7 tracking-[-0.02em] text-asm-navy">
              Investment Summary
            </span>
            <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.14em] text-asm-muted">
              Review before proceeding
            </span>
          </span>
        </div>

        {isLoading && (
          <div role="status" aria-live="polite" aria-label="Loading summary" className="flex flex-col gap-4">
            <div className="h-[152px] animate-pulse rounded-2xl bg-white/70 ring-1 ring-asm-line" />
            <div className="h-[112px] animate-pulse rounded-2xl bg-white/70 ring-1 ring-asm-line" />
          </div>
        )}

        {isError && (
          <p role="alert" className="rounded-xl border border-asm-red/20 bg-red-50 px-4 py-3 text-sm text-asm-red">
            Failed to load plan details. Please go back and try again.
          </p>
        )}

        {!hasSelection && !isLoading && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-asm-line bg-white px-6 py-10 text-center shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
            <span className="flex size-14 items-center justify-center rounded-full bg-asm-blue-tint">
              <TrendingUp className="size-6 text-asm-blue" aria-hidden />
            </span>
            <div className="flex flex-col gap-1">
              <p className="text-base font-bold text-asm-navy">No plan selected yet</p>
              <p className="text-sm text-asm-body">Pick a plan and amount to see your summary.</p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/invest')}
              className="mt-1 flex h-12 items-center justify-center rounded-xl bg-asm-blue px-6 text-sm font-bold text-white transition-colors hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2"
            >
              Choose a plan
            </button>
          </div>
        )}

        {plan && hasSelection && (
          <>
            {/* Plan details card */}
            <section
              className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]"
              aria-label="Plan details"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.12em] text-asm-muted">
                  Selected Plan
                </span>
                <span className="rounded-full bg-asm-blue-tint px-3 py-1 text-[11px] font-bold uppercase tracking-[0.08em] text-asm-blue">
                  {plan.name}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col rounded-xl bg-asm-tint px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-asm-muted">
                    Returns
                  </span>
                  <span className="pt-1 text-xl font-extrabold leading-7 text-asm-greenInk">{plan.returnPct}%</span>
                </div>
                <div className="flex flex-col rounded-xl bg-asm-tint px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-asm-muted">
                    Duration
                  </span>
                  <span className="flex items-center gap-1.5 pt-1">
                    <Clock className="size-4 text-asm-blue" aria-hidden />
                    <span className="text-xl font-extrabold leading-7 text-asm-navy">{plan.durationHours}h</span>
                  </span>
                </div>
              </div>
            </section>

            {/* Investment breakdown */}
            <section
              className="flex flex-col rounded-2xl border border-asm-line bg-white p-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]"
              aria-label="Investment breakdown"
            >
              <div className="flex items-center justify-between pb-4">
                <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-asm-muted">
                  Your Investment
                </span>
                <span className="text-xl font-extrabold leading-7 text-asm-navy">{inr(amountPaise)}</span>
              </div>
              <span className="h-px w-full bg-asm-line" />
              <div className="flex items-center justify-between pt-4">
                <span className="text-[11px] font-semibold uppercase leading-4 tracking-[0.1em] text-asm-muted">
                  Expected Return
                </span>
                <span className="text-xl font-extrabold leading-7 text-asm-greenInk">+{inr(expectedReturn)}</span>
              </div>
            </section>

            <p className="px-1 text-center text-[12px] leading-4 text-asm-muted">
              Returns are indicative and based on plan terms. Subject to admin confirmation.
            </p>

            <button
              type="button"
              onClick={handleProceed}
              className={cn(
                'mt-1 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-asm-blue py-4',
                'text-base font-bold text-white shadow-[0_8px_24px_-8px_rgba(11,79,216,0.5)]',
                'transition-colors hover:bg-asm-blue-dark',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2'
              )}
            >
              Proceed to Payment
              <ArrowRight className="size-[18px]" aria-hidden />
            </button>
          </>
        )}
      </div>
    </AppShell>
  )
}
