import { useState } from 'react'
import { Check, Clock, ShieldCheck, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'

import { AppShell } from '@/components/app/AppShell'
import { ReferralBanner } from '@/components/app/ReferralBanner'
import { TierBadge } from '@/components/app/TierBadge'
import { usePlans } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Tier } from '@/types'

interface LocationState {
  planKey?: Tier
}

const BENEFITS: { Icon: LucideIcon; title: string; subtitle: string }[] = [
  {
    Icon: ShieldCheck,
    title: 'Secured Assets',
    subtitle: 'Institutional grade vault protection',
  },
  {
    Icon: TrendingUp,
    title: 'Compound Returns',
    subtitle: 'ROI calculated and paid daily',
  },
]

/** Quick-pick preset amounts in rupees (not paise). */
const QUICK_PICKS: { id: string; label: string; rupees: number; popular?: boolean }[] = [
  { id: 'q1', label: 'Entry', rupees: 1000 },
  { id: 'q2', label: 'Starter', rupees: 5000 },
  { id: 'q3', label: 'Premium', rupees: 10000 },
  { id: 'q4', label: 'Elite', rupees: 25000, popular: true },
]

export function PackageDetailPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const state = location.state as LocationState | null

  const { data: plans, isLoading, isError } = usePlans()

  // Resolve the plan to display: from ?plan= query, then router state, then
  // first unlocked, then silver. Reading the query means /app/invest?plan=silver
  // deep-links to the right tier instead of silently ignoring the parameter.
  const planParam = params.get('plan') as Tier | null
  const plan =
    plans?.find((p) => p.key === planParam) ??
    plans?.find((p) => p.key === state?.planKey) ??
    plans?.find((p) => p.unlocked) ??
    plans?.find((p) => p.key === 'silver')

  // rupee string in the custom input
  const [customRupees, setCustomRupees] = useState<string>('')
  // quick-pick selection id ('q1'...'q4' or 'custom')
  const [selected, setSelected] = useState<string>('q1')
  const [validationError, setValidationError] = useState<string | null>(null)

  function getSelectedRupees(): number {
    if (selected === 'custom') {
      return parseFloat(customRupees) || 0
    }
    return QUICK_PICKS.find((q) => q.id === selected)?.rupees ?? 0
  }

  function handleContinue() {
    if (!plan) return
    const rupees = getSelectedRupees()
    const paise = Math.round(rupees * 100)

    if (rupees <= 0 || isNaN(rupees)) {
      setValidationError('Please enter an investment amount.')
      return
    }

    const minRupees = plan.minInvest / 100
    const maxRupees = plan.maxInvest / 100

    if (rupees < minRupees) {
      setValidationError(`Minimum investment for this plan is ${inr(plan.minInvest)}.`)
      return
    }
    if (rupees > maxRupees) {
      setValidationError(`Maximum investment for this plan is ${inr(plan.maxInvest)}.`)
      return
    }

    setValidationError(null)
    // Carry the selection in the query string (refresh-safe) and in router state.
    navigate(`/app/summary?plan=${plan.key}&amt=${paise}`, {
      state: { planKey: plan.key, amount: paise },
    })
  }

  return (
    <AppShell headerVariant="root" width="wide" contentClassName="px-[18px] pt-[116px]">
      <div className="flex flex-col gap-8 lg:mx-auto lg:max-w-[600px]">

        {/* Loading skeleton */}
        {isLoading && (
          <div role="status" aria-live="polite" aria-label="Loading plan details" className="flex flex-col gap-8">
            <div className="h-[200px] animate-pulse rounded-[20px] bg-white/70 ring-1 ring-asm-line" />
            <div className="h-[260px] animate-pulse rounded-[20px] bg-white/70 ring-1 ring-asm-line" />
          </div>
        )}

        {isError && (
          <p role="alert" className="rounded-xl border border-asm-red/20 bg-red-50 px-4 py-3 text-sm text-asm-red">
            Failed to load plan details. Please go back and try again.
          </p>
        )}

        {plan && (
          <>
            {/* Package summary */}
            <section className="relative flex flex-col gap-3 overflow-hidden rounded-[20px] border border-asm-line bg-white px-[25px] py-4 shadow-[0_2px_16px_-6px_rgba(16,42,92,0.1)]">
              <div className="flex flex-col items-center gap-1">
                <TierBadge tier={plan.key} size={133} />
                <div className="flex w-full items-end justify-between">
                  <span className="flex items-baseline gap-2">
                    <span className="text-2xl font-extrabold leading-8 text-asm-navy">{plan.returnPct}%</span>
                    <span className="text-sm leading-5 text-asm-muted">Returns</span>
                  </span>
                  <span className="flex items-center gap-2 pt-1.5">
                    <Clock className="size-4 text-asm-blue" aria-hidden />
                    <span className="text-xl font-semibold leading-[30px] text-asm-navy">
                      {plan.durationHours} Hours
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-stretch justify-between rounded-xl bg-asm-tint px-[18px] py-3">
                <span className="flex flex-col">
                  <span className="text-[10px] font-semibold uppercase leading-[15px] tracking-[1.5px] text-asm-muted">Min</span>
                  <span className="pt-[5px] text-lg font-bold leading-[27px] text-asm-navy">
                    {inr(plan.minInvest)}
                  </span>
                </span>
                <span className="w-px self-stretch bg-asm-line" />
                <span className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold uppercase leading-[15px] tracking-[1.5px] text-asm-muted">Max</span>
                  <span className="pt-[5px] text-lg font-bold leading-[27px] text-asm-navy">
                    {inr(plan.maxInvest)}
                  </span>
                </span>
              </div>
            </section>

            {/* Investment grid */}
            <section className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold leading-7 text-asm-navy">Select Investment</h2>
                <button
                  type="button"
                  onClick={() => setSelected('custom')}
                  className={cn(
                    'inline-flex min-h-[40px] items-center rounded-lg px-2.5 py-1.5 text-sm font-semibold text-asm-blue transition-colors',
                    'hover:bg-asm-blue-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
                    selected === 'custom' && 'bg-asm-blue-tint'
                  )}
                >
                  Custom amount
                </button>
              </div>

              <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-2">
                {QUICK_PICKS.map(({ id, label, rupees, popular }) => {
                  const isSelected = selected === id
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        setSelected(id)
                        setValidationError(null)
                      }}
                      aria-pressed={isSelected}
                      className={cn(
                        'relative flex h-[97px] flex-col justify-center rounded-2xl border px-6 text-left transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
                        isSelected
                          ? 'border-asm-blue bg-asm-blue-tint shadow-[0_2px_12px_-4px_rgba(11,79,216,0.25)]'
                          : 'border-asm-line bg-white hover:border-asm-blue/40'
                      )}
                    >
                      <span className={cn('text-xs font-medium leading-4', isSelected ? 'text-asm-blue' : 'text-asm-muted')}>
                        {label}
                      </span>
                      <span
                        className={cn(
                          'text-xl font-extrabold leading-7',
                          isSelected ? 'text-asm-blue' : 'text-asm-navy'
                        )}
                      >
                        ₹{rupees.toLocaleString('en-IN')}
                      </span>

                      {isSelected ? (
                        <Check
                          className="absolute right-[11px] top-[13px] size-4 text-asm-blue"
                          strokeWidth={3}
                          aria-hidden
                        />
                      ) : null}

                      {popular && !isSelected ? (
                        <span className="absolute -right-1 -top-2 rounded-full bg-asm-green px-2 py-0.5 text-[8px] font-bold uppercase leading-3 tracking-[0.4px] text-white">
                          Popular
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>

              {/* Custom amount input */}
              {selected === 'custom' && (
                <div className="mt-2 flex flex-col gap-1.5">
                  <label htmlFor="custom-amount" className="text-xs font-medium leading-4 text-asm-body">
                    Enter amount in ₹
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-asm-muted">
                      ₹
                    </span>
                    <input
                      id="custom-amount"
                      type="number"
                      inputMode="numeric"
                      min={plan.minInvest / 100}
                      max={plan.maxInvest / 100}
                      value={customRupees}
                      onChange={(e) => {
                        setCustomRupees(e.target.value)
                        setValidationError(null)
                      }}
                      placeholder={`${plan.minInvest / 100}–${plan.maxInvest / 100}`}
                      className={cn(
                        'h-[62px] w-full rounded-2xl border border-asm-line bg-white pl-9 pr-4 text-xl font-bold text-asm-navy',
                        'placeholder:font-semibold placeholder:text-asm-muted',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue hover:border-asm-blue/40'
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Validation error */}
              {validationError && (
                <p role="alert" className="mt-1 text-xs font-medium leading-4 text-asm-red">
                  {validationError}
                </p>
              )}
            </section>

            {/* Primary action, placed directly after the amount picker so the
                money action is never buried beneath the referral banner. */}
            <button
              type="button"
              onClick={handleContinue}
              className={cn(
                'flex h-14 w-full items-center justify-center rounded-2xl bg-asm-blue',
                'text-base font-bold text-white shadow-[0_10px_28px_-8px_rgba(11,79,216,0.5)]',
                'transition-colors hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2'
              )}
            >
              Continue to Payment
            </button>

            {/* Benefits */}
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-bold leading-7 text-asm-navy">Exclusive Benefits</h2>
              <div className="flex flex-col gap-3">
                {BENEFITS.map(({ Icon, title, subtitle }) => (
                  <div
                    key={title}
                    className="flex items-center gap-4 rounded-xl border border-asm-line bg-white p-[17px] shadow-[0_2px_12px_-4px_rgba(16,42,92,0.06)]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-asm-blue-tint">
                      <Icon className="size-4 text-asm-blue" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold leading-5 text-asm-navy">{title}</span>
                      <span className="text-xs leading-4 text-asm-body">{subtitle}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <ReferralBanner />
          </>
        )}
      </div>
    </AppShell>
  )
}
