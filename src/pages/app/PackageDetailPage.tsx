import { useState } from 'react'
import { Check, Clock, ShieldCheck, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { AppHeader } from '@/components/app/AppHeader'
import { BottomNav } from '@/components/app/BottomNav'
import { GridBackdrop } from '@/components/app/GridBackdrop'
import { ReferralBanner } from '@/components/app/ReferralBanner'
import { TierBadge } from '@/components/app/TierBadge'
import { cn } from '@/lib/utils'

/** Placeholder until packages come from the API. */
const PACKAGE = {
  tier: 'silver' as const,
  returns: '25%',
  duration: '36 Hours',
  min: '₹1,000',
  max: '₹5,000',
}

const AMOUNTS: { id: string; label: string; amount: string; popular?: boolean }[] = [
  { id: 'entry', label: 'Entry', amount: '₹1,000' },
  { id: 'starter', label: 'Starter', amount: '₹5,000' },
  { id: 'premium', label: 'Premium', amount: '₹10,000' },
  { id: 'elite', label: 'Elite', amount: '₹25,000', popular: true },
]

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

export function PackageDetailPage() {
  const [selected, setSelected] = useState<string>('entry')

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black font-jakarta text-white">
      <GridBackdrop />
      <AppHeader variant="root" />

      <main className="relative mx-auto flex w-full max-w-[375px] flex-col gap-10 px-[18px] pb-28 pt-[116px]">
        {/* Package summary */}
        <section className="relative flex flex-col gap-3 overflow-hidden rounded-[20px] border-2 border-plate px-[25px] py-4">
          <span
            aria-hidden
            className="pointer-events-none absolute -top-10 right-[-14px] size-32 rounded-full bg-slate-400/10 blur-[32px]"
          />

          <div className="flex flex-col items-center gap-1">
            <TierBadge tier={PACKAGE.tier} size={133} />
            <div className="flex w-full items-end justify-between">
              <span className="flex items-baseline gap-2">
                <span className="text-2xl font-bold leading-8">{PACKAGE.returns}</span>
                <span className="text-sm leading-5 text-gray-400">Returns</span>
              </span>
              <span className="flex items-center gap-2 pt-1.5">
                <Clock className="size-4 text-frost" aria-hidden />
                <span className="text-xl font-medium leading-[30px] text-frost">
                  {PACKAGE.duration}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-stretch justify-between rounded-xl border border-black/10 bg-white/20 px-[18px] py-3">
            <span className="flex w-[62px] flex-col">
              <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px]">Min</span>
              <span className="pt-[5px] text-lg font-semibold leading-[27px] text-frost">
                {PACKAGE.min}
              </span>
            </span>
            <span className="w-px self-stretch bg-white/[0.07]" />
            <span className="flex w-[62px] flex-col items-end">
              <span className="text-[10px] uppercase leading-[15px] tracking-[1.5px]">Max</span>
              <span className="pt-[5px] text-lg font-semibold leading-[27px] text-frost">
                {PACKAGE.max}
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
              className="text-xs leading-4 text-gold-antique underline decoration-solid underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              Custom Amount
            </button>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-2">
            {AMOUNTS.map(({ id, label, amount, popular }) => {
              const isSelected = selected === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelected(id)}
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
                    {amount}
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

          <button
            type="button"
            onClick={() => setSelected('whale')}
            aria-pressed={selected === 'whale'}
            className={cn(
              'mt-2 flex h-[62px] w-full items-center justify-center gap-3 rounded-2xl backdrop-blur-[6px]',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
              selected === 'whale'
                ? 'bg-plate text-black'
                : 'border border-white/5 bg-surface hover:border-white/20'
            )}
          >
            <span className="text-xl font-bold leading-7">₹50,000</span>
            <span
              className={cn(
                'text-xs leading-4',
                selected === 'whale' ? 'text-black/70' : 'text-gray-400'
              )}
            >
              Whale Tier
            </span>
          </button>
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

        <Link
          to="/app/payment"
          className={cn(
            'flex h-14 w-full items-center justify-center rounded-2xl bg-gradient-to-br from-gold to-yellow-500',
            'text-base font-bold uppercase tracking-[-0.4px] text-black shadow-2xl shadow-black/25',
            'transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
          )}
        >
          Continue to Payment
        </Link>
      </main>

      <BottomNav />
    </div>
  )
}
