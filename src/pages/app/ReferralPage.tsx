import { useState } from 'react'
import {
  Check,
  Copy,
  Gift,
  Headphones,
  Send,
  Share2,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { TierBadge, type Tier } from '@/components/app/TierBadge'
import { cn } from '@/lib/utils'

/** Placeholder until the referral service is wired up. */
const REFERRAL = {
  code: 'ITWQOX',
  link: 'https://www.asmcoins.com/?ref=ITWQOX',
  count: 3,
  nextTier: 'Gold',
  nextTierTarget: 5,
}

const TIER_STEPS: { tier: Tier; label: string; members: string; tone: string }[] = [
  { tier: 'silver', label: 'Silver', members: '0-4 Members', tone: 'text-gray-300' },
  { tier: 'gold', label: 'Gold', members: '5-19 Members', tone: 'text-amber-500' },
  { tier: 'diamond', label: 'Diamond', members: '20+ Members', tone: 'text-gold-bright' },
]

const UNLOCK_LEVELS: {
  tier: Tier
  name: string
  requirement: string
  card: string
  requirementTone: string
  perks: string[]
}[] = [
  {
    tier: 'silver',
    name: 'Silver',
    requirement: 'Unlocks instantly',
    card: 'border-gray-500/20 bg-surface-2',
    requirementTone: 'text-emerald-500',
    perks: ['Invest up to ₹10,000', 'Access to Silver Plans'],
  },
  {
    tier: 'gold',
    name: 'Gold',
    requirement: 'Unlock with 20 members',
    card: 'border-amber-500/30 bg-amber-500/5',
    requirementTone: 'text-amber-500',
    perks: ['Invest up to ₹50,000', 'Access to Gold Plans'],
  },
  {
    tier: 'diamond',
    name: 'Diamond',
    requirement: 'Unlock with 50 members',
    card: 'border-gold-bright/20 bg-surface-2',
    requirementTone: 'text-gold-bright',
    perks: ['Invest up to ₹1,00,000', 'Access to Diamond Plans'],
  },
]

const VALUE_PROPS: { Icon: LucideIcon; title: string; subtitle: string }[] = [
  { Icon: ShieldCheck, title: '100% Secure', subtitle: 'Your data is safe' },
  { Icon: Zap, title: 'Instant Payout', subtitle: 'Withdraw anytime' },
  { Icon: Headphones, title: '24/7 Support', subtitle: "We're here for you" },
  { Icon: Users, title: 'Trusted Platform', subtitle: 'Join thousands of investors' },
]

export function ReferralPage() {
  const remaining = Math.max(REFERRAL.nextTierTarget - REFERRAL.count, 0)
  const progress = Math.min((REFERRAL.count / REFERRAL.nextTierTarget) * 100, 100)

  return (
    <AppShell backTo="/app">
      <div className="flex flex-col gap-6">
        {/* Code + link */}
        <section className="flex flex-col gap-5 rounded-2xl border border-white/[0.08] bg-surface-2 p-[21px]">
          <div className="flex flex-col gap-2">
            <SubLabel className="text-gold-bright">Your referral code</SubLabel>
            <div className="flex items-stretch gap-3">
              <div className="flex h-14 min-w-0 flex-1 items-center justify-between rounded-2xl border border-white/5 bg-black/30 px-[21px]">
                <span className="truncate text-xl font-bold uppercase leading-7 tracking-[2px]">
                  {REFERRAL.code}
                </span>
                <CopyButton value={REFERRAL.code} label="Copy referral code" />
              </div>
              <button
                type="button"
                className={cn(
                  'flex h-14 shrink-0 items-center gap-2 rounded-2xl border border-gold-bright/20 bg-red-500/5 px-[21px]',
                  'text-[10px] font-bold uppercase leading-[15px] tracking-[-0.25px] text-gold-bright',
                  'transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
                )}
              >
                <Share2 className="size-3.5" aria-hidden />
                <span className="text-center">
                  Share
                  <br />
                  Code
                </span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <SubLabel className="text-gold-bright">Your referral link</SubLabel>
            <div className="flex h-14 items-center justify-between gap-4 rounded-2xl border border-white/5 bg-black/30 px-[21px]">
              <span className="truncate text-[10px] leading-[15px] tracking-[-0.16px] text-gray-400">
                {REFERRAL.link}
              </span>
              <CopyButton value={REFERRAL.link} label="Copy referral link" />
            </div>
          </div>
        </section>

        {/* Progress */}
        <section className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-surface-2 p-[21px]">
          <SectionLabel className="px-0">Your progress</SectionLabel>

          <div className="relative px-6">
            <span className="absolute left-0 right-0 top-[31px] h-0.5 -translate-y-1/2 bg-white/10" />
            <span className="absolute left-0 right-1/2 top-[31px] h-0.5 -translate-y-1/2 bg-gradient-to-r from-gray-500 to-yellow-500" />
            <div className="relative flex items-start justify-between">
              {TIER_STEPS.map(({ tier, label, members, tone }) => (
                <div key={tier} className="flex flex-col items-center">
                  <TierBadge tier={tier} size={48} />
                  <span
                    className={cn(
                      'pt-[7px] text-[9px] font-bold uppercase leading-[13.5px] tracking-[-0.16px]',
                      tone
                    )}
                  >
                    {label}
                  </span>
                  <span className="text-[8px] leading-3 tracking-[-0.16px] text-gray-500">
                    {members}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex flex-1 items-center gap-1 rounded-2xl border border-white/5 bg-white/5 py-[17px] pl-[9px] pr-[17px]">
              <span className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-gold-bright/10">
                <Users className="size-4 text-gold-bright" aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col pl-1">
                <span className="text-[8px] font-bold uppercase leading-3 tracking-[0.8px] text-gray-500">
                  Your referrals
                </span>
                <span className="text-lg font-bold leading-7 tracking-[-0.16px]">
                  {REFERRAL.count}
                </span>
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-2 rounded-2xl border border-white/5 bg-white/5 px-[17px] pb-[19.5px] pt-[17px]">
              <span className="flex items-center justify-between">
                <span className="text-[8px] font-bold uppercase leading-3 tracking-[0.8px] text-amber-500">
                  Next level: {REFERRAL.nextTier}
                </span>
                <span className="text-[9px] font-bold leading-[13.5px] tracking-[-0.16px] text-gray-400">
                  {REFERRAL.count}/{REFERRAL.nextTierTarget}
                </span>
              </span>
              <span
                className="h-2 w-full overflow-hidden rounded-full bg-white/10"
                role="progressbar"
                aria-valuenow={REFERRAL.count}
                aria-valuemin={0}
                aria-valuemax={REFERRAL.nextTierTarget}
                aria-label={`Progress to ${REFERRAL.nextTier}`}
              >
                <span
                  className="block h-full rounded-full bg-gold-bright"
                  style={{ width: `${progress}%` }}
                />
              </span>
              <span className="text-[8px] leading-3 tracking-[-0.16px] text-gray-500">
                {remaining} more members to unlock
              </span>
            </div>
          </div>

          <div className="flex items-start gap-4 rounded-2xl border border-gold-bright/10 bg-red-500/5 p-[17px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gold-bright/10">
              <Gift className="size-[18px] text-gold-bright" aria-hidden />
            </span>
            <span className="flex flex-col gap-[3px]">
              <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[-0.25px] text-gold-bright">
                Next level benefits
              </span>
              <span className="text-[10px] leading-[16.25px] tracking-[-0.16px] text-gray-400">
                Higher investment plans &amp; exclusive referral commissions unlock instantly.
              </span>
            </span>
          </div>
        </section>

        {/* Unlock requirements */}
        <section className="flex flex-col gap-4">
          <SectionLabel>Level unlock requirements</SectionLabel>
          <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
            {UNLOCK_LEVELS.map(({ tier, name, requirement, card, requirementTone, perks }) => (
              <div
                key={tier}
                className={cn(
                  'flex min-w-[160px] snap-start flex-col gap-3 rounded-2xl border p-[17px]',
                  card
                )}
              >
                <div className="flex items-center gap-2">
                  <TierBadge tier={tier} size={24} showRibbon={false} />
                  <span className="flex flex-col">
                    <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[-0.16px]">
                      {name}
                    </span>
                    <span
                      className={cn(
                        'text-[8px] font-bold uppercase leading-3 tracking-[-0.16px]',
                        requirementTone
                      )}
                    >
                      {requirement}
                    </span>
                  </span>
                </div>
                <ul className="flex flex-col gap-1.5">
                  {perks.map((perk) => (
                    <li key={perk} className="flex items-center gap-2">
                      <Check className="size-2 shrink-0 text-emerald-500" strokeWidth={4} aria-hidden />
                      <span className="whitespace-nowrap text-[9px] leading-[13.5px] tracking-[-0.16px] text-gray-400">
                        {perk}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <button
          type="button"
          className={cn(
            'flex h-16 w-full items-center justify-center gap-3 rounded-2xl bg-gold-bright shadow-2xl shadow-black/25',
            'text-base font-bold uppercase leading-6 tracking-[-0.4px] text-black',
            'transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60'
          )}
        >
          <Send className="size-5" aria-hidden />
          Invite Now 🚀
        </button>

        {/* Value props */}
        <div className="grid grid-cols-2 gap-4 py-4">
          {VALUE_PROPS.map(({ Icon, title, subtitle }) => (
            <div key={title} className="flex items-center gap-3">
              <Icon className="size-4 shrink-0 text-gold-bright" aria-hidden />
              <span className="flex min-w-0 flex-col">
                <span className="text-[9px] font-bold uppercase leading-[13.5px] tracking-[-0.16px] text-gray-300">
                  {title}
                </span>
                <span className="truncate text-[8px] leading-3 tracking-[-0.16px] text-gray-500">
                  {subtitle}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  )
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={cn(
        'flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/5 bg-white/5',
        'transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
      )}
    >
      {copied ? (
        <Check className="size-4 text-emerald-500" aria-hidden />
      ) : (
        <Copy className="size-4 text-gray-300" aria-hidden />
      )}
    </button>
  )
}

function SectionLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2
      className={cn(
        'px-1 text-xs font-bold uppercase leading-4 tracking-[1.2px] text-gray-400',
        className
      )}
    >
      {children}
    </h2>
  )
}

function SubLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn('text-[10px] font-bold uppercase leading-[15px] tracking-[1px]', className)}
    >
      {children}
    </span>
  )
}
