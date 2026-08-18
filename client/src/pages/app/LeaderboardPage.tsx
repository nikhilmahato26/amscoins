import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { Trophy, AlertCircle } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { TierBadge } from '@/components/app/TierBadge'
import { useLeaderboard } from '@/hooks/queries'
import type { LeaderboardPeriod } from '@/services/api/leaderboard'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

/* ── Motion variants ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 100, damping: 20 },
  },
}

/* ── Period tab config ── */
const PERIODS: { value: LeaderboardPeriod; label: string; count: number }[] = [
  { value: 'daily',   label: 'Daily',   count: 5  },
  { value: 'weekly',  label: 'Weekly',  count: 10 },
  { value: 'monthly', label: 'Monthly', count: 20 },
]

/* ── Medal config for top 3 ── */
const MEDAL: Record<number, { ring: string; bg: string; rankColor: string; label: string }> = {
  1: {
    ring:      'ring-2 ring-amber-400/60',
    bg:        'bg-amber-50/60',
    rankColor: 'text-amber-500',
    label:     '🥇',
  },
  2: {
    ring:      'ring-2 ring-slate-400/50',
    bg:        'bg-slate-50/60',
    rankColor: 'text-slate-500',
    label:     '🥈',
  },
  3: {
    ring:      'ring-2 ring-orange-400/40',
    bg:        'bg-orange-50/40',
    rankColor: 'text-orange-600',
    label:     '🥉',
  },
}

/* ── Skeleton row ── */
function SkeletonRow({ index }: { index: number }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border border-asm-line bg-white px-4 py-3.5',
        'shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]',
        'animate-pulse'
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Rank */}
      <span className="w-6 shrink-0">
        <span className="block h-4 w-5 rounded bg-asm-tint" />
      </span>
      {/* Badge */}
      <span className="size-9 shrink-0 rounded-full bg-asm-tint" />
      {/* Name + tier */}
      <span className="flex flex-1 flex-col gap-1.5">
        <span className="h-3.5 w-32 rounded bg-asm-tint" />
        <span className="h-3 w-16 rounded bg-asm-tint" />
      </span>
      {/* Amount */}
      <span className="h-4 w-20 rounded bg-asm-tint" />
    </div>
  )
}

/* First initial for the avatar fallback, e.g. "Bhanu" → "B". */
function firstInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?'
}

/* Fallback avatar background, tinted per tier. */
const TIER_AVATAR_BG: Record<'silver' | 'gold' | 'diamond', string> = {
  silver:  'bg-[#868B95]',
  gold:    'bg-[#F37400]',
  diamond: 'bg-asm-blue',
}

/* ── Leaderboard row ── */
function LeaderboardRow({
  rank,
  name,
  tier,
  avatar,
  totalInvested,
}: {
  rank: number
  name: string
  tier: 'silver' | 'gold' | 'diamond'
  avatar?: string | null
  totalInvested: number
}) {
  const isTop3 = rank <= 3
  const medal  = MEDAL[rank]

  return (
    <motion.div variants={fadeUp}>
      <div
        className={cn(
          'flex items-center gap-3 rounded-2xl border border-asm-line px-4',
          'shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]',
          'transition-colors',
          isTop3
            ? cn('py-4', medal.bg, medal.ring)
            : 'bg-white py-3.5'
        )}
      >
        {/* Rank indicator */}
        <div className="flex w-7 shrink-0 items-center justify-center">
          {isTop3 ? (
            <span
              className="text-[18px] leading-none"
              aria-label={`Rank ${rank}`}
            >
              {medal.label}
            </span>
          ) : (
            <span
              className={cn(
                'font-mono text-[13px] font-bold tabular-nums',
                'text-asm-muted'
              )}
              aria-label={`Rank ${rank}`}
            >
              {rank}
            </span>
          )}
        </div>

        {/* Profile photo (or first-initial fallback) with a tier corner badge */}
        <div className="relative shrink-0">
          {avatar ? (
            <img
              src={avatar}
              alt=""
              loading="lazy"
              decoding="async"
              className={cn('rounded-full object-cover', isTop3 ? 'size-11' : 'size-9', isTop3 && 'drop-shadow-lg')}
            />
          ) : (
            <span
              className={cn(
                'flex items-center justify-center rounded-full font-jakarta font-bold text-white',
                isTop3 ? 'size-11 text-[15px] drop-shadow-lg' : 'size-9 text-[13px]',
                TIER_AVATAR_BG[tier],
              )}
              aria-hidden
            >
              {firstInitial(name)}
            </span>
          )}
          <TierBadge
            tier={tier}
            size={isTop3 ? 18 : 16}
            className="absolute -bottom-0.5 -right-0.5 rounded-full ring-2 ring-white"
          />
        </div>

        {/* Name + tier label */}
        <div className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn(
              'truncate font-jakarta font-semibold leading-snug',
              isTop3 ? 'text-[14px] text-asm-navy' : 'text-[13px] text-asm-navy'
            )}
          >
            {name}
          </span>
          <span className="text-[11px] capitalize text-asm-muted">{tier}</span>
        </div>

        {/* Total invested */}
        <div className="shrink-0 text-right">
          <span
            className={cn(
              'font-mono tabular-nums',
              isTop3
                ? 'text-[14px] font-bold text-asm-greenInk'
                : 'text-[13px] font-semibold text-asm-navy'
            )}
          >
            {inr(totalInvested)}
          </span>
        </div>
      </div>
    </motion.div>
  )
}

/* ── Empty state ── */
function EmptyState() {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col items-center gap-4 rounded-2xl border border-asm-line bg-white px-6 py-14 text-center shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-asm-tint">
        <Trophy className="size-6 text-asm-muted" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-jakarta text-[14px] font-semibold text-asm-navy">
          No investments in this period yet.
        </p>
        <p className="text-[12px] text-asm-body">
          Be the first to invest and claim the top spot.
        </p>
      </div>
    </motion.div>
  )
}

/* ── Error state ── */
function ErrorState() {
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col items-center gap-4 rounded-2xl border border-red-100 bg-red-50 px-6 py-14 text-center"
    >
      <span className="flex size-14 items-center justify-center rounded-full bg-white">
        <AlertCircle className="size-6 text-asm-red" aria-hidden />
      </span>
      <div className="flex flex-col gap-1">
        <p className="font-jakarta text-[14px] font-semibold text-asm-navy">
          Could not load leaderboard
        </p>
        <p className="text-[12px] text-asm-body">
          Please try again later.
        </p>
      </div>
    </motion.div>
  )
}

/* ── Page ── */
export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('daily')
  const { data, isLoading, isError } = useLeaderboard(period)

  const entries = data?.entries ?? []
  const topCount = PERIODS.find((p) => p.value === period)?.count ?? entries.length

  return (
    <AppShell headerVariant="root">
      <motion.div
        className="flex flex-col gap-5"
        variants={container}
        initial="hidden"
        animate="visible"
      >
        {/* ── Page heading ── */}
        <motion.div variants={fadeUp} className="px-1">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-asm-blue-tint">
              <Trophy className="size-4 text-asm-blue" strokeWidth={2} aria-hidden />
            </span>
            <div>
              <h1 className="font-jakarta text-[20px] font-extrabold leading-tight tracking-tight text-asm-navy">
                Leaderboard
              </h1>
              <p className="text-[12px] text-asm-muted">Top investors by period</p>
            </div>
          </div>
        </motion.div>

        {/* ── Period segmented control ── */}
        <motion.div variants={fadeUp}>
          <div
            role="tablist"
            aria-label="Leaderboard period"
            className={cn(
              'grid grid-cols-3 gap-1 rounded-2xl border border-asm-line bg-asm-tint p-1',
            )}
          >
            {PERIODS.map(({ value, label }) => {
              const isActive = period === value
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setPeriod(value)}
                  className={cn(
                    'flex min-h-[42px] items-center justify-center rounded-xl py-2 text-[13px] font-semibold transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
                    isActive
                      ? 'bg-white text-asm-blue shadow-[0_1px_4px_-1px_rgba(16,42,92,0.12)]'
                      : 'text-asm-muted hover:text-asm-navy'
                  )}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </motion.div>

        {/* ── List area ── */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={period}
            variants={container}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            className="flex flex-col gap-2.5"
          >
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => (
                <SkeletonRow key={i} index={i} />
              ))
            ) : isError ? (
              <ErrorState />
            ) : entries.length === 0 ? (
              <EmptyState />
            ) : (
              entries.map((entry) => (
                <LeaderboardRow
                  key={entry.userId}
                  rank={entry.rank}
                  name={entry.name}
                  tier={entry.tier}
                  avatar={entry.avatar}
                  totalInvested={entry.totalInvested}
                />
              ))
            )}
          </motion.div>
        </AnimatePresence>

        {/* ── Footer label ── */}
        {!isLoading && !isError && entries.length > 0 && (
          <motion.p
            variants={fadeUp}
            className="pb-4 text-center text-[11px] text-asm-muted"
          >
            Top {topCount} this period · Amounts in INR · Updated hourly
          </motion.p>
        )}
      </motion.div>
    </AppShell>
  )
}
