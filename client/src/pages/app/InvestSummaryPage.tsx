import { ArrowRight, Clock, TrendingUp } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

import { usePlans } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Tier } from '@/types'

interface LocationState {
  planKey: Tier
  amount: number // paise
}

/**
 * Figma 26:10329 — Investment summary. Reads planKey + amount (paise) from
 * location state. Shows plan terms and expected return, then navigates to the
 * payment page with the same state payload.
 */
export function InvestSummaryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState | null

  const { data: plans, isLoading, isError } = usePlans()

  const plan = plans?.find((p) => p.key === state?.planKey)
  const amountPaise = state?.amount ?? 0
  const expectedReturn = plan ? Math.round(amountPaise * plan.returnPct / 100) : 0

  function handleProceed() {
    navigate('/app/payment', { state: { planKey: state?.planKey, amount: amountPaise } })
  }

  return (
    <div className="min-h-screen bg-surface-nav font-jakarta text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col sm:max-w-[560px] lg:max-w-[720px]">
        {/* Gold header */}
        <header className="sticky top-0 z-20 flex w-full items-center justify-between bg-surface-nav/80 px-6 pb-4 pt-8 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-full drop-shadow-[0px_0px_7.5px_rgba(212,175,55,0.3)]"
              style={{ backgroundImage: 'linear-gradient(135deg, #D4AF37 0%, #AA8A2E 100%)' }}
            >
              <TrendingUp className="size-[18px] text-surface-nav" strokeWidth={2} aria-hidden />
            </span>
            <span className="flex flex-col">
              <span className="text-xl font-bold leading-7 tracking-[-0.02em] text-white">
                Investment Summary
              </span>
              <span className="text-[10px] uppercase leading-[15px] tracking-[2px] text-gold-antique/60">
                Review before proceeding
              </span>
            </span>
          </div>
        </header>

        {/* Body */}
        <main className="flex-1 px-6 py-6">
          {isLoading && (
            <div role="status" aria-live="polite" aria-label="Loading summary" className="flex flex-col gap-4">
              <div className="h-[160px] animate-pulse rounded-2xl bg-white/[0.04]" />
              <div className="h-[120px] animate-pulse rounded-2xl bg-white/[0.04]" />
            </div>
          )}

          {isError && (
            <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              Failed to load plan details. Please go back and try again.
            </p>
          )}

          {!state && !isLoading && (
            <p className="text-sm text-gray-400">No investment selected. Please go back and choose a plan.</p>
          )}

          {plan && state && (
            <div className="flex flex-col gap-4">
              {/* Plan details card */}
              <section
                className="flex flex-col gap-4 rounded-2xl border border-gold-antique/20 bg-white/[0.03] p-[17px] backdrop-blur-md"
                aria-label="Plan details"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">
                    Selected Plan
                  </span>
                  <span className="rounded-full border border-gold-antique/30 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-gold-antique">
                    {plan.name}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">Returns</span>
                    <span className="pt-1 text-xl font-bold leading-7 text-gold-antique">{plan.returnPct}%</span>
                  </div>
                  <div className="flex flex-col rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
                    <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">Duration</span>
                    <span className="flex items-center gap-1.5 pt-1">
                      <Clock className="size-4 text-frost" aria-hidden />
                      <span className="text-xl font-bold leading-7 text-frost">{plan.durationHours}h</span>
                    </span>
                  </div>
                </div>
              </section>

              {/* Investment breakdown */}
              <section
                className="flex flex-col rounded-2xl border border-gold-antique/20 bg-white/[0.03] p-[17px] backdrop-blur-md"
                aria-label="Investment breakdown"
              >
                <div className="flex items-center justify-between pb-4">
                  <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">
                    Your Investment
                  </span>
                  <span className="text-xl font-bold leading-7">
                    {inr(amountPaise)}
                  </span>
                </div>
                <span className="h-px w-full bg-white/[0.06]" />
                <div className="flex items-center justify-between pt-4">
                  <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">
                    Expected Return
                  </span>
                  <span className="text-xl font-bold leading-7 text-gold-antique">
                    +{inr(expectedReturn)}
                  </span>
                </div>
              </section>

              <p className="text-center text-[11px] leading-[16px] text-gray-400/70">
                Returns are indicative and based on plan terms. Subject to admin confirmation.
              </p>
            </div>
          )}
        </main>

        {/* Sticky CTA */}
        <div
          className={cn(
            'sticky bottom-0 flex w-full flex-col px-6 pb-6 pt-12',
            'bg-gradient-to-t from-surface-nav via-surface-nav/95 to-transparent'
          )}
        >
          <div className="flex w-full max-w-[448px] flex-col gap-4">
            {plan && state && (
              <div className="flex items-center justify-between rounded-2xl border border-gold-antique/20 bg-white/[0.03] p-[17px] backdrop-blur-md">
                <span className="flex flex-col">
                  <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">
                    Total Investment
                  </span>
                  <span className="text-xl font-bold leading-7">{inr(amountPaise)}</span>
                </span>
                <span className="flex flex-col items-end">
                  <span className="text-[10px] uppercase leading-[15px] tracking-[1px] text-gray-400">
                    Expected Yield
                  </span>
                  <span className="text-xl font-bold leading-7 text-gold-antique">+{inr(expectedReturn)}</span>
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={handleProceed}
              disabled={!plan || !state}
              className={cn(
                'flex w-full items-center justify-center gap-3 rounded-2xl py-5',
                'text-lg font-bold leading-7 text-surface-nav',
                'drop-shadow-[0px_0px_12.5px_rgba(212,175,55,0.5)] transition-opacity hover:opacity-90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60',
                'disabled:pointer-events-none disabled:opacity-40'
              )}
              style={{ backgroundImage: 'linear-gradient(135deg, #D4AF37 0%, #F3E2B3 50%, #AA8A2E 100%)' }}
            >
              Proceed to Payment
              <ArrowRight className="size-[18px]" aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
