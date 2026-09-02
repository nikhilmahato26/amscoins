import { useState, useCallback } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useApproveInstallment, useApproveBreak, useRejectBreak } from '@/hooks/queries'
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

type InstallmentRow = { inv: AdminInvestment; day: number; amount: number }

// ── Per-installment status pip ────────────────────────────────────────────────

function InstallmentPip({ inst }: { inst: Installment }) {
  const isScheduled = inst.status === 'scheduled'
  const isAvailable = inst.status === 'available'
  const isPaid = inst.status === 'paid'

  return (
    <div className="flex flex-col items-center gap-1 min-w-[90px]">
      {/* Dot */}
      <div
        className={cn(
          'h-2.5 w-2.5 rounded-full',
          isPaid && 'bg-asm-greenInk',
          isAvailable && 'bg-asm-blue animate-pulse',
          isScheduled && 'bg-asm-line',
        )}
      />
      {/* Label */}
      <span
        className={cn(
          'text-[11px] font-semibold',
          isPaid && 'text-asm-greenInk',
          isAvailable && 'text-asm-blue',
          isScheduled && 'text-asm-muted',
        )}
      >
        Day {inst.day}
        {isPaid && ' ✓'}
        {isAvailable && ' Ready'}
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
        <span className="text-[10px] font-medium text-asm-blue">Awaiting approval</span>
      )}
      {isPaid && inst.creditedAt && (
        <span className="text-[10px] text-asm-muted">{fmt(inst.creditedAt)}</span>
      )}
    </div>
  )
}

// ── Running investments compact table row (expands to timeline on click) ──────

function RunningInvestmentRow({
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
  const availableCount = installments.filter((i) => i.status === 'available').length

  return (
    <>
      <tr
        className="cursor-pointer border-b border-asm-line transition-colors last:border-0 hover:bg-asm-tint/60"
        onClick={onToggle}
      >
        {/* Expand chevron */}
        <td className="w-8 pl-3 pr-0 py-3 text-asm-muted">
          {expanded
            ? <ChevronDown className="size-4" strokeWidth={2} aria-hidden />
            : <ChevronRight className="size-4" strokeWidth={2} aria-hidden />}
        </td>

        {/* User */}
        <td className="px-3 py-3">
          <p className="text-[13px] font-semibold text-asm-navy leading-none">{inv.user.name}</p>
          <p className="mt-0.5 text-[11px] text-asm-muted">{inv.user.email}</p>
        </td>

        {/* Plan */}
        <td className="px-3 py-3">
          <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
            {inv.planKey}
          </span>
        </td>

        {/* Principal */}
        <td className="px-3 py-3 font-mono text-[12px] tabular-nums text-asm-navy text-right">
          {inr(inv.amount)}
        </td>

        {/* Progress */}
        <td className="px-3 py-3 text-right">
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            availableCount > 0
              ? 'bg-asm-blue-tint text-asm-blue'
              : 'bg-asm-tint text-asm-muted'
          )}>
            {paidCount}/{installments.length} paid
            {availableCount > 0 && ` · ${availableCount} ready`}
          </span>
        </td>

        {/* Reference */}
        <td className="px-3 py-3 font-mono text-[10px] text-asm-muted text-right pr-4 hidden sm:table-cell">
          {inv.referenceCode}
        </td>
      </tr>

      {/* Expanded timeline */}
      {expanded && (
        <tr className="border-b border-asm-line bg-asm-tint/40">
          <td colSpan={6} className="px-6 py-4">
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
            <p className="mt-3 font-mono text-[10px] text-asm-muted sm:hidden">{inv.referenceCode}</p>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Main tab ──────────────────────────────────────────────────────────────────

export function InstallmentsTab({ data, isLoading, isError }: Props) {
  const approveInstallment = useApproveInstallment()
  const approveBreak = useApproveBreak()
  const rejectBreak = useRejectBreak()

  const [approvingInstallment, setApprovingInstallment] = useState<InstallmentRow | null>(null)
  const [approvingBreakId, setApprovingBreakId] = useState<string | null>(null)
  const [rejectingBreakId, setRejectingBreakId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const toggleRow = useCallback((id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

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
      // Also surface individual days that are ready for approval.
      for (const inst of inv.installments) {
        if (inst.status === 'available') {
          pendingInstallments.push({ inv, day: inst.day, amount: inst.amount })
        }
      }
    }
  }

  const approvingBreakInv = breakRequests.find((inv) => inv._id === approvingBreakId) ?? null
  const rejectingBreakInv = breakRequests.find((inv) => inv._id === rejectingBreakId) ?? null

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
        <span className="font-semibold text-asm-navy">
          Day {r.day} of {r.inv.installments?.length ?? 3}
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
        <AdminButton
          size="sm"
          variant="success"
          onClick={() => setApprovingInstallment(r)}
          disabled={approveInstallment.isPending}
        >
          Approve Day {r.day}
        </AdminButton>
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
            <h2 className="mb-3 text-sm font-semibold text-asm-navy">
              Ready to Approve
              <span className="ml-2 rounded-full bg-asm-blue px-2 py-0.5 text-[10px] font-bold text-white">
                {pendingInstallments.length}
              </span>
            </h2>
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

        {/* ── 2. Running investments (compact table, click to expand timeline) ── */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-asm-navy">
            Running Investments
            {runningInvestments.length > 0 && (
              <span className="ml-2 text-[11px] font-normal text-asm-muted">
                {runningInvestments.length} active
              </span>
            )}
          </h2>

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
            <div className="overflow-hidden rounded-xl border border-asm-line bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-asm-line bg-asm-tint/60">
                      <th className="w-8 pl-3 pr-0 py-2.5" />
                      <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-asm-muted">User</th>
                      <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-asm-muted">Plan</th>
                      <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-asm-muted text-right">Principal</th>
                      <th className="px-3 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-asm-muted text-right">Progress</th>
                      <th className="px-3 pr-4 py-2.5 text-[10px] font-bold uppercase tracking-[0.1em] text-asm-muted text-right hidden sm:table-cell">Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {runningInvestments.map((inv) => (
                      <RunningInvestmentRow
                        key={inv._id}
                        inv={inv}
                        expanded={expandedRows.has(inv._id)}
                        onToggle={() => toggleRow(inv._id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-asm-line px-4 py-2 text-[11px] text-asm-muted">
                Click any row to see the day-by-day installment timeline.
              </p>
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
