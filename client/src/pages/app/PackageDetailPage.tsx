import { useState } from 'react'
import { Check, Clock, ShieldCheck, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router'

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
  const state = location.state as LocationState | null

  const { data: plans, isLoading, isError } = usePlans()

  // Resolve the plan to display: from state, or first unlocked, or silver
  const plan = plans?.find((p) => p.key === state?.planKey)
    ?? plans?.find((p) => p.unlocked)
    ?? plans?.find((p) => p.key === 'silver')

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
    navigate('/app/summary', { state: { planKey: plan.key, amount: paise } })
  }

  return (
    <AppShell headerVariant="root" width="wide" contentClassName="px-[18px] pt-[116px]">
      <div className="flex flex-col gap-10 lg:mx-auto lg:max-w-[600px]">

        {/* Loading skeleton */}
        {isLoading && (
          <div role="status" aria-live="polite" aria-label="Loading plan details" className="flex flex-col gap-10">
            <div className="h-[200px] animate-pulse rounded-[20px] bg-surface" />
            <div className="h-[260px] animate-pulse rounded-[20px] bg-surface" />
          </div>
        )}

        {isError && (
          <p role="alert" className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            Failed to load plan details. Please go back and try again.
          </p>
        )}

        {plan && (
          <>
            {/* Package summary */}
            <section className="relative flex flex-col gap-3 overflow-hidden rounded-[20px] border-2 border-plate px-[25px] py-4">
              <span
                aria-hidden
                className="pointer-events-none absolute -top-10 right-[-14px] size-32 rounded-full bg-slate-400/10 blur-[32px]"
              />

              <div className="flex flex-col items-center gap-1">
                <TierBadge tier={plan.key} size={133} />
                <div className="flex w-full items-end justify-between">
                  <span className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold leading-8">{plan.returnPct}%</span>
                    <span className="text-sm leading-5 text-gray-400">Returns</span>
                  </span>
                  <span className="flex items-center gap-2 pt-1.5">
                    <Clock className="size-4 text-frost" aria-hidden />
                    <span className="text-xl font-medium leading-[30px] text-frost">
                      {plan.durationHours} Hours
                    </span>
                  </span>
                </div>
              </div>

              <div className="flex items-stretch justify-between rounded-xl border border-black/10 bg-white/20 px-[18px] py-3">
                <span className="flex w-[62px] flex-col">
                  <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px]">Min</span>
                  <span className="pt-[5px] text-lg font-semibold leading-[27px] text-frost">
                    {inr(plan.minInvest)}
                  </span>
                </span>
                <span className="w-px self-stretch bg-white/[0.07]" />
                <span className="flex w-[62px] flex-col items-end">
                  <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px]">Max</span>
                  <span className="pt-[5px] text-lg font-semibold leading-[27px] text-frost">
                    {inr(plan.maxInvest)}
                  </span>
                </span>
              </div>
            </section>

            {/* Investment grid */}
            <section className="flex flex-col gap-2">
              <div className="flex items-end justify-between">
                <h2 className="text-lg font-medium leading-7">Select Investment</h2>
                <button
                  type="button"
                  onClick={() => setSelected('custom')}
                  className="text-xs leading-4 text-gold-antique underline decoration-solid underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  Custom Amount
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
                        'relative flex h-[97px] flex-col justify-center rounded-2xl px-6 text-left backdrop-blur-[6px]',
                        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                        isSelected
                          ? 'bg-plate drop-shadow-[0_0_7.5px_rgba(212,175,55,0.3)]'
                          : popular
                            ? 'border border-white/5 bg-white/10'
                            : 'border border-white/[0.08] bg-surface hover:border-white/20'
                      )}
                    >
                      <span
                        className={cn('text-xs leading-4', isSelected ? 'text-black' : 'text-gray-400')}
                      >
                        {label}
                      </span>
                      <span
                        className={cn(
                          'text-xl font-bold leading-7',
                          isSelected ? 'text-black' : 'text-white'
                        )}
                      >
                        ₹{rupees.toLocaleString('en-IN')}
                      </span>

                      {isSelected ? (
                        <Check
                          className="absolute right-[9px] top-[13px] size-4 text-black"
                          strokeWidth={3}
                          aria-hidden
                        />
                      ) : null}

                      {popular && !isSelected ? (
                        <span className="absolute -right-1 -top-2 rounded-full bg-gold-antique px-2 py-0.5 text-[8px] font-bold uppercase leading-3 tracking-[-0.4px] text-surface-nav">
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
                  <label htmlFor="custom-amount" className="text-xs leading-4 text-gray-400">
                    Enter amount in ₹
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">
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
                        'h-[62px] w-full rounded-2xl border bg-surface pl-9 pr-4 text-xl font-bold text-white',
                        'placeholder:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
                        'backdrop-blur-[6px] border-white/5 hover:border-white/20'
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Validation error */}
              {validationError && (
                <p role="alert" className="mt-1 text-xs leading-4 text-red-400">
                  {validationError}
                </p>
              )}
            </section>

            {/* Benefits */}
            <section className="flex flex-col gap-4">
              <h2 className="text-lg font-medium leading-7">Exclusive Benefits</h2>
              <div className="flex flex-col gap-3">
                {BENEFITS.map(({ Icon, title, subtitle }) => (
                  <div
                    key={title}
                    className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-[17px] backdrop-blur-[6px]"
                  >
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold-antique/20 bg-gold-antique/10">
                      <Icon className="size-4 text-gold-antique" aria-hidden />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-sm font-semibold leading-5">{title}</span>
                      <span className="text-xs leading-4 text-gray-400">{subtitle}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <ReferralBanner />

            <button
              type="button"
              onClick={handleContinue}
              className={cn(
                'flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-yellow-500',
                'text-base font-bold uppercase tracking-[-0.4px] text-black shadow-2xl shadow-black/25',
                'transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
              )}
            >
              Continue to Payment
            </button>
          </>
        )}
      </div>
    </AppShell>
  )
}
