import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router'
import {
  Award,
  CheckCircle2,
  Clock,
  TrendingUp,
  XCircle,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { TierBadge, type Tier } from '@/components/app/TierBadge'
import { useInvestments } from '@/hooks/queries'
import type { Investment } from '@/services/api/investments'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

/* ── Motion ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100, damping: 20 } },
}

/* ── Tabs ── */
type Tab = 'all' | 'pending' | 'active' | 'returned' | 'rejected'

const TABS: { id: Tab; label: string }[] = [
  { id: 'all',      label: 'All'      },
  { id: 'pending',  label: 'Pending'  },
  { id: 'active',   label: 'Active'   },
  { id: 'returned', label: 'Returned' },
  { id: 'rejected', label: 'Rejected' },
]

function matchesTab(inv: Investment, tab: Tab): boolean {
  if (tab === 'all') return true
  if (tab === 'active')   return inv.status === 'active' || inv.status === 'matured'
  if (tab === 'returned') return inv.status === 'returned'
  return inv.status === tab
}

/* ── Status pill ── */
const STATUS_CONFIG: Record<
  Investment['status'],
  { label: string; icon: typeof Clock; cls: string; iconCls: string }
> = {
  pending:  { label: 'Pending',        icon: Clock,         cls: 'bg-amber-50 text-amber-700 border-amber-200',      iconCls: 'text-amber-500'  },
  active:   { label: 'Active',         icon: TrendingUp,    cls: 'bg-asm-green-tint text-asm-greenInk border-[#1FA855]/25', iconCls: 'text-asm-greenInk' },
  matured:  { label: 'Matured',        icon: AlertCircle,   cls: 'bg-asm-blue-tint text-asm-blue border-asm-blue/20', iconCls: 'text-asm-blue'   },
  returned: { label: 'Returned',       icon: CheckCircle2,  cls: 'bg-asm-green-tint text-asm-greenInk border-[#1FA855]/25', iconCls: 'text-asm-greenInk' },
  rejected: { label: 'Rejected',       icon: XCircle,       cls: 'bg-red-50 text-red-700 border-red-200',             iconCls: 'text-red-500'    },
  // Deleted cycles are filtered out server-side and never reach the user — this
  // entry exists only to satisfy the status map's exhaustiveness.
  deleted:          { label: 'Removed',        icon: XCircle,       cls: 'bg-zinc-100 text-zinc-500 border-zinc-200',         iconCls: 'text-zinc-400'   },
  break_requested:  { label: 'Break Requested', icon: Clock,         cls: 'bg-orange-50 text-orange-700 border-orange-200',    iconCls: 'text-orange-500'  },
}

function StatusPill({ status }: { status: Investment['status'] }) {
  const { label, icon: Icon, cls, iconCls } = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em]', cls)}>
      <Icon className={cn('size-2.5', iconCls)} strokeWidth={2.5} aria-hidden />
      {label}
    </span>
  )
}

/* ── Skeleton ── */
function Skeleton() {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-asm-line bg-white p-4">
      <div className="flex items-center gap-3">
        <span className="skeleton size-11 shrink-0 rounded-xl" />
        <div className="flex flex-1 flex-col gap-1.5">
          <span className="skeleton h-3.5 w-28" />
          <span className="skeleton h-3 w-20" />
        </div>
        <span className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="h-px bg-asm-line" />
      <div className="grid grid-cols-3 gap-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-1">
            <span className="skeleton h-2.5 w-12" />
            <span className="skeleton h-3.5 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Investment card ── */
function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function InvestmentCard({ inv }: { inv: Investment }) {
  const tier = inv.planKey as Tier
  const creditedAmount = inv.creditedAmount

  return (
    <motion.div
      variants={fadeUp}
      className="elevate flex flex-col gap-3 rounded-2xl border border-asm-line bg-white p-4 shadow-card"
    >
      {/* Header row */}
      <div className="flex items-center gap-3">
        <TierBadge tier={tier} size={44} className="shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[14px] font-extrabold capitalize leading-tight text-asm-navy">
            {tier} Plan
          </span>
          <span className="font-mono text-[10px] text-asm-muted">{inv.referenceCode}</span>
        </div>
        <StatusPill status={inv.status} />
      </div>

      <div className="h-px bg-asm-line" />

      {/* Metrics row */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-asm-muted">Invested</span>
          <span className="font-mono text-[13px] font-bold tabular-nums text-asm-navy">{inr(inv.amount)}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-asm-muted">
            {inv.status === 'returned' ? 'Credited' : 'Expected'}
          </span>
          <span className={cn('font-mono text-[13px] font-bold tabular-nums', inv.status === 'returned' ? 'text-asm-greenInk' : 'text-asm-navy')}>
            {inv.status === 'returned' && creditedAmount !== undefined
              ? inr(creditedAmount)
              : inr(inv.expectedReturn)}
          </span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-asm-muted">Return</span>
          <span className="font-mono text-[13px] font-bold tabular-nums text-asm-greenInk">
            +{inv.returnPct}%
          </span>
        </div>
      </div>

      {/* Date row */}
      <div className="flex items-center justify-between rounded-xl bg-asm-tint px-3 py-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-asm-muted">Submitted</span>
          <span className="text-[11px] font-semibold text-asm-navy">{formatDate(inv.createdAt)}</span>
        </div>
        {(inv.status === 'active' || inv.status === 'matured') && inv.maturesAt && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-asm-muted">Matures</span>
            <span className="text-[11px] font-semibold text-asm-navy">{formatDate(inv.maturesAt)}</span>
          </div>
        )}
        {inv.status === 'returned' && inv.returnedAt && (
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[9px] font-bold uppercase tracking-[0.07em] text-asm-muted">Returned</span>
            <span className="text-[11px] font-semibold text-asm-greenInk">{formatDate(inv.returnedAt)}</span>
          </div>
        )}
      </div>
    </motion.div>
  )
}

/* ── Empty state ── */
function Empty({ tab }: { tab: Tab }) {
  const messages: Record<Tab, { title: string; body: string }> = {
    all:      { title: 'No investments yet',    body: 'Make your first deposit to start growing your portfolio.' },
    pending:  { title: 'No pending deposits',   body: 'All caught up — no investments awaiting approval.'       },
    active:   { title: 'No active investments', body: 'Active plans will appear here once approved.'            },
    returned: { title: 'No returned funds yet', body: 'Completed investments will show here.'                   },
    rejected: { title: 'No rejected deposits',  body: 'Rejected investments will appear here.'                  },
  }
  const { title, body } = messages[tab]
  return (
    <motion.div
      variants={fadeUp}
      className="flex flex-col items-center gap-3 rounded-2xl border border-asm-line bg-white px-5 py-12 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-asm-tint">
        <Award className="size-5 text-asm-muted" aria-hidden />
      </span>
      <p className="text-[14px] font-extrabold text-asm-navy">{title}</p>
      <p className="text-[12px] leading-relaxed text-asm-body">{body}</p>
      {tab === 'all' && (
        <Link
          to="/app/invest"
          className={cn(
            'mt-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-asm-blue px-5 py-2.5',
            'text-[12px] font-bold uppercase tracking-[0.06em] text-white',
            'transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
          )}
        >
          Browse Plans
          <ChevronRight className="size-4" strokeWidth={2.5} aria-hidden />
        </Link>
      )}
    </motion.div>
  )
}

/* ── Page ── */
export function InvestmentsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('all')
  const { data: investments, isLoading, isError } = useInvestments()

  const counts: Record<Tab, number> = {
    all:      investments?.length ?? 0,
    pending:  investments?.filter((i) => i.status === 'pending').length ?? 0,
    active:   investments?.filter((i) => i.status === 'active' || i.status === 'matured').length ?? 0,
    returned: investments?.filter((i) => i.status === 'returned').length ?? 0,
    rejected: investments?.filter((i) => i.status === 'rejected').length ?? 0,
  }

  const filtered = (investments ?? [])
    .filter((inv) => matchesTab(inv, activeTab))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  return (
    <AppShell contentClassName="px-5">
      <motion.div className="flex flex-col gap-5" variants={container} initial="hidden" animate="visible">

        {/* ── Header ── */}
        <motion.div variants={fadeUp}>
          <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-asm-navy">
            My Investments
          </h1>
          <p className="mt-0.5 text-[13px] text-asm-muted">
            Track all your deposits and returns in one place.
          </p>
        </motion.div>

        {/* ── Tabs ── */}
        <motion.div variants={fadeUp} className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {TABS.map(({ id, label }) => {
            const count = counts[id]
            if (id !== 'all' && !isLoading && count === 0 && id === 'rejected') return null
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
                  activeTab === id
                    ? 'bg-asm-blue text-white shadow-[0_2px_8px_-2px_rgba(11,79,216,0.4)]'
                    : 'bg-white border border-asm-muted/30 text-asm-body hover:border-asm-blue/50 hover:text-asm-navy',
                )}
              >
                {label}
                {!isLoading && count > 0 && (
                  <span
                    className={cn(
                      'flex size-4 items-center justify-center rounded-full text-[9px] font-extrabold',
                      activeTab === id ? 'bg-white/25 text-white' : 'bg-asm-tint text-asm-navy',
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </motion.div>

        {/* ── Content ── */}
        {isError ? (
          <motion.div
            variants={fadeUp}
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <XCircle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden />
            <div>
              <p className="text-[13px] font-bold text-red-700">Couldn't load investments</p>
              <p className="text-[12px] text-red-600">Check your connection and try again.</p>
            </div>
          </motion.div>
        ) : isLoading ? (
          <motion.div variants={fadeUp} className="flex flex-col gap-3">
            <Skeleton />
            <Skeleton />
            <Skeleton />
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              variants={container}
              initial="hidden"
              animate="visible"
              className="flex flex-col gap-3"
            >
              {filtered.length === 0
                ? <Empty tab={activeTab} />
                : filtered.map((inv) => <InvestmentCard key={inv._id} inv={inv} />)
              }
            </motion.div>
          </AnimatePresence>
        )}

      </motion.div>
    </AppShell>
  )
}
