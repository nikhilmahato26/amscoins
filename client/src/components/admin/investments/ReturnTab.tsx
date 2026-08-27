import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useApproveReturn,
  useRejectReturn,
  useApprovePayout,
  useRejectPayout,
  useDeleteInvestment,
  useBulkApproveReturns,
  useBulkRejectReturns,
} from '@/hooks/queries'
import type { AdminInvestment } from '@/services/api/admin'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { AdminButton } from '@/components/admin/AdminButton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { Pagination } from '@/components/admin/Pagination'
import { InvestmentCountdown } from '@/components/admin/InvestmentCountdown'
import { useClientTable } from '@/hooks/useClientTable'
import { inr } from '@/lib/format'
import { formatInvestId, IdChip } from '@/lib/ids'
import { cn } from '@/lib/utils'
import { StatusBadge } from './StatusBadge'
import { fmt, fmtTime } from './helpers'

interface TabDataProps {
  data: AdminInvestment[] | undefined
  isLoading: boolean
  isError: boolean
}

/* ── Reject return dialog (react-hook-form + zod: reason + partial amount) ── */
function makeRejectReturnSchema(maxRupees: number) {
  return z.object({
    reason: z.string().min(1, 'Reason is required'),
    amountRupees: z
      .number({ invalid_type_error: 'Enter a valid amount' })
      .min(0, 'Amount must be at least ₹0')
      .max(maxRupees, `Amount must not exceed ${inr(maxRupees * 100)}`),
  })
}

type RejectReturnForm = z.infer<ReturnType<typeof makeRejectReturnSchema>>

function RejectReturnDialog({
  inv,
  onConfirm,
  onCancel,
  isPending,
}: {
  inv: AdminInvestment
  onConfirm: (reason: string, amountPaise: number) => void
  onCancel: () => void
  isPending: boolean
}) {
  const maxRupees = Math.floor((inv.amount + (inv.expectedReturn ?? 0)) / 100)
  const schema = makeRejectReturnSchema(maxRupees)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RejectReturnForm>({
    resolver: zodResolver(schema),
    defaultValues: { reason: '', amountRupees: 0 },
  })

  function onSubmit(values: RejectReturnForm) {
    onConfirm(values.reason, Math.round(values.amountRupees * 100))
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejret-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"
    >
      <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="rejret-title" className="text-[15px] font-bold text-asm-navy">
          Reject return?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Reject the return for <strong className="font-semibold text-asm-navy">{inv.user.name}</strong>. Enter a reason and the
          partial amount (in rupees) to credit — max{' '}
          <strong className="font-semibold text-asm-navy">{inr(inv.amount + (inv.expectedReturn ?? 0))}</strong>.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 flex flex-col gap-4">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">Reason *</span>
            <textarea
              {...register('reason')}
              rows={3}
              placeholder="Reason for rejection…"
              aria-invalid={!!errors.reason}
              aria-describedby={errors.reason ? 'rejret-reason-err' : undefined}
              className={cn(
                'mt-1.5 w-full resize-none rounded-lg border bg-asm-tint px-3 py-2',
                'text-[13px] text-asm-navy placeholder:text-asm-muted',
                'focus:outline-none focus:ring-2 focus:ring-offset-1',
                errors.reason
                  ? 'border-asm-red focus:border-asm-red focus:ring-asm-red'
                  : 'border-asm-line focus:border-asm-blue focus:ring-asm-blue',
              )}
            />
            {errors.reason && (
              <p id="rejret-reason-err" className="mt-1 text-[11px] text-asm-red">
                {errors.reason.message}
              </p>
            )}
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
              Partial credit amount (rupees)
            </span>
            <input
              {...register('amountRupees', { valueAsNumber: true })}
              type="number"
              step="0.01"
              min={0}
              max={maxRupees}
              placeholder="0"
              aria-invalid={!!errors.amountRupees}
              aria-describedby={errors.amountRupees ? 'rejret-amt-err' : undefined}
              className={cn(
                'mt-1.5 w-full rounded-lg border bg-asm-tint px-3 py-2',
                'text-[13px] text-asm-navy placeholder:text-asm-muted',
                'focus:outline-none focus:ring-2 focus:ring-offset-1',
                errors.amountRupees
                  ? 'border-asm-red focus:border-asm-red focus:ring-asm-red'
                  : 'border-asm-line focus:border-asm-blue focus:ring-asm-blue',
              )}
            />
            {errors.amountRupees && (
              <p id="rejret-amt-err" className="mt-1 text-[11px] text-asm-red">
                {errors.amountRupees.message}
              </p>
            )}
            <p className="mt-1 text-[11px] text-asm-muted">
              0 = no credit; max {inr(inv.amount + (inv.expectedReturn ?? 0))} (principal + expected return).
            </p>
          </label>

          <div className="flex justify-end gap-2.5">
            <AdminButton variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" variant="danger" size="sm" disabled={isPending}>
              {isPending ? 'Submitting…' : 'Reject return'}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  )
}

export function ReturnTab({ data, isLoading, isError }: TabDataProps) {
  const approveMutation = useApproveReturn()
  const rejectMutation = useRejectReturn()
  const approvePayoutMutation = useApprovePayout()
  const rejectPayoutMutation = useRejectPayout()
  const deleteMutation = useDeleteInvestment()
  const bulkApproveMutation = useBulkApproveReturns()
  const bulkRejectMutation = useBulkRejectReturns()

  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTargetIds, setBulkTargetIds] = useState<string[]>([])
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const rows = data ?? []
  const table = useClientTable({ rows })

  useEffect(() => {
    setSelectedIds(new Set())
  }, [data])

  const approvingInv = rows.find((d) => d._id === approvingId) ?? null
  const rejectingInv = rows.find((d) => d._id === rejectingId) ?? null

  const isMutating =
    approveMutation.isPending || rejectMutation.isPending ||
    approvePayoutMutation.isPending || rejectPayoutMutation.isPending ||
    deleteMutation.isPending || bulkApproveMutation.isPending || bulkRejectMutation.isPending

  const allPageSelected = table.pageRows.length > 0 && table.pageRows.every((d) => selectedIds.has(d._id))
  const somePageSelected = table.pageRows.some((d) => selectedIds.has(d._id))
  const selCount = selectedIds.size
  const allCount = rows.length

  function togglePageSelection() {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (allPageSelected) table.pageRows.forEach((d) => next.delete(d._id))
      else table.pageRows.forEach((d) => next.add(d._id))
      return next
    })
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openBulkApprove(ids: string[]) { setBulkTargetIds(ids); setBulkApproving(true) }
  function openBulkReject(ids: string[]) { setBulkTargetIds(ids); setBulkRejecting(true) }

  function handleApprove() {
    if (!approvingId) return
    approveMutation.mutate([approvingId], {
      onSuccess: () => { setStatusMsg('Return approved and credited.'); setApprovingId(null) },
      onError: () => { setStatusMsg('Failed to approve return.'); setApprovingId(null) },
    })
  }

  function handlePayNow(inv: AdminInvestment) {
    if (!window.confirm(`Pay ${inv.user.name} ${inr(inv.amount + inv.expectedReturn)} now (deposit + profit)?`)) return
    approvePayoutMutation.mutate([inv._id], {
      onSuccess: () => setStatusMsg(`Paid ${inr(inv.amount + inv.expectedReturn)} to ${inv.user.name}.`),
      onError: () => setStatusMsg('Failed to pay out.'),
    })
  }

  function handleDelete(inv: AdminInvestment) {
    if (!window.confirm(`Delete this investment completely? It disappears from ${inv.user.name}'s history and totals. This cannot be undone.`)) return
    deleteMutation.mutate([inv._id], {
      onSuccess: () => setStatusMsg('Investment deleted.'),
      onError: () => setStatusMsg('Failed to delete.'),
    })
  }

  function handleReject(reason: string, amountPaise: number) {
    if (!rejectingInv) return
    const opts = {
      onSuccess: () => { setStatusMsg('Investment rejected.'); setRejectingId(null) },
      onError: () => { setStatusMsg('Failed to reject.'); setRejectingId(null) },
    }
    if (rejectingInv.status === 'active') {
      rejectPayoutMutation.mutate([rejectingInv._id, { reason, amount: amountPaise }], opts)
    } else {
      rejectMutation.mutate([rejectingInv._id, { reason, amount: amountPaise }], opts)
    }
  }

  function handleBulkApproveConfirm() {
    bulkApproveMutation.mutate(bulkTargetIds, {
      onSuccess: ({ approved, failed }) => {
        setStatusMsg(`${approved} return(s) approved.${failed ? ` ${failed} failed.` : ''}`)
        setBulkApproving(false)
        setSelectedIds(new Set())
      },
      onError: () => { setStatusMsg('Bulk approve failed.'); setBulkApproving(false) },
    })
  }

  function handleBulkRejectConfirm(reason?: string) {
    bulkRejectMutation.mutate({ ids: bulkTargetIds, reason }, {
      onSuccess: ({ rejected, failed }) => {
        setStatusMsg(`${rejected} return(s) rejected.${failed ? ` ${failed} failed.` : ''}`)
        setBulkRejecting(false)
        setSelectedIds(new Set())
      },
      onError: () => { setStatusMsg('Bulk reject failed.'); setBulkRejecting(false) },
    })
  }

  const checkboxColumn: Column<AdminInvestment> = {
    key: 'select',
    header: (
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer rounded border-asm-line accent-asm-blue"
        checked={allPageSelected}
        ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
        onChange={togglePageSelection}
        aria-label="Select all on this page"
      />
    ),
    render: (inv) => (
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer rounded border-asm-line accent-asm-blue"
        checked={selectedIds.has(inv._id)}
        onChange={(e) => { e.stopPropagation(); toggleRow(inv._id) }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Select return for ${inv.user.name}`}
      />
    ),
  }

  const dataColumns: Column<AdminInvestment>[] = [
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
    { key: 'principal', header: 'Principal', align: 'right', className: 'font-mono tabular-nums text-asm-navy', render: (inv) => inr(inv.amount) },
    { key: 'expected', header: 'Expected return', align: 'right', className: 'font-mono tabular-nums font-semibold text-asm-greenInk', render: (inv) => inr(inv.expectedReturn) },
    { key: 'pct', header: 'Return %', align: 'right', className: 'font-mono tabular-nums text-asm-body', render: (inv) => `${inv.returnPct}%` },
    {
      key: 'reference',
      header: 'Reference',
      className: 'font-mono text-[11px] text-asm-body',
      render: (inv) => <IdChip label={formatInvestId(inv.referenceCode)} />,
    },
    {
      key: 'matured',
      header: 'Matured',
      render: (inv) =>
        inv.status === 'active' && inv.maturesAt ? (
          <div className="flex flex-col gap-0.5">
            <StatusBadge status="active" />
            <span className="font-mono text-[11px] tabular-nums text-asm-muted" data-testid="countdown">
              <InvestmentCountdown maturesAt={inv.maturesAt} />
            </span>
          </div>
        ) : inv.maturesAt ? (
          <>
            <p className="text-[12px] text-asm-body">{fmt(inv.maturesAt)}</p>
            <p className="font-mono text-[10px] text-asm-muted">{fmtTime(inv.maturesAt)}</p>
          </>
        ) : (
          '-'
        ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (inv) => (
        <div className="flex justify-end gap-2">
          <AdminButton
            variant="success"
            size="sm"
            data-testid={inv.status === 'active' ? 'approve-payout' : 'approve-return'}
            onClick={() => (inv.status === 'active' ? handlePayNow(inv) : setApprovingId(inv._id))}
            disabled={isMutating}
          >
            Approve
          </AdminButton>
          <AdminButton
            variant="outline"
            size="sm"
            data-testid={inv.status === 'active' ? 'reject-payout' : 'reject-return'}
            onClick={() => setRejectingId(inv._id)}
            disabled={isMutating}
          >
            <span className="text-asm-red">Reject</span>
          </AdminButton>
          <AdminButton
            size="sm"
            data-testid="delete-investment"
            onClick={() => handleDelete(inv)}
            disabled={isMutating}
            className="border border-zinc-300 bg-zinc-100 text-zinc-700 hover:bg-zinc-200 focus-visible:ring-zinc-400"
          >
            Delete
          </AdminButton>
        </div>
      ),
    },
  ]

  return (
    <>
      {/* Bulk action toolbar — "Approve All" / "Reject All" when nothing selected */}
      {allCount > 0 && selCount === 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <AdminButton
            size="sm"
            onClick={() => openBulkApprove(rows.map((d) => d._id))}
            disabled={isMutating}
          >
            Approve All ({allCount})
          </AdminButton>
          <AdminButton
            variant="outline"
            size="sm"
            onClick={() => openBulkReject(rows.map((d) => d._id))}
            disabled={isMutating}
          >
            <span className="text-asm-red">Reject All ({allCount})</span>
          </AdminButton>
        </div>
      )}

      {/* Selection action bar */}
      {selCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-asm-line bg-asm-blue-tint/30 px-4 py-2.5">
          <span className="text-sm font-medium text-asm-navy">{selCount} selected</span>
          <div className="flex gap-2">
            <AdminButton
              size="sm"
              onClick={() => openBulkApprove(Array.from(selectedIds))}
              disabled={isMutating}
            >
              Approve Selected
            </AdminButton>
            <AdminButton
              variant="outline"
              size="sm"
              onClick={() => openBulkReject(Array.from(selectedIds))}
              disabled={isMutating}
            >
              <span className="text-asm-red">Reject Selected</span>
            </AdminButton>
            <AdminButton
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(new Set())}
              disabled={isMutating}
            >
              Clear
            </AdminButton>
          </div>
        </div>
      )}

      <StatusBanner message={statusMsg} />

      <DataTable
        columns={[checkboxColumn, ...dataColumns]}
        rows={table.pageRows}
        getRowKey={(inv) => inv._id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load matured investments. Please refresh."
        minWidth={900}
        empty={<EmptyState title="No active or matured investments" description="Nothing to review right now." />}
      />

      <Pagination
        page={table.page}
        pageCount={table.pageCount}
        total={table.total}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />

      {approvingInv && (
        <ConfirmDialog
          title="Approve return?"
          body={
            <>
              Credit full return of{' '}
              <strong className="font-semibold text-asm-navy">{inr(approvingInv.amount + (approvingInv.expectedReturn ?? 0))}</strong>{' '}
              to <strong className="font-semibold text-asm-navy">{approvingInv.user.name}</strong>'s wallet. This cannot be undone.
            </>
          }
          confirmLabel="Approve return"
          pendingLabel="Approving…"
          confirmVariant="success"
          isPending={approveMutation.isPending}
          onConfirm={handleApprove}
          onCancel={() => setApprovingId(null)}
        />
      )}
      {rejectingInv && (
        <RejectReturnDialog
          inv={rejectingInv}
          onConfirm={handleReject}
          onCancel={() => setRejectingId(null)}
          isPending={rejectMutation.isPending || rejectPayoutMutation.isPending}
        />
      )}
      {bulkApproving && (
        <ConfirmDialog
          title={`Approve ${bulkTargetIds.length} return(s)?`}
          body={`Credit returns for ${bulkTargetIds.length} investment(s) immediately. Each user's wallet will be updated. This cannot be undone.`}
          confirmLabel="Approve All"
          pendingLabel="Approving…"
          confirmVariant="success"
          isPending={bulkApproveMutation.isPending}
          onConfirm={handleBulkApproveConfirm}
          onCancel={() => setBulkApproving(false)}
        />
      )}
      {bulkRejecting && (
        <ConfirmDialog
          title={`Reject ${bulkTargetIds.length} return(s)?`}
          body={`Reject ${bulkTargetIds.length} return(s). No credit will be issued (₹0 partial amount). This cannot be undone.`}
          confirmLabel="Reject All"
          pendingLabel="Rejecting…"
          confirmVariant="danger"
          withNote
          noteLabel="Reason (optional)"
          notePlaceholder="Reason for rejection…"
          isPending={bulkRejectMutation.isPending}
          onConfirm={handleBulkRejectConfirm}
          onCancel={() => setBulkRejecting(false)}
        />
      )}
    </>
  )
}
