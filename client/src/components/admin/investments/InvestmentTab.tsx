import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X } from 'lucide-react'
import {
  useApproveInvestment,
  useRejectInvestment,
  useBulkApproveInvestments,
  useBulkRejectInvestments,
  useSettings,
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
import { StatusBadge } from './StatusBadge'
import { fmt, fmtTime } from './helpers'

interface TabDataProps {
  data: AdminInvestment[] | undefined
  isLoading: boolean
  isError: boolean
}

export function InvestmentTab({ data, isLoading, isError }: TabDataProps) {
  const approveMutation = useApproveInvestment()
  const rejectMutation = useRejectInvestment()
  const bulkApproveMutation = useBulkApproveInvestments()
  const bulkRejectMutation = useBulkRejectInvestments()
  const { data: settings } = useSettings()

  const autoRejectOn = !!settings?.autoRejectEnabled
  const autoRejectHours = settings?.autoRejectHours ?? 0
  const autoDepositOn = !!settings?.autoDepositEnabled
  const autoDepositHours = settings?.autoDepositHours ?? 0

  const [selectedInv, setSelectedInv] = useState<AdminInvestment | null>(null)
  const [panelNote, setPanelNote] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTargetIds, setBulkTargetIds] = useState<string[]>([])
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const rows = data ?? []
  const table = useClientTable({ rows })

  // Clear selection when data changes (e.g. after approve/reject)
  useEffect(() => {
    setSelectedIds(new Set())
  }, [data])

  const approvingInv = rows.find((d) => d._id === approvingId) ?? null
  const rejectingInv = rows.find((d) => d._id === rejectingId) ?? null
  const isMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    bulkApproveMutation.isPending ||
    bulkRejectMutation.isPending

  const allPageSelected = table.pageRows.length > 0 && table.pageRows.every((d) => selectedIds.has(d._id))
  const somePageSelected = table.pageRows.some((d) => selectedIds.has(d._id))
  const selCount = selectedIds.size
  const allCount = rows.length

  function openPanel(inv: AdminInvestment) {
    setSelectedInv(inv)
    setPanelNote('')
  }

  function closePanel() {
    setSelectedInv(null)
    setPanelNote('')
  }

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
      onSuccess: () => { setStatusMsg('Investment approved.'); setApprovingId(null); closePanel() },
      onError: () => { setStatusMsg('Failed to approve investment.'); setApprovingId(null) },
    })
  }

  function handleReject(note?: string) {
    if (!rejectingId) return
    rejectMutation.mutate([rejectingId, note || undefined], {
      onSuccess: () => { setStatusMsg('Investment rejected.'); setRejectingId(null); closePanel() },
      onError: () => { setStatusMsg('Failed to reject investment.'); setRejectingId(null) },
    })
  }

  function handleBulkApproveConfirm() {
    bulkApproveMutation.mutate(bulkTargetIds, {
      onSuccess: ({ approved, failed }) => {
        setStatusMsg(`${approved} investment(s) approved.${failed ? ` ${failed} failed.` : ''}`)
        setBulkApproving(false)
        setSelectedIds(new Set())
      },
      onError: () => { setStatusMsg('Bulk approve failed.'); setBulkApproving(false) },
    })
  }

  function handleBulkRejectConfirm(note?: string) {
    bulkRejectMutation.mutate({ ids: bulkTargetIds, note }, {
      onSuccess: ({ rejected, failed }) => {
        setStatusMsg(`${rejected} investment(s) rejected.${failed ? ` ${failed} failed.` : ''}`)
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
        aria-label={`Select investment from ${inv.user.name}`}
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
    { key: 'amount', header: 'Amount', align: 'right', className: 'font-mono text-[14px] font-bold tabular-nums text-asm-navy', render: (inv) => inr(inv.amount) },
    {
      key: 'reference',
      header: 'Reference',
      className: 'font-mono text-[11px] text-asm-body',
      render: (inv) => <IdChip label={formatInvestId(inv.referenceCode)} />,
    },
    {
      key: 'date',
      header: 'Date',
      render: (inv) => (
        <>
          <p className="text-[12px] text-asm-body">{fmt(inv.createdAt)}</p>
          <p className="font-mono text-[10px] text-asm-muted">{fmtTime(inv.createdAt)}</p>
        </>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (inv) =>
        inv.status === 'active' && inv.maturesAt ? (
          <div className="flex flex-col gap-1">
            <StatusBadge status="active" />
            <span className="font-mono text-[11px] tabular-nums text-asm-muted" data-testid="countdown">
              <InvestmentCountdown maturesAt={inv.maturesAt} />
            </span>
          </div>
        ) : (
          <StatusBadge status={inv.status} />
        ),
    },
    ...(autoRejectOn
      ? [
          {
            key: 'autoReject',
            header: 'Auto reject',
            render: (inv: AdminInvestment) =>
              inv.status === 'pending' ? (
                <span className="font-mono text-[11px] tabular-nums text-amber-700" data-testid="auto-reject-countdown">
                  <InvestmentCountdown
                    maturesAt={new Date(new Date(inv.createdAt).getTime() + autoRejectHours * 3600 * 1000).toISOString()}
                    expiredLabel="due"
                  />
                </span>
              ) : (
                <span className="text-[11px] text-asm-muted">—</span>
              ),
          } as Column<AdminInvestment>,
        ]
      : []),
    ...(autoDepositOn
      ? [
          {
            key: 'autoDeposit',
            header: 'Auto deposit',
            render: (inv: AdminInvestment) =>
              inv.status === 'pending' ? (
                <span className="font-mono text-[11px] tabular-nums text-asm-greenInk" data-testid="auto-deposit-countdown">
                  <InvestmentCountdown
                    maturesAt={new Date(new Date(inv.createdAt).getTime() + autoDepositHours * 3600 * 1000).toISOString()}
                    expiredLabel="due"
                  />
                </span>
              ) : (
                <span className="text-[11px] text-asm-muted">—</span>
              ),
          } as Column<AdminInvestment>,
        ]
      : []),
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: () => (
        <ChevronRight className="ml-auto size-4 text-asm-muted" aria-hidden />
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
        errorMessage="Failed to load investments. Please refresh."
        minWidth={760}
        onRowClick={openPanel}
        stickyHeader
        rowHover
        empty={<EmptyState title="No pending investments" description="Nothing to review right now." />}
      />

      <Pagination
        page={table.page}
        pageCount={table.pageCount}
        total={table.total}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />

      {/* Backdrop */}
      <AnimatePresence>
        {selectedInv && (
          <motion.div
            key="inv-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={closePanel}
            aria-hidden
          />
        )}
      </AnimatePresence>

      {/* Slide-in review panel */}
      <AnimatePresence>
        {selectedInv && (
          <motion.aside
            key="inv-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col bg-white shadow-2xl md:w-96"
            aria-label="Investment review"
          >
            <div className="flex items-center justify-between border-b border-asm-line px-4 py-3">
              <h2 className="text-[14px] font-semibold text-asm-navy">Review Investment</h2>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-md p-1 text-asm-muted hover:bg-asm-tint hover:text-asm-navy"
                aria-label="Close panel"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <dl className="space-y-3 text-[13px]">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">User</dt>
                  <dd className="mt-0.5 font-medium text-asm-navy">{selectedInv.user.name}</dd>
                  <dd className="text-[11px] text-asm-muted">{selectedInv.user.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Plan</dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
                      {selectedInv.planKey}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Amount</dt>
                  <dd className="mt-0.5 font-mono font-semibold tabular-nums text-asm-navy">{inr(selectedInv.amount)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Reference</dt>
                  <dd className="mt-0.5 font-mono text-[11px] text-asm-body">{formatInvestId(selectedInv.referenceCode)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Submitted</dt>
                  <dd className="mt-0.5 text-[12px] text-asm-body">
                    {fmt(selectedInv.createdAt)} · {fmtTime(selectedInv.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Status</dt>
                  <dd className="mt-0.5">
                    <StatusBadge status={selectedInv.status} />
                  </dd>
                </div>
              </dl>

              {selectedInv.status === 'pending' && (
                <div>
                  <label htmlFor="inv-panel-note" className="block text-[11px] font-semibold uppercase tracking-wide text-asm-muted mb-1">
                    Notes (optional — for rejection)
                  </label>
                  <textarea
                    id="inv-panel-note"
                    rows={3}
                    value={panelNote}
                    onChange={(e) => setPanelNote(e.target.value)}
                    placeholder="Reason for rejection…"
                    className="w-full rounded-lg border border-asm-line px-3 py-2 text-[13px] text-asm-body placeholder:text-asm-muted focus:border-asm-blue focus:outline-none focus:ring-1 focus:ring-asm-blue resize-none"
                  />
                </div>
              )}
            </div>

            {selectedInv.status === 'pending' && (
              <div className="border-t border-asm-line px-4 py-3 flex gap-2">
                <AdminButton
                  size="sm"
                  className="flex-1"
                  data-testid="approve-investment"
                  onClick={() => setApprovingId(selectedInv._id)}
                  disabled={isMutating}
                >
                  Approve
                </AdminButton>
                <AdminButton
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  data-testid="reject-investment"
                  onClick={() => setRejectingId(selectedInv._id)}
                  disabled={isMutating}
                >
                  <span className="text-asm-red">Reject</span>
                </AdminButton>
                <AdminButton
                  variant="outline"
                  size="sm"
                  onClick={closePanel}
                  disabled={isMutating}
                >
                  Close
                </AdminButton>
              </div>
            )}
            {selectedInv.status !== 'pending' && (
              <div className="border-t border-asm-line px-4 py-3">
                <AdminButton variant="outline" size="sm" className="w-full" onClick={closePanel}>
                  Close
                </AdminButton>
              </div>
            )}
          </motion.aside>
        )}
      </AnimatePresence>

      {approvingInv && (
        <ConfirmDialog
          title="Approve investment?"
          body={
            <>
              Activate <strong className="font-semibold text-asm-navy">{inr(approvingInv.amount)}</strong> investment from{' '}
              <strong className="font-semibold text-asm-navy">{approvingInv.user.name}</strong>. The 36-hour term will start
              immediately. This cannot be undone.
            </>
          }
          confirmLabel="Approve"
          pendingLabel="Approving…"
          isPending={approveMutation.isPending}
          onConfirm={handleApprove}
          onCancel={() => setApprovingId(null)}
        />
      )}
      {rejectingInv && (
        <ConfirmDialog
          title="Reject investment?"
          body={
            <>
              Investment of <strong className="font-semibold text-asm-navy">{inr(rejectingInv.amount)}</strong> from{' '}
              <strong className="font-semibold text-asm-navy">{rejectingInv.user.name}</strong> will be rejected.
              {panelNote && <>{' '}Note: <em>{panelNote}</em></>}
            </>
          }
          confirmLabel="Reject"
          pendingLabel="Rejecting…"
          confirmVariant="danger"
          isPending={rejectMutation.isPending}
          onConfirm={() => handleReject(panelNote || undefined)}
          onCancel={() => setRejectingId(null)}
        />
      )}
      {bulkApproving && (
        <ConfirmDialog
          title={`Approve ${bulkTargetIds.length} investment(s)?`}
          body={`Activate ${bulkTargetIds.length} pending investment(s) immediately. Each 36-hour term starts now. This cannot be undone.`}
          confirmLabel="Approve All"
          pendingLabel="Approving…"
          isPending={bulkApproveMutation.isPending}
          onConfirm={handleBulkApproveConfirm}
          onCancel={() => setBulkApproving(false)}
        />
      )}
      {bulkRejecting && (
        <ConfirmDialog
          title={`Reject ${bulkTargetIds.length} investment(s)?`}
          body={`Reject ${bulkTargetIds.length} investment(s) and notify users. This cannot be undone.`}
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
