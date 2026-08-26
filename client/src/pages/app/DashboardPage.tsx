import { useEffect, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'
import { Link } from 'react-router'
import {
  ArrowRight,
  Award,
} from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { TierBadge, type Tier } from '@/components/app/TierBadge'
import { useDashboard, useWallet } from '@/hooks/queries'
import { useAuth } from '@/auth/AuthContext'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

/* ── Motion variants ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

/* ── Helpers ── */
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

/* ── Count-up hook (Framer Motion, off the render cycle) ── */
function useCountUp(target: number | null) {
  const mv = useMotionValue(0)
  // Format the motion value as INR using useTransform
  const formatted = useTransform(mv, (v) => inr(Math.round(v)))
  const prevTarget = useRef<number | null>(null)

  useEffect(() => {
    if (target === null) return
    if (prevTarget.current === target) return
    prevTarget.current = target
    const controls = animate(mv, target, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
    })
    return () => controls.stop()
  }, [mv, target])

  return { mv, formatted }
}

/* ── Portfolio hero card ── */
function PortfolioHeroCard({ totalValue, isLoading }: { totalValue: number | null; isLoading: boolean }) {
  const { formatted } = useCountUp(isLoading ? null : (totalValue ?? 0))

  return (
    <motion.section
      variants={fadeUp}
      aria-label="Portfolio total value"
      aria-live="polite"
      className="relative overflow-hidden rounded-2xl px-5 py-6"
      style={{
        background: 'linear-gradient(135deg, #102A5C 0%, #1A4FCC 60%, #0B4FD8 100%)',
        boxShadow: '0 8px 32px -8px rgba(16, 42, 92, 0.45)',
      }}
    >
      {/* Radial highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 80% 15%, rgba(100, 160, 255, 0.28) 0%, transparent 60%)',
        }}
      />
      <div className="relative flex flex-col gap-1">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-blue-200/70">
          Total Portfolio Value
        </span>
        {isLoading ? (
          <span className="mt-1 h-10 w-44 animate-pulse rounded-lg bg-white/10" />
        ) : (
          <motion.span
            className="font-mono tabular-nums leading-none text-white"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 3rem)', fontWeight: 800 }}
          >
            {formatted}
          </motion.span>
        )}
        <p className="mt-1 text-[11px] text-blue-200/60">Principal + expected returns</p>
      </div>
    </motion.section>
  )
}

/* ── Secondary 3-column stats row ── */
interface StatPillProps {
  label: string
  value: string | number | null
  index: number
}
function StatPill({ label, value, index }: StatPillProps) {
  return (
    <div
      className="flex flex-col gap-1 rounded-2xl border border-asm-line bg-white p-3 text-center shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]"
      style={{ '--i': index } as React.CSSProperties}
    >
      <span className="font-mono text-[14px] font-bold tabular-nums leading-none text-asm-navy">
        {value !== null ? value : '—'}
      </span>
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">{label}</span>
    </div>
  )
}

/* ── Staggered skeleton cards ── */
function SkeletonHero() {
  return (
    <div
      className="animate-pulse rounded-2xl px-5 py-6"
      style={{
        background: 'linear-gradient(135deg, #102A5C 0%, #1A4FCC 60%, #0B4FD8 100%)',
        '--i': 0,
        animationDelay: 'calc(var(--i) * 120ms)',
      } as React.CSSProperties}
    >
      <span className="mb-2 block h-3 w-28 rounded bg-white/15" />
      <span className="block h-10 w-44 rounded-lg bg-white/10" />
      <span className="mt-2 block h-3 w-36 rounded bg-white/10" />
    </div>
  )
}

function SkeletonStatPill({ index }: { index: number }) {
  return (
    <div
      className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white p-3 animate-pulse"
      style={{
        '--i': index,
        animationDelay: 'calc(var(--i) * 120ms)',
      } as React.CSSProperties}
    >
      <span className="h-5 w-12 rounded bg-asm-tint" />
      <span className="h-3 w-10 rounded bg-asm-tint" />
    </div>
  )
}

function SkeletonInvestment({ index }: { index: number }) {
  return (
    <div
      className="flex items-center gap-3 rounded-2xl border border-asm-line bg-white px-4 py-3.5 animate-pulse"
      style={{
        '--i': index,
        animationDelay: 'calc(var(--i) * 120ms)',
      } as React.CSSProperties}
    >
      <span className="size-11 shrink-0 rounded-xl bg-asm-tint" />
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="h-3.5 w-24 rounded bg-asm-tint" />
        <span className="h-3 w-32 rounded bg-asm-tint" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className="h-4 w-16 rounded bg-asm-tint" />
        <span className="h-3 w-12 rounded bg-asm-tint" />
      </div>
    </div>
  )
}

/* ── Page ── */
export function DashboardPage() {
  const { user } = useAuth()
  const dashQuery  = useDashboard()
  const walletQuery = useWallet()

  const dash          = dashQuery.data
  const walletBalance = walletQuery.data?.balance ?? null

  // Prefer wallet balance; fall back to dashboard balance
  const displayBalance = walletBalance ?? dash?.balance ?? null
  const tier           = dash?.tier ?? user?.tier ?? null
  const totalInvested  = dash?.totals.invested ?? null
  const expectedReturn = dash?.totals.expectedReturn ?? null
  const activeCount    = dash?.totals.activeCount ?? null
  const activeInvests  = dash?.activeInvestments ?? []

  // Total current value = principal + expected returns
  const totalValue = (totalInvested !== null && expectedReturn !== null)
    ? totalInvested + expectedReturn
    : totalInvested ?? null

  const firstName = (user?.name ?? 'Investor').split(' ')[0]

  const isLoading = dashQuery.isLoading
  const isError   = dashQuery.isError

  return (
    <AppShell headerVariant="root" width="wide">
      <motion.div
        className="flex flex-col gap-5"
        variants={container}
        initial="hidden"
        animate="visible"
      >

        {/* ── Greeting ── */}
        <motion.div variants={fadeUp}>
          <p className="text-[13px] text-asm-muted">Welcome back,</p>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-asm-navy">
            {firstName} {tier && <span className="capitalize text-asm-blue">· {tier}</span>}
          </h1>
        </motion.div>

        {/* ── Wallet balance hero (tier-themed) ── */}
        {(() => {
          const TIER_CARD: Record<string, { bg: string; radial: string; labelColor: string; valueColor: string; memberColor: string; shadow: string }> = {
            silver: {
              bg:          'linear-gradient(135deg, #3D4F6B 0%, #5A6E8A 50%, #2C3D55 100%)',
              radial:      'radial-gradient(ellipse at 80% 15%, rgba(192,210,230,0.30) 0%, transparent 60%)',
              labelColor:  'rgba(220,232,245,0.65)',
              valueColor:  '#FFFFFF',
              memberColor: 'rgba(210,225,240,0.80)',
              shadow:      '0_8px_32px_-8px_rgba(60,80,110,0.45)',
            },
            gold: {
              bg:          'linear-gradient(135deg, #7A4F10 0%, #C17F2A 50%, #5C3A0A 100%)',
              radial:      'radial-gradient(ellipse at 80% 15%, rgba(255,215,100,0.35) 0%, transparent 60%)',
              labelColor:  'rgba(255,224,130,0.70)',
              valueColor:  '#FFF8E7',
              memberColor: 'rgba(255,220,120,0.85)',
              shadow:      '0_8px_32px_-8px_rgba(120,80,10,0.50)',
            },
            diamond: {
              bg:          'linear-gradient(135deg, #0B2A6B 0%, #1A4FCC 50%, #061840 100%)',
              radial:      'radial-gradient(ellipse at 80% 15%, rgba(100,180,255,0.35) 0%, transparent 60%)',
              labelColor:  'rgba(180,210,255,0.65)',
              valueColor:  '#FFFFFF',
              memberColor: 'rgba(160,200,255,0.85)',
              shadow:      '0_8px_32px_-8px_rgba(11,79,216,0.45)',
            },
          }
          const card = TIER_CARD[tier as string] ?? TIER_CARD.diamond
          return (
            <motion.section
              variants={fadeUp}
              aria-label="Wallet balance"
              aria-live="polite"
              className="relative overflow-hidden rounded-2xl px-5 py-5"
              style={{ background: card.bg, boxShadow: card.shadow.replace(/_/g, ' ') }}
            >
              <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: card.radial }} />
              <div className="relative flex flex-col gap-1">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: card.labelColor }}>
                  Wallet Balance
                </span>
                {isLoading ? (
                  <span className="mt-1 h-9 w-40 animate-pulse rounded-lg bg-white/10" />
                ) : (
                  <span className="font-mono text-[36px] font-extrabold tabular-nums leading-none" style={{ color: card.valueColor }}>
                    {displayBalance !== null ? inr(displayBalance) : '—'}
                  </span>
                )}
                {tier && (
                  <div className="mt-4 flex items-center gap-2.5">
                    <TierBadge tier={tier as Tier} size={28} />
                    <span className="text-[12px] font-semibold capitalize" style={{ color: card.memberColor }}>
                      {tier} Member
                    </span>
                  </div>
                )}
              </div>
            </motion.section>
          )
        })()}

        {/* ── Portfolio overview ── */}
        <motion.section variants={fadeUp} aria-label="Portfolio overview" aria-live="polite">
          <h2 className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
            Overview
          </h2>
          {isError ? (
            <div className="rounded-2xl border border-asm-line bg-white p-5 text-center">
              <p className="text-[13px] font-semibold text-asm-navy">Couldn't load dashboard</p>
              <p className="mt-1 text-[12px] text-asm-body">Check your connection and try again.</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col gap-3">
              <SkeletonHero />
              <div className="grid grid-cols-3 gap-2.5">
                <SkeletonStatPill index={1} />
                <SkeletonStatPill index={2} />
                <SkeletonStatPill index={3} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Portfolio hero card */}
              <PortfolioHeroCard totalValue={totalValue} isLoading={isLoading} />

              {/* 3-column secondary stats */}
              <div className="grid grid-cols-3 gap-2.5">
                <StatPill
                  label="Invested"
                  value={totalInvested !== null ? inr(totalInvested) : null}
                  index={0}
                />
                <StatPill
                  label="Returns"
                  value={expectedReturn !== null ? inr(expectedReturn) : null}
                  index={1}
                />
                <StatPill
                  label="Active Plans"
                  value={activeCount}
                  index={2}
                />
              </div>
            </div>
          )}
        </motion.section>

        {/* ── Active investments ── */}
        <motion.section variants={fadeUp} aria-labelledby="investments-heading" aria-live="polite">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2
              id="investments-heading"
              className="text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted"
            >
              Active Investments
            </h2>
            <Link
              to="/app/invest"
              className="-my-1 -mr-1 inline-flex min-h-[40px] items-center gap-0.5 rounded px-1.5 text-[11px] font-semibold text-asm-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1"
            >
              Plans <ArrowRight className="size-3" strokeWidth={2.5} aria-hidden />
            </Link>
          </div>

          <div className="flex flex-col gap-2.5">
            {isLoading ? (
              <>
                <SkeletonInvestment index={0} />
                <SkeletonInvestment index={1} />
              </>
            ) : isError ? null : activeInvests.length === 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-asm-line bg-white px-5 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-asm-tint">
                  <Award className="size-5 text-asm-muted" aria-hidden />
                </span>
                <p className="text-[13px] font-semibold text-asm-navy">No active investments yet</p>
                <p className="text-[12px] text-asm-body">Start growing your wealth today.</p>
                <Link
                  to="/app/invest"
                  className={cn(
                    'mt-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-asm-blue px-4 py-2.5',
                    'text-[12px] font-bold uppercase tracking-[0.06em] text-white',
                    'transition-colors hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2'
                  )}
                >
                  Browse Plans
                </Link>
              </div>
            ) : (
              activeInvests.map((inv) => {
                const planTier = inv.planKey as Tier
                const matLabel = maturityLabel(inv.maturesAt)
                const profit   = inv.expectedReturn - inv.amount

                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 rounded-2xl border border-asm-line bg-white px-4 py-3.5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]"
                  >
                    <TierBadge tier={planTier} size={44} className="shrink-0" />

                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[13px] font-bold capitalize text-asm-navy">{planTier} Plan</span>
                      {matLabel && (
                        <span className="text-[11px] text-asm-muted">{matLabel}</span>
                      )}
                      <span className="text-[11px] text-asm-muted">
                        Invested: <span className="font-semibold text-asm-navy">{inr(inv.amount)}</span>
                      </span>
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-0.5">
                      <span className="font-mono text-[14px] font-bold tabular-nums text-asm-greenInk">
                        {inr(inv.expectedReturn)}
                      </span>
                      <span className="text-[10px] font-semibold text-asm-greenInk">
                        +{inr(profit)} profit
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </motion.section>

      </motion.div>
    </AppShell>
  )
}
