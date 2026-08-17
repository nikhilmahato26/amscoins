import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  Check,
  Copy,
  Gift,
  Headphones,
  Loader2,
  Send,
  Share2,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { TierBadge, type Tier } from '@/components/app/TierBadge'
import { useReferral } from '@/hooks/queries'
import { cn } from '@/lib/utils'

/* ── Motion variants ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

/* ── Static display config (correct thresholds: gold=11, diamond=21) ── */
const TIER_STEPS: { tier: Tier; label: string; members: string; tone: string }[] = [
  { tier: 'silver',  label: 'Silver',  members: '0–10 members',  tone: 'text-asm-muted'  },
  { tier: 'gold',    label: 'Gold',    members: '11–20 members', tone: 'text-amber-600'  },
  { tier: 'diamond', label: 'Diamond', members: '21+ members',   tone: 'text-asm-blue'   },
]

const UNLOCK_LEVELS: {
  tier: Tier; name: string; requirement: string; card: string; requirementTone: string; perks: string[]
}[] = [
  {
    tier: 'silver',  name: 'Silver',
    requirement: 'Default Tier',
    card: 'border-asm-line bg-white',
    requirementTone: 'text-asm-greenInk',
    perks: ['Invest up to ₹10,000', '25% Returns in 24h'],
  },
  {
    tier: 'gold',    name: 'Gold',
    requirement: 'Unlock with 11 referrals',
    card: 'border-amber-200 bg-amber-50',
    requirementTone: 'text-amber-600',
    perks: ['Invest up to ₹50,000', '30% Returns in 24h'],
  },
  {
    tier: 'diamond', name: 'Diamond',
    requirement: 'Unlock with 21 referrals',
    card: 'border-asm-blue/20 bg-asm-blue-tint/40',
    requirementTone: 'text-asm-blue',
    perks: ['Invest up to ₹1,00,000', '40% Returns in 24h'],
  },
]

const VALUE_PROPS: { Icon: LucideIcon; title: string; subtitle: string }[] = [
  { Icon: ShieldCheck, title: 'Admin Verified',  subtitle: 'Manual security check' },
  { Icon: Zap,         title: '3-Hour Payout',   subtitle: 'Direct to your UPI'    },
  { Icon: Headphones,  title: 'Daily Support',   subtitle: "We're here for you"     },
  { Icon: Users,       title: 'Tier Progress',   subtitle: 'Unlock up to 40% returns' },
]

/* ── Page ── */
export function ReferralPage() {
  const { data, isLoading, isError } = useReferral()

  /* Derived progress values — safe when data is present */
  const count      = data?.count      ?? 0
  const nextTierAt = data?.nextTierAt ?? null
  const nextTier   = data?.nextTier   ?? null

  const remaining = nextTierAt !== null ? Math.max(nextTierAt - count, 0) : 0
  const progress   = nextTierAt !== null ? Math.min((count / nextTierAt) * 100, 100) : 100

  return (
    <AppShell backTo="/app">
      {/* Loading skeleton */}
      {isLoading && (
        <div className="flex flex-col items-center gap-4 py-16 text-asm-muted" aria-live="polite">
          <Loader2 className="size-7 animate-spin" aria-hidden />
          <p className="text-[13px]">Loading referral data…</p>
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center gap-3 py-16 text-center" aria-live="assertive">
          <p className="text-[14px] font-semibold text-asm-navy">Failed to load referral data</p>
          <p className="text-[12px] text-asm-muted">Please refresh the page and try again.</p>
        </div>
      )}

      {/* Main content */}
      {data && (
        <motion.div
          className="flex flex-col gap-5"
          variants={container}
          initial="hidden"
          animate="visible"
        >

          {/* ── Tier Progression hero ── */}
          <motion.section
            variants={fadeUp}
            className="relative overflow-hidden rounded-2xl border border-asm-blue/15 bg-gradient-to-br from-asm-blue-tint via-white to-asm-green-tint/60 p-5 shadow-[0_4px_20px_-6px_rgba(11,79,216,0.12)]"
          >
            {/* Decorative circle */}
            <div aria-hidden className="absolute -right-6 -top-6 size-24 rounded-full bg-asm-blue/5" />
            <div className="relative flex items-start gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-[0_2px_8px_-2px_rgba(16,42,92,0.12)]">
                <Gift className="size-5 text-asm-blue" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-asm-muted">Tier Progression</p>
                <p className="text-[22px] font-extrabold leading-tight tracking-tight text-asm-navy">
                  Unlock <span className="text-asm-greenInk">Gold &amp; Diamond</span>
                </p>
                <p className="text-[13px] leading-snug text-asm-body">
                  Every friend who joins and completes their first deposit counts toward unlocking higher return tiers.
                </p>
              </div>
            </div>
          </motion.section>

          {/* ── Code + link card ── */}
          <motion.section
            variants={fadeUp}
            className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]"
          >
            {/* Referral code */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
                Your referral code
              </span>
              <div className="flex items-stretch gap-2">
                <div className="flex h-14 min-w-0 flex-1 items-center justify-between gap-3 rounded-xl border border-asm-line bg-asm-tint px-4">
                  <span className="min-w-0 font-mono text-[20px] font-extrabold uppercase tracking-[3px] text-asm-navy">
                    {data.referralCode}
                  </span>
                  <CopyButton value={data.referralCode} label="Copy referral code" />
                </div>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: 'spring' as const, stiffness: 400, damping: 25 }}
                  className={cn(
                    'flex h-14 shrink-0 items-center gap-2 rounded-xl',
                    'border border-asm-blue/20 bg-asm-blue-tint px-4',
                    'text-[12px] font-bold uppercase tracking-[0.06em] text-asm-blue',
                    'transition-colors hover:bg-asm-blue hover:text-white',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue'
                  )}
                >
                  <Share2 className="size-4" aria-hidden />
                  Share
                </motion.button>
              </div>
            </div>

            {/* Referral link */}
            <div className="flex flex-col gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
                Your referral link
              </span>
              <div className="flex h-11 items-center justify-between gap-3 rounded-xl border border-asm-line bg-asm-tint px-4">
                <span className="truncate text-[11px] text-asm-muted">{data.link}</span>
                <CopyButton value={data.link} label="Copy referral link" />
              </div>
            </div>
          </motion.section>

          {/* ── Progress card ── */}
          <motion.section
            variants={fadeUp}
            className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]"
          >
            <h2 className="text-[15px] font-bold tracking-tight text-asm-navy">Your Progress</h2>

            {/* Tier stepper */}
            <div className="relative px-4">
              {/* Track */}
              <span className="absolute left-4 right-4 top-[27px] h-0.5 -translate-y-1/2 bg-asm-line" aria-hidden />
              {/* Fill to current */}
              <span
                className="absolute left-4 top-[27px] h-0.5 -translate-y-1/2 bg-gradient-to-r from-asm-muted/50 to-amber-400 transition-[width] duration-700"
                style={{ right: '50%' }}
                aria-hidden
              />
              <div className="relative flex items-start justify-between">
                {TIER_STEPS.map(({ tier, label, members, tone }) => (
                  <div key={tier} className="flex flex-col items-center gap-1.5">
                    <TierBadge tier={tier} size={44} />
                    <span className={cn('text-[11px] font-bold uppercase leading-none', tone)}>{label}</span>
                    <span className="text-center text-[9px] leading-tight text-asm-muted">{members}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Count */}
              <div className="flex items-center gap-3 rounded-xl border border-asm-line bg-asm-tint px-4 py-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.1)]">
                  <Users className="size-4 text-amber-600" aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase leading-none tracking-wide text-asm-muted">
                    Your Referrals
                  </span>
                  <span className="mt-0.5 font-mono text-[24px] font-extrabold leading-none tabular-nums text-asm-navy">
                    {count}
                  </span>
                </span>
              </div>

              {/* Next level (or maxed state) */}
              {nextTier !== null && nextTierAt !== null ? (
                <div className="flex flex-col gap-2.5 rounded-xl border border-asm-line bg-asm-tint px-4 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase leading-none tracking-wide text-amber-600">
                      Next: {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}
                    </span>
                    <span className="font-mono text-[11px] font-bold tabular-nums text-asm-muted">
                      {count}/{nextTierAt}
                    </span>
                  </div>
                  <span
                    className="h-2 w-full overflow-hidden rounded-full bg-asm-line"
                    role="progressbar"
                    aria-valuenow={count}
                    aria-valuemin={0}
                    aria-valuemax={nextTierAt}
                    aria-label={`Progress to ${nextTier}`}
                  >
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-[width] duration-700"
                      style={{ width: `${progress}%` }}
                    />
                  </span>
                  <span className="text-[11px] leading-none text-asm-body">
                    {remaining} more to unlock
                  </span>
                </div>
              ) : (
                <div className="flex flex-col justify-center gap-1.5 rounded-xl border border-asm-blue/30 bg-asm-blue-tint/50 px-4 py-3.5">
                  <span className="text-[10px] font-bold uppercase leading-none tracking-wide text-asm-blue">
                    Top tier
                  </span>
                  <span className="text-[12px] leading-snug text-asm-navy font-semibold">
                    Diamond unlocked!
                  </span>
                  <span className="text-[11px] leading-none text-asm-body">
                    Maximum tier reached
                  </span>
                </div>
              )}
            </div>

            {/* Benefits teaser — only shown when there's a next tier */}
            {nextTier !== null && (
              <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-100">
                  <Gift className="size-4 text-amber-600" aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-amber-700">
                    Next level benefits
                  </span>
                  <span className="text-[12px] leading-snug text-amber-900">
                    Higher returns (up to 40%) and larger investment limits unlock at{' '}
                    {nextTier.charAt(0).toUpperCase() + nextTier.slice(1)}.
                  </span>
                </span>
              </div>
            )}
          </motion.section>

          {/* ── Level requirements — horizontal scroll ── */}
          <motion.section variants={fadeUp} className="flex flex-col gap-3">
            <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
              Level Requirements
            </h2>
            <div className="-mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-1 no-scrollbar">
              {UNLOCK_LEVELS.map(({ tier, name, requirement, card, requirementTone, perks }) => (
                <div
                  key={tier}
                  className={cn('flex min-w-[168px] snap-start flex-col gap-3 rounded-2xl border p-4', card)}
                >
                  <div className="flex items-center gap-2">
                    <TierBadge tier={tier} size={28} showRibbon={false} />
                    <span className="flex flex-col">
                      <span className="text-[12px] font-bold uppercase leading-none text-asm-navy">{name}</span>
                      <span className={cn('mt-0.5 text-[10px] font-bold uppercase leading-none', requirementTone)}>
                        {requirement}
                      </span>
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {perks.map((perk) => (
                      <li key={perk} className="flex items-center gap-2">
                        <Check className="size-3 shrink-0 text-asm-greenInk" strokeWidth={3} aria-hidden />
                        <span className="whitespace-nowrap text-[11px] leading-none text-asm-body">{perk}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.section>

          {/* ── Referrals list ── */}
          <motion.section variants={fadeUp} className="flex flex-col gap-3">
            <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
              Your Referrals
            </h2>
            {data.referrals.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white px-5 py-8 text-center">
                <Users className="size-8 text-asm-muted/40" aria-hidden />
                <p className="text-[13px] font-semibold text-asm-navy">No referrals yet</p>
                <p className="text-[12px] text-asm-body">Share your code to start unlocking higher tiers.</p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.referrals.map(({ name, joinedAt, credited }, idx) => (
                  <li
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-asm-line bg-white px-4 py-3"
                  >
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="truncate text-[13px] font-semibold text-asm-navy">{name}</span>
                      <span className="text-[11px] text-asm-muted">
                        Joined {new Date(joinedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]',
                        credited
                          ? 'bg-asm-green-tint text-asm-greenInk'
                          : 'bg-amber-50 text-amber-600'
                      )}
                    >
                      {credited ? 'Credited' : 'Pending'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </motion.section>

          {/* ── Invite CTA ── */}
          <motion.div variants={fadeUp}>
            <motion.button
              type="button"
              whileHover={{ scale: 1.02, boxShadow: '0 12px 32px -8px rgba(21,128,61,0.45)' }}
              whileTap={{ scale: 0.98 }}
              transition={{ type: 'spring' as const, stiffness: 380, damping: 26 }}
              className={cn(
                'flex min-h-[56px] w-full items-center justify-center gap-3 rounded-2xl',
                'bg-asm-greenInk shadow-[0_8px_24px_-8px_rgba(21,128,61,0.5)]',
                'text-[15px] font-bold uppercase tracking-[0.06em] text-white',
                'transition-colors hover:bg-green-800',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-greenInk focus-visible:ring-offset-2'
              )}
            >
              <Send className="size-5" aria-hidden />
              Invite Now
            </motion.button>
          </motion.div>

          {/* ── Trust badges ── */}
          <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 pb-2">
            {VALUE_PROPS.map(({ Icon, title, subtitle }) => (
              <div key={title} className="flex items-center gap-3">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-asm-blue-tint">
                  <Icon className="size-4 text-asm-blue" aria-hidden />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-[12px] font-bold text-asm-navy">{title}</span>
                  <span className="truncate text-[11px] text-asm-body">{subtitle}</span>
                </span>
              </div>
            ))}
          </motion.div>

        </motion.div>
      )}
    </AppShell>
  )
}

/* ── CopyButton ── */
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
        'flex size-11 shrink-0 items-center justify-center rounded-lg border border-asm-line bg-white',
        'transition-colors hover:bg-asm-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue'
      )}
    >
      {copied
        ? <Check className="size-3.5 text-asm-greenInk" aria-hidden />
        : <Copy className="size-3.5 text-asm-muted" aria-hidden />
      }
    </button>
  )
}
