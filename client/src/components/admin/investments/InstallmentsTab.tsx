import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight } from 'lucide-react'
import {
  useApproveInstallment,
  useRejectInstallment,
  useApproveBreak,
  useRejectBreak,
} from '@/hooks/queries'
import type { AdminInvestment } from '@/services/api/admin'
import type { Installment } from '@/services/api/investments'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { AdminButton } from '@/components/admin/AdminButton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { InvestmentCountdown } from '@/components/admin/InvestmentCountdown'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { fmt } from './helpers'

interface Props {
  data: AdminInvestment[] | undefined
  isLoading: boolean
  isError: boolean
}

type InstallmentRow = {
  inv: AdminInvestment
  day: number
  amount: number
  /** When this day's payout became due — the queue is ordered by it. */
  maturesAt: string
  /** Lowest earlier day still undecided, if any. Approving out of order is legal
   *  but almost always a mistake, so the row is flagged instead of hidden. */
  blockedByDay: number | null
}

/**
 * How long a day's return has been sitting unapproved. Days become 'available'
 * on their own 24h timer regardless of whether earlier days were paid, so a
 * quiet week leaves several days of one investment queued at once — this is the
 * number that tells the admin which of them is actually the most overdue.
 */
function overdueLabel(maturesAt: string): string {
  const ms = Date.now() - new Date(maturesAt).getTime()
  if (ms < 0) return 'Not due yet'
  const mins = Math.floor(ms / 60000)
  if (mins < 60) return `${mins}m overdue`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h overdue`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h overdue`
}

/* ── Reject installment dialog (reason required + optional partial credit) ── */

function makeRejectInstallmentSchema(maxRupees: number) {
  return z.object({
    reason: z.string().min(1, 'Reason is required'),
    amountRupees: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .min(0, 'Amount must be at least ₹0')
      .max(maxRupees, `Amount must not exceed ${inr(maxRupees * 100)}`),
  })
}

type RejectInstallmentForm = z.infer<ReturnType<typeof makeRejectInstallmentSchema>>

function RejectInstallmentDialog({
  row,
  isPending,
  onConfirm,
  onCancel,
}: {
  row: InstallmentRow
  isPending: boolean
  onConfirm: (reason: string, amountPaise: number) => void
  onCancel: () => void
}) {
  const maxRupees = Math.floor(row.amount / 100)
  const schema = makeRejectInstallmentSchema(maxRupees)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectInstallmentForm>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '', amountRupees: 0 },
  })

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"
      onClick={() => !isPending && onCancel()}
    >
      <div
        className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-asm-line bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-[15px] font-bold text-asm-navy">Reject Day {row.day} return?</h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Decline the <strong className="font-semibold text-asm-navy">{inr(row.amount)}</strong> Day {row.day} return for{' '}
          <strong className="font-semibold text-asm-navy">{row.inv.user.name}</strong>. The remaining days keep running on
          their own timers; the principal is returned once every day has been decided.
        </p>

        <form onSubmit={handleSubmit((v) => onConfirm(v.reason, Math.round(v.amountRupees * 100)))} className="mt-4 space-y-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">Reason *</span>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Why is this day's return being declined…"
              aria-invalid={!!errors.reason}
              className={cn(
                'mt-1.5 w-full resize-none rounded-lg border bg-asm-tint px-3 py-2 text-[13px] text-asm-navy',
                'placeholder:text-asm-muted focus:outline-none focus:ring-2 focus:ring-offset-1',
                errors.reason ? 'border-asm-red focus:ring-asm-red' : 'border-asm-line focus:border-asm-blue focus:ring-asm-blue',
              )}
            />
            {errors.reason && <p className="mt-1 text-[11px] text-asm-red">{errors.reason.message}</p>}
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
              Partial credit (rupees)
            </span>
            <input
              type="number"
              step="1"
              {...register('amountRupees', { valueAsNumber: true })}
              aria-invalid={!!errors.amountRupees}
              className={cn(
                'mt-1.5 w-full rounded-lg border bg-asm-tint px-3 py-2 font-mono text-[13px] tabular-nums text-asm-navy',
                'focus:outline-none focus:ring-2 focus:ring-offset-1',
                errors.amountRupees ? 'border-asm-red focus:ring-asm-red' : 'border-asm-line focus:border-asm-blue focus:ring-asm-blue',
              )}
            />
            {errors.amountRupees && <p className="mt-1 text-[11px] text-asm-red">{errors.amountRupees.message}</p>}
            <p className="mt-1 text-[11px] text-asm-muted">0 = credit nothing; max {inr(row.amount)} (this day's return).</p>
          </label>

          <div className="flex justify-end gap-2.5">
            <AdminButton variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="danger" size="sm" disabled={isPending}>
              {isPending ? 'Rejecting…' : `Reject Day ${row.day}`}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Per-installment status pip ────────────────────────────────────────────────

function InstallmentPip({ inst }: { inst: Installment }) {
  const isScheduled = inst.status === 'scheduled'
  const isAvailable = inst.status === 'available'
  const isPaid = inst.status === 'paid'
  const isRejected = inst.status === 'rejected'

  return (
    <div className="flex flex-col items-center gap-1 min-w-[90px]">
      {/* Dot */}
      <div
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          isPaid && 'bg-asm-greenInk',
          isAvailable && 'bg-asm-blue animate-pulse',
          isScheduled && 'bg-asm-line',
          isRejected && 'bg-asm-red',
        )}
      />
      {/* Label */}
      <span
        className={cn(
          'text-[11px] font-semibold',
          isPaid && 'text-asm-greenInk',
          isAvailable && 'text-asm-blue',
          isScheduled && 'text-asm-muted',
          isRejected && 'text-asm-red',
        )}
      >
        Day {inst.day}
        {isPaid && ' ✓'}
        {isAvailable && ' Ready'}
        {isRejected && ' ✕'}
      </span>
      {/* Amount */}
      <span className="font-mono text-[11px] tabular-nums text-asm-navy">{inr(inst.amount)}</span>
      {/* Countdown / date */}
      {isScheduled && (
        <span className="font-mono text-[10px] tabular-nums text-asm-muted">
          <InvestmentCountdown maturesAt={inst.maturesAt} expiredLabel="Due now" />
        </span>
      )}
      {isAvailable && (
        <span className="text-[10px] font-medium text-asm-blue">{overdueLabel(inst.maturesAt)}</span>
      )}
      {isPaid && inst.creditedAt && (
        <span className="text-[10px] text-asm-muted">{fmt(inst.creditedAt)}</span>
      )}
      {isRejected && (
        <span className="max-w-[110px] truncate text-[10px] text-asm-red" title={inst.rejectionReason || undefined}>
          {inst.rejectionReason || 'Declined'}
        </span>
      )}
    </div>
  )
}

// ── Running investments card list ─────────────────────────────────────────────

function RunningInvestmentCard({
  inv,
  expanded,
  onToggle,
}: {
  inv: AdminInvestment
  expanded: boolean
  onToggle: () => void
}) {
  const installments = inv.installments ?? []
  const paidCount = installments.filter((i) => i.status === 'paid').length
  const rejectedCount = installments.filter((i) => i.status === 'rejected').length
  const readyCount = installments.filter((i) => i.status === 'available').length

  return (
    <div className="rounded-xl border border-asm-line bg-white shadow-sm">
      {/* Compact header — click to expand/collapse the day timeline. Collapsed by
         default so the admin can scan many investments without endless scrolling. */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <ChevronRight
            className={cn('size-4 shrink-0 text-asm-muted transition-transform', expanded && 'rotate-90')}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-asm-navy">{inv.user.name}</p>
            <p className="truncate text-[11px] text-asm-muted">{inv.user.email}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
            {inv.planKey}
          </span>
          <span className="hidden font-mono text-[12px] tabular-nums text-asm-body sm:inline">
            {inr(inv.amount)}
          </span>
          {readyCount > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-asm-blue/10 px-2 py-0.5 text-[10px] font-bold text-asm-blue">
              <span className="h-1.5 w-1.5 rounded-full bg-asm-blue" />
              {readyCount} ready
            </span>
          )}
          {rejectedCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-asm-red/10 px-2 py-0.5 text-[10px] font-bold text-asm-red">
              {rejectedCount} rejected
            </span>
          )}
          <span className="rounded-full bg-asm-tint px-2 py-0.5 text-[11px] text-asm-muted">
            {paidCount}/{installments.length} paid
          </span>
        </div>
      </button>

      {/* Day timeline — rendered only when the card is expanded */}
      {expanded && (
        <div className="border-t border-asm-line px-4 pb-4 pt-3">
          <div className="flex flex-wrap items-start gap-6">
            {installments.map((inst, idx) => (
              <div key={inst.day} className="flex items-start gap-6">
                <InstallmentPip inst={inst} />
                {idx < installments.length - 1 && (
                  <div className="mt-1 h-px w-8 self-center bg-asm-line" />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 font-mono text-[10px] text-asm-muted">{inv.referenceCode}</p>
        </div>
      )}
    </div>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function InstallmentsTab({ data, isLoading, isError }: Props) {
  const approveInstallment = useApproveInstallment()
  const rejectInstallment = useRejectInstallment()
  const approveBreak = useApproveBreak()
  const rejectBreak = useRejectBreak()

  const [approvingInstallment, setApprovingInstallment] = useState<InstallmentRow | null>(null)
  const [rejectingInstallment, setRejectingInstallment] = useState<InstallmentRow | null>(null)
  const [approvingBreakId, setApprovingBreakId] = useState<string | null>(null)
  const [rejectingBreakId, setRejectingBreakId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  // Running cards are collapsed by default; the admin expands only the ones they
  // want to inspect. Tracks the set of expanded investment ids.
  const [expandedCardIds, setExpandedCardIds] = useState<Set<string>>(new Set())

  // Bucket investments into three groups:
  // 1. pendingInstallments — installments that are 'available' (ready to pay out now)
  // 2. runningInvestments  — active installment-plan investments (all days shown for visibility)
  // 3. breakRequests       — user-requested early exits
  const pendingInstallments: InstallmentRow[] = []
  const runningInvestments: AdminInvestment[] = []
  const breakRequests: AdminInvestment[] = []

  for (const inv of data ?? []) {
    if (inv.status === 'break_requested') {
      breakRequests.push(inv)
    } else if (inv.status === 'active' && inv.installments?.length) {
      // Always show the full card in "Running" so admin can see the timeline.
      runningInvestments.push(inv)
      // Also surface individual days that are ready for approval. Days go
      // 'available' on independent 24h timers, so one investment can have
      // several days queued at once — flag any whose earlier day is still
      // undecided so they aren't paid out of order.
      const byDay = [...inv.installments].sort((a, b) => a.day - b.day)
      for (const inst of byDay) {
        if (inst.status !== 'available') continue
        const earlierUndecided = byDay.find(
          (i) => i.day < inst.day && i.status !== 'paid' && i.status !== 'rejected',
        )
        pendingInstallments.push({
          inv,
          day: inst.day,
          amount: inst.amount,
          maturesAt: inst.maturesAt,
          blockedByDay: earlierUndecided ? earlierUndecided.day : null,
        })
      }
    }
  }

  // Order the approval queue by how long each day has been waiting (oldest first)
  // rather than by investment creation date. Without this the table interleaves
  // Day 1s and Day 2s by user, which reads as random and buries the most overdue
  // payouts partway down the list.
  pendingInstallments.sort(
    (a, b) => new Date(a.maturesAt).getTime() - new Date(b.maturesAt).getTime(),
  )

  const approvingBreakInv = breakRequests.find((inv) => inv._id === approvingBreakId) ?? null
  const rejectingBreakInv = breakRequests.find((inv) => inv._id === rejectingBreakId) ?? null

  const allRunningExpanded =
    runningInvestments.length > 0 && runningInvestments.every((inv) => expandedCardIds.has(inv._id))
  function toggleCard(id: string) {
    setExpandedCardIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAllRunning() {
    setExpandedCardIds(allRunningExpanded ? new Set() : new Set(runningInvestments.map((inv) => inv._id)))
  }

  function handleApproveInstallment() {
    if (!approvingInstallment) return
    approveInstallment.mutate([approvingInstallment.inv._id, approvingInstallment.day], {
      onSuccess: () => {
        setStatusMsg(`Day ${approvingInstallment.day} return approved for ${approvingInstallment.inv.user.name}.`)
        setApprovingInstallment(null)
      },
      onError: () => {
        setStatusMsg('Failed to approve installment.')
        setApprovingInstallment(null)
      },
    })
  }

  function handleRejectInstallment(reason: string, amountPaise: number) {
    if (!rejectingInstallment) return
    const { inv, day } = rejectingInstallment
    rejectInstallment.mutate([inv._id, day, { reason, amount: amountPaise }], {
      onSuccess: () => {
        setStatusMsg(
          amountPaise > 0
            ? `Day ${day} rejected for ${inv.user.name} — ${inr(amountPaise)} credited as a partial return.`
            : `Day ${day} rejected for ${inv.user.name}. Nothing credited.`,
        )
        setRejectingInstallment(null)
      },
      onError: () => {
        setStatusMsg('Failed to reject installment.')
        setRejectingInstallment(null)
      },
    })
  }

  function handleApproveBreak() {
    if (!approvingBreakId) return
    approveBreak.mutate([approvingBreakId], {
      onSuccess: () => {
        setStatusMsg('Break approved. Principal + accrued profit credited to user wallet.')
        setApprovingBreakId(null)
      },
      onError: () => {
        setStatusMsg('Failed to approve break.')
        setApprovingBreakId(null)
      },
    })
  }

  function handleRejectBreak() {
    if (!rejectingBreakId) return
    rejectBreak.mutate([rejectingBreakId], {
      onSuccess: () => {
        setStatusMsg('Break request rejected. Investment continues normally.')
        setRejectingBreakId(null)
      },
      onError: () => {
        setStatusMsg('Failed to reject break.')
        setRejectingBreakId(null)
      },
    })
  }

  const installmentColumns: Column<InstallmentRow>[] = [
    {
      key: 'user',
      header: 'User',
      render: (r) => (
        <>
          <p className="font-medium text-asm-navy">{r.inv.user.name}</p>
          <p className="text-[11px] text-asm-muted">{r.inv.user.email}</p>
        </>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (r) => (
        <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
          {r.inv.planKey}
        </span>
      ),
    },
    {
      key: 'ref',
      header: 'Reference',
      className: 'font-mono text-[11px] text-asm-body',
      render: (r) => r.inv.referenceCode,
    },
    {
      key: 'day',
      header: 'Day',
      render: (r) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-asm-navy">
            Day {r.day} of {r.inv.installments?.length ?? 3}
          </span>
          {r.blockedByDay !== null && (
            <span
              className="inline-flex w-fit items-center rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
              title={`Day ${r.blockedByDay} of this investment has not been paid or rejected yet`}
            >
              Day {r.blockedByDay} still open
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'waiting',
      header: 'Waiting',
      render: (r) => (
        <span className="whitespace-nowrap font-mono text-[11px] tabular-nums text-asm-muted">
          {overdueLabel(r.maturesAt)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Return Amount',
      align: 'right',
      className: 'font-mono tabular-nums font-semibold text-asm-greenInk',
      render: (r) => inr(r.amount),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <AdminButton
            size="sm"
            variant="success"
            onClick={() => setApprovingInstallment(r)}
            disabled={approveInstallment.isPending || rejectInstallment.isPending}
          >
            Approve Day {r.day}
          </AdminButton>
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => setRejectingInstallment(r)}
            disabled={approveInstallment.isPending || rejectInstallment.isPending}
          >
            <span className="text-asm-red">Reject</span>
          </AdminButton>
        </div>
      ),
    },
  ]

  const breakColumns: Column<AdminInvestment>[] = [
    {
      key: 'user',
      header: 'User',
      render: (inv) => (
        <>
          <p className="font-medium text-asm-navy">{inv.user.name}</p>
          <p className="text-[11px] text-asm-muted">{inv.user.email}</p>
        </>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (inv) => (
        <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
          {inv.planKey}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Invested',
      align: 'right',
      className: 'font-mono tabular-nums text-asm-navy',
      render: (inv) => inr(inv.amount),
    },
    {
      key: 'requestedAt',
      header: 'Requested',
      render: (inv) => (
        <span className="text-[12px] text-asm-body">
          {inv.breakRequestedAt ? fmt(inv.breakRequestedAt) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (inv) => (
        <div className="flex justify-end gap-2">
          <AdminButton
            size="sm"
            variant="success"
            onClick={() => setApprovingBreakId(inv._id)}
            disabled={approveBreak.isPending || rejectBreak.isPending}
          >
            Approve Break
          </AdminButton>
          <AdminButton
            size="sm"
            variant="outline"
            onClick={() => setRejectingBreakId(inv._id)}
            disabled={approveBreak.isPending || rejectBreak.isPending}
          >
            <span className="text-asm-red">Reject</span>
          </AdminButton>
        </div>
      ),
    },
  ]

  return (
    <>
      <StatusBanner message={statusMsg} />

      <div className="space-y-8">
        {/* ── 1. Ready to pay out ─────────────────────────────────────────── */}
        {pendingInstallments.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-asm-navy">
              Ready to Approve
              <span className="ml-2 rounded-full bg-asm-blue px-2 py-0.5 text-[10px] font-bold text-white">
                {pendingInstallments.length}
              </span>
            </h2>
            <p className="mb-3 mt-1 text-[12px] text-asm-muted">
              One row per due day, longest-waiting first. Each day unlocks on its own 24h timer, so an investment can have
              more than one day queued here — clear them in day order.
            </p>
            <DataTable
              columns={installmentColumns}
              rows={pendingInstallments}
              getRowKey={(r) => `${r.inv._id}-d${r.day}`}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load investments. Please refresh."
              minWidth={700}
              empty={<EmptyState title="No installments awaiting approval" description="All daily returns are paid or not yet due." />}
            />
          </section>
        )}

        {/* ── 2. Running investments (all active — timeline view) ─────────── */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-asm-navy">
              Running Investments
              {runningInvestments.length > 0 && (
                <span className="ml-2 text-[11px] font-normal text-asm-muted">
                  {runningInvestments.length} active
                </span>
              )}
            </h2>
            {runningInvestments.length > 0 && (
              <button
                type="button"
                onClick={toggleAllRunning}
                className="shrink-0 text-[12px] font-semibold text-asm-blue hover:underline"
              >
                {allRunningExpanded ? 'Collapse all' : 'Expand all'}
              </button>
            )}
          </div>

          {isLoading ? (
            <div className="rounded-xl border border-asm-line bg-asm-tint p-6 text-center text-[13px] text-asm-muted">
              Loading…
            </div>
          ) : isError ? (
            <div className="rounded-xl border border-asm-red/30 bg-asm-red/5 p-4 text-[13px] text-asm-red">
              Failed to load investments. Please refresh.
            </div>
          ) : runningInvestments.length === 0 ? (
            <div className="rounded-xl border border-asm-line bg-white p-6 text-center">
              <p className="text-[13px] font-medium text-asm-navy">No running investments</p>
              <p className="mt-1 text-[12px] text-asm-muted">Approved installment-plan investments will appear here.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {runningInvestments.map((inv) => (
                <RunningInvestmentCard
                  key={inv._id}
                  inv={inv}
                  expanded={expandedCardIds.has(inv._id)}
                  onToggle={() => toggleCard(inv._id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── 3. Break requests ───────────────────────────────────────────── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-asm-navy">Break Requests</h2>
          <DataTable
            columns={breakColumns}
            rows={breakRequests}
            getRowKey={(inv) => inv._id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load break requests. Please refresh."
            minWidth={680}
            empty={
              <EmptyState
                title="No break requests pending"
                description="No users have requested an early exit."
              />
            }
          />
        </section>
      </div>

      {approvingInstallment && (
        <ConfirmDialog
          title={`Approve Day ${approvingInstallment.day} return?`}
          body={
            <>
              Credit <strong className="font-semibold text-asm-navy">{inr(approvingInstallment.amount)}</strong> (Day{' '}
              {approvingInstallment.day} return) to{' '}
              <strong className="font-semibold text-asm-navy">{approvingInstallment.inv.user.name}</strong>'s wallet. This
              cannot be undone.
              {approvingInstallment.blockedByDay !== null && (
                <span className="mt-2 block rounded-lg bg-amber-50 px-2.5 py-2 text-[12px] text-amber-800">
                  Day {approvingInstallment.blockedByDay} of this investment is still unpaid — paying Day{' '}
                  {approvingInstallment.day} first is out of order.
                </span>
              )}
            </>
          }
          confirmLabel={`Approve Day ${approvingInstallment.day}`}
          pendingLabel="Approving…"
          confirmVariant="success"
          isPending={approveInstallment.isPending}
          onConfirm={handleApproveInstallment}
          onCancel={() => setApprovingInstallment(null)}
        />
      )}

      {rejectingInstallment && (
        <RejectInstallmentDialog
          row={rejectingInstallment}
          isPending={rejectInstallment.isPending}
          onConfirm={handleRejectInstallment}
          onCancel={() => setRejectingInstallment(null)}
        />
      )}

      {approvingBreakInv && (
        <ConfirmDialog
          title="Approve break request?"
          body={
            <>
              End <strong className="font-semibold text-asm-navy">{approvingBreakInv.user.name}</strong>'s investment early.
              Principal + accrued profit will be credited to their wallet. This cannot be undone.
            </>
          }
          confirmLabel="Approve Break"
          pendingLabel="Approving…"
          confirmVariant="success"
          isPending={approveBreak.isPending}
          onConfirm={handleApproveBreak}
          onCancel={() => setApprovingBreakId(null)}
        />
      )}

      {rejectingBreakInv && (
        <ConfirmDialog
          title="Reject break request?"
          body={
            <>
              Decline <strong className="font-semibold text-asm-navy">{rejectingBreakInv.user.name}</strong>'s early exit
              request. Their investment will continue as normal.
            </>
          }
          confirmLabel="Reject"
          pendingLabel="Rejecting…"
          confirmVariant="danger"
          isPending={rejectBreak.isPending}
          onConfirm={handleRejectBreak}
          onCancel={() => setRejectingBreakId(null)}
        />
      )}
    </>
  )
}
