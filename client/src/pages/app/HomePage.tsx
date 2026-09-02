import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { ArrowRight, Award, Lock, TrendingUp, Wallet } from 'lucide-react'

// vault.png / vault_dark.png live in /public — absolute URL, no import needed
import { AppShell } from '@/components/app/AppShell'
import { MarketTicker } from '@/components/app/MarketTicker'
import { ReferralBanner } from '@/components/app/ReferralBanner'
import { ReferralBonusNotice } from '@/components/app/ReferralBonusNotice'
import { TierBadge, type Tier } from '@/components/app/TierBadge'
import { useDashboard, useWallet } from '@/hooks/queries'
import { useAuth } from '@/auth/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { inr } from '@/lib/format'
import { ordinal } from '@/lib/tiers'
import { cn } from '@/lib/utils'

/* ── Framer Motion variants ─────────────────────────────────────── */

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 90, damping: 18 },
  },
}

/* ── Helpers ──────────────────────────────────────────────────── */

function maturityLabel(maturesAt?: string): string | null {
  if (!maturesAt) return null
  const d = new Date(maturesAt)
  if (Number.isNaN(d.getTime())) return null
  const diff = d.getTime() - Date.now()
  if (diff <= 0) return 'Matured'
  const hours = Math.floor(diff / 3_600_000)
  const mins  = Math.floor((diff % 3_600_000) / 60_000)
  if (hours < 1) return `${mins}m remaining`
  if (hours < 24) return `${hours}h ${mins}m remaining`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h remaining`
}

function TimeRemaining({ maturesAt }: { maturesAt: string }) {
  const [label, setLabel] = useState(() => maturityLabel(maturesAt) ?? '')
  useEffect(() => {
    // Already matured — no polling needed
    if (maturityLabel(maturesAt) === 'Matured') return
    const id = setInterval(() => {
      const l = maturityLabel(maturesAt) ?? ''
      setLabel(l)
      if (l === 'Matured') clearInterval(id) // stop once matured
    }, 60_000)
    return () => clearInterval(id)
  }, [maturesAt])
  if (!label) return null
  const matured = label === 'Matured'
  return (
    <span className={matured
      ? 'text-[11px] font-semibold text-asm-greenInk'
      : 'text-[11px] font-semibold text-asm-blue'
    }>
      {label}
    </span>
  )
}

/* ── Data ───────────────────────────────────────────────────────── */

const PLANS: { tier: Tier; name: string; returns: string; duration: string; min: string; max: string; requiredReferrals: number }[] = [
  { tier: 'silver', name: 'Silver', returns: '30%', duration: '72 Hours', min: '₹1,000', max: '₹10,000',   requiredReferrals: 0  },
  { tier: 'gold',   name: 'Gold',   returns: '35%', duration: '72 Hours', min: '₹3,000', max: '₹3,00,000', requiredReferrals: 21 },
]

/* ── Page ───────────────────────────────────────────────────────── */

export function HomePage() {
  const { isDark } = useTheme()
  const { user } = useAuth()
  const dashQuery   = useDashboard()
  const walletQuery = useWallet()

  const dash          = dashQuery.data
  const walletBalance = walletQuery.data?.balance ?? null
  const displayBalance = walletBalance ?? dash?.balance ?? null
  const totalInvested  = dash?.totals.invested ?? null
  const activeCount    = dash?.totals.activeCount ?? null
  const allTimeInvested = dash?.allTimeInvested ?? null
  const todayInvested  = dash?.todayInvested ?? null
  const activeInvests  = dash?.activeInvestments ?? []
  const isLoadingDash  = dashQuery.isLoading

  const firstName = (user?.name ?? '').split(' ')[0]

  return (
    <AppShell headerVariant="root" width="wide" contentClassName="px-0 pt-[68px]">
      <ReferralBonusNotice />

      <motion.div
        className="flex flex-col"
        variants={container}
        initial="hidden"
        animate="visible"
      >

        {/* ── Hero ── */}
        <section className="flex flex-col px-5 pb-6 pt-5">

          {/* Live price pill */}
          <motion.div variants={fadeUp} className=" mb-3 self-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-asm-greenInk/20 bg-asm-green-tint px-3.5 py-1.5">
              <span className="relative flex size-[7px] shrink-0">
                <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-60" />
                <span className="relative inline-flex size-[7px] rounded-full bg-asm-greenInk" />
              </span>
              <span className="font-jakarta text-[11px] font-bold uppercase tracking-[0.14em] text-asm-greenInk">
                Live · ASM COIN ₹12,850
              </span>
            </div>
          </motion.div>

         
          {/* Stat cards */}
          {/* <motion.div variants={fadeUp} className="mt-2 grid w-full max-w-sm grid-cols-2 gap-2">
            {STATS.map(({ label, value, Icon, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-asm-line bg-white px-4 py-3 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.1)]"
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                    color === 'blue' ? 'bg-asm-blue-tint' : 'bg-asm-green-tint'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-[18px]',
                      color === 'blue' ? 'text-asm-blue' : 'text-asm-greenInk'
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted">
                    {label}
                  </span>
                  <span className="mt-0.5 font-mono text-[18px] font-bold tabular-nums leading-none text-asm-navy">
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </motion.div> */}

          {/* Hero coin image — gentle float, full-width */}
          <motion.div
            variants={fadeUp}
            className="relative mt-2 w-full max-w-[420px] self-center"
          >
            <div
              aria-hidden
              className="absolute inset-0 -z-0 mx-auto rounded-full"
              style={{
                background: isDark
                  ? 'radial-gradient(circle at 50% 55%, rgba(0,200,160,0.10) 0%, transparent 72%)'
                  : 'radial-gradient(circle at 50% 55%, rgba(21,128,61,0.07) 0%, transparent 72%)',
              }}
            />
            <motion.img
              src={isDark ? '/vault_dark.png' : '/vault.png'}
              alt=""
              width={600}
              height={548}
              className={isDark
                ? 'relative w-full object-contain drop-shadow-[0_16px_48px_rgba(0,200,160,0.22)]'
                : 'relative w-full object-contain drop-shadow-[0_12px_40px_rgba(21,128,61,0.15)]'
              }
              fetchPriority="high"
              decoding="async"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

           {/* Subtitle — hidden on mobile to cut clutter; the "40% returns" claim
               is redundant with the plan cards below on small screens. */}
          <motion.p variants={fadeUp} className="mt-2 hidden max-w-[310px] text-[15px] leading-relaxed text-asm-body sm:block">
            Up to{' '}
            <span className="font-bold text-asm-greenInk">35% returns</span>
            {' '}in 72 hours.{' '}
            <span className="font-semibold text-asm-navy">ASM COIN</span> is where smart money moves.
          </motion.p>
        </section>

        {/* ── Portfolio snapshot ──
            order-first on mobile so returning investors see their portfolio
            before the marketing hero; restored to natural order on sm+. */}
        {(user || isLoadingDash) && (
          <motion.section variants={fadeUp} className="order-first px-5 pb-2 pt-2 sm:order-none sm:pt-0" aria-live="polite" aria-label="Portfolio summary">
            {firstName && (
              <p className="mb-3 text-[13px] font-semibold text-asm-body">
                Hey {firstName}, here's your portfolio
              </p>
            )}

            {/* Portfolio hero — the number users came to see */}
            {!isLoadingDash && (
              <div className="mb-3 rounded-2xl border border-asm-line bg-white px-5 py-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
                <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-asm-muted">Total Portfolio Value</span>
                <div className="mt-1.5 flex items-end gap-3">
                  <span className="font-jakarta text-[38px] font-extrabold leading-none tabular-nums text-asm-navy">
                    {displayBalance !== null ? inr(displayBalance) : '—'}
                  </span>
                  {totalInvested !== null && totalInvested > 0 && (
                    <span className="mb-1 rounded-full bg-asm-green-tint px-2.5 py-0.5 text-[12px] font-bold text-asm-greenInk">
                      ₹{inr(totalInvested)} active
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2.5">
              {isLoadingDash ? (
                <>
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4">
                      <span className="skeleton size-9 rounded-xl" />
                      <span className="skeleton h-4 w-14" />
                      <span className="skeleton h-2.5 w-10" />
                    </div>
                  ))}
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-asm-blue-tint">
                      <Wallet className="size-4 text-asm-blue" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="font-mono text-[14px] font-bold tabular-nums text-asm-navy">
                      {displayBalance !== null ? inr(displayBalance) : '—'}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">Balance</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-asm-green-tint">
                      <TrendingUp className="size-4 text-asm-greenInk" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="font-mono text-[14px] font-bold tabular-nums text-asm-navy">
                      {totalInvested !== null ? inr(totalInvested) : '—'}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">Invested</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50">
                      <Award className="size-4 text-amber-600" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="font-mono text-[14px] font-bold tabular-nums text-asm-navy">
                      {activeCount !== null ? activeCount : '—'}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">Active</span>
                  </div>
                </>
              )}
            </div>

            {/* All-time + today invested row */}
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {isLoadingDash ? (
                <>
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4">
                    <span className="skeleton h-4 w-16" />
                    <span className="skeleton h-2.5 w-12" />
                  </div>
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4">
                    <span className="skeleton h-4 w-16" />
                    <span className="skeleton h-2.5 w-12" />
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-asm-blue-tint">
                      <TrendingUp className="size-4 text-asm-blue" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="font-mono text-[14px] font-bold tabular-nums text-asm-navy">
                      {allTimeInvested !== null ? inr(allTimeInvested) : '—'}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">All-time Invested</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
                    <span className="flex size-9 items-center justify-center rounded-xl bg-asm-green-tint">
                      <Lock className="size-4 text-asm-greenInk" strokeWidth={2} aria-hidden />
                    </span>
                    <span className="font-mono text-[14px] font-bold tabular-nums text-asm-navy">
                      {todayInvested !== null ? inr(todayInvested) : '—'}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">Today's Invested</span>
                  </div>
                </>
              )}
            </div>

          </motion.section>
        )}

        {/* ── Active investments (if any) ── */}
        {!isLoadingDash && activeInvests.length > 0 && (
          <motion.section variants={fadeUp} className="px-5 pb-2" aria-live="polite" aria-labelledby="home-investments-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="home-investments-heading"
                className="text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted"
              >
                Active Investments
              </h2>
              <Link
                to="/app/dashboard"
                className="flex items-center gap-0.5 text-[11px] font-semibold text-asm-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue rounded"
              >
                See all <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              {activeInvests.slice(0, 3).map((inv) => {
                const planTier = inv.planKey as Tier
                const profit   = inv.expectedReturn - inv.amount
                return (
                  <div
                    key={inv.id}
                    className="elevate flex items-center gap-3 rounded-2xl border border-asm-line bg-white px-4 py-3 shadow-card"
                  >
                    <TierBadge tier={planTier} size={40} className="shrink-0" />
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-bold capitalize text-asm-navy">{planTier} Plan</span>
                      {inv.maturesAt && <TimeRemaining maturesAt={inv.maturesAt} />}
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="font-mono text-[14px] font-bold tabular-nums text-asm-greenInk">
                        {inr(inv.expectedReturn)}
                      </span>
                      <span className="text-[10px] font-semibold text-asm-greenInk">
                        +{inr(profit)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.section>
        )}

        {/* ── No active investments CTA ── */}
        {!isLoadingDash && user && activeInvests.length === 0 && (
          <motion.section variants={fadeUp} className="px-5 pb-2" aria-live="polite">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-asm-line bg-white px-5 py-7 text-center shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
              <span className="flex size-12 items-center justify-center rounded-full bg-asm-tint">
                <TrendingUp className="size-5 text-asm-muted" aria-hidden />
              </span>
              <p className="text-[13px] font-semibold text-asm-navy">No active investments yet</p>
              <p className="text-[12px] text-asm-body">Browse plans below and start earning today.</p>
            </div>
          </motion.section>
        )}

        {/* ── Market Snapshot ── */}
        <motion.section variants={fadeUp} className="px-5 pb-6">
          <MarketTicker />
        </motion.section>

        {/* ── Investment Plans ── */}
        <motion.section variants={fadeUp} className="px-5 pb-8">
          <h2 className="mb-4 text-[18px] font-extrabold tracking-tight text-asm-navy">
            Investment Packages
          </h2>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 sm:grid sm:grid-cols-2">
            {PLANS.map((plan) => {
              const currentTier = (dash?.tier ?? user?.tier ?? 'silver') as Tier
              const unlocked = isPlanUnlocked(currentTier, plan.tier)
              return (
                <PlanCard
                  key={plan.tier}
                  {...plan}
                  unlocked={unlocked}
                />
              )
            })}
          </div>
          <p className="mt-4 px-1 text-center text-[11px] leading-relaxed text-asm-muted">
            Returns shown are plan terms, not guarantees.{' '}
            <span className="text-asm-body">Read the full terms before you invest.</span>
          </p>
        </motion.section>

        {/* ── Referral ── */}
        <motion.section variants={fadeUp} className="px-5 pb-8">
          <ReferralBanner />
        </motion.section>

      </motion.div>
    </AppShell>
  )
}

/* ── Plan card ── */

const TIER_ORDER: Tier[] = ['silver', 'gold', 'diamond']
function isPlanUnlocked(userTier: Tier, planTier: Tier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(planTier)
}

/**
 * Per-tier accent styles.
 * Silver: neutral steel tones.
 * Gold: amber — the warmth of the metal.
 * Diamond: asm-blue — premium, trust-leading.
 */
const PLAN_STYLE: Record<Tier, {
  ring: string
  figure: string
  btn: string
  glow: string
}> = {
  silver: {
    ring:   'ring-1 ring-[#CED5E1]',
    figure: 'text-[#868B95]',
    btn:    'bg-asm-blue hover:bg-asm-blue-dark',
    glow:   'rgba(134,139,149,0.12)',
  },
  gold: {
    ring:   'ring-1 ring-[#FF9E45]/50',
    figure: 'text-[#F37400]',
    btn:    'bg-asm-blue hover:bg-asm-blue-dark',
    glow:   'rgba(243,116,0,0.12)',
  },
  diamond: {
    ring:   'ring-1 ring-asm-blue/30',
    figure: 'text-asm-blue',
    btn:    'bg-asm-blue hover:bg-asm-blue-dark',
    glow:   'rgba(11,79,216,0.12)',
  },
}

function PlanCard({
  tier,
  name,
  returns,
  duration,
  min,
  max,
  requiredReferrals,
  unlocked,
}: {
  tier: Tier
  name: string
  returns: string
  duration: string
  min: string
  max: string
  requiredReferrals: number
  unlocked: boolean
}) {
  const s = PLAN_STYLE[tier]
  const unlockOrdinalText = `Unlocks on ${ordinal(requiredReferrals)} Referral`

  return (
    <motion.article
      whileHover={
        unlocked
          ? {
              y: -4,
              boxShadow: `0 20px 40px -12px ${s.glow}, 0 4px 16px -4px rgba(16,42,92,0.10)`,
            }
          : undefined
      }
      transition={{ type: 'spring' as const, stiffness: 380, damping: 28 }}
      className={cn(
        'relative flex flex-col items-center overflow-hidden rounded-2xl bg-white p-5',
        'shadow-[0_2px_16px_-4px_rgba(16,42,92,0.08)]',
        s.ring
      )}
    >
      {/* Underlying Card Content — Visible through subtle blur when locked */}
      <div
        className={cn(
          'flex w-full flex-col items-center transition-all duration-300',
          !unlocked && 'pointer-events-none select-none opacity-50 filter blur-[1.5px]'
        )}
      >
        <TierBadge tier={tier} size={88} />

        <div className="mt-3 flex flex-col items-center gap-0.5">
          <span className={cn('text-[32px] font-extrabold leading-none tabular-nums', s.figure)}>
            {returns}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-asm-muted">Returns</span>
        </div>

        <div className="mt-3 flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold uppercase tracking-widest text-asm-muted">Duration</span>
          <span className="text-[15px] font-bold text-asm-navy">{duration}</span>
        </div>

        <div className="mt-3 flex w-full items-stretch justify-between rounded-xl bg-asm-tint px-4 py-2.5">
          <span className="flex flex-col">
            <span className="text-[9px] font-bold uppercase tracking-widest text-asm-muted">Min</span>
            <span className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-asm-navy">{min}</span>
          </span>
          <span className="w-px self-stretch bg-asm-line" />
          <span className="flex flex-col items-end">
            <span className="text-[9px] font-bold uppercase tracking-widest text-asm-muted">Max</span>
            <span className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-asm-navy">{max}</span>
          </span>
        </div>

        <Link
          to={`/app/invest?plan=${tier}`}
          aria-label={`Invest in the ${name} package`}
          className={cn(
            'mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl',
            'text-[12px] font-bold uppercase tracking-[0.08em] text-white',
            'transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
            s.btn
          )}
        >
          Invest Now
        </Link>
      </div>

      {/* Big Grey Lock Overlay when locked */}
      {!unlocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/65 backdrop-blur-[1px] p-5 text-center">
          <div className="mb-3 flex size-14 items-center justify-center rounded-full border border-slate-200/90 bg-slate-100 shadow-sm">
            <Lock className="size-7 text-slate-500" strokeWidth={2.2} aria-hidden />
          </div>

          <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-500">
            {name} Locked
          </span>
          <h3 className="mt-1 text-[17px] font-extrabold leading-tight text-asm-navy">
            {unlockOrdinalText}
          </h3>
          <p className="mt-1.5 max-w-[24ch] text-[12px] leading-snug text-slate-600">
            Refer {requiredReferrals} active friends with their first deposit to unlock this tier.
          </p>

          <Link
            to="/app/referral"
            aria-label={`Unlock ${name} on referral page`}
            className="mt-4 flex min-h-[46px] w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F08800] via-[#E67E00] to-[#DC7000] px-4 text-[13px] font-extrabold uppercase tracking-[0.08em] text-white shadow-[0_8px_20px_-6px_rgba(230,126,0,0.55)] transition-all hover:brightness-105 active:scale-[0.98]"
          >
            <Lock className="size-4" strokeWidth={2.4} aria-hidden />
            Unlock Tier
          </Link>
        </div>
      )}
    </motion.article>
  )
}
