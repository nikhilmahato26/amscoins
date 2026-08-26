import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, X } from 'lucide-react'
import {
  useAdminInvestments,
  useApproveInvestment,
  useRejectInvestment,
  useBulkApproveInvestments,
  useBulkRejectInvestments,
} from '@/hooks/queries'
import type { AdminInvestment } from '@/services/api/admin'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { SearchInput } from '@/components/admin/SearchInput'
import { SortSelect } from '@/components/admin/SortSelect'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { AdminButton } from '@/components/admin/AdminButton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { Pagination } from '@/components/admin/Pagination'
import { useClientTable, type SortOption } from '@/hooks/useClientTable'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

const SORT_OPTIONS: SortOption<AdminInvestment>[] = [
  { label: 'Newest first', value: '-createdAt', compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt) },
  { label: 'Oldest first', value: 'createdAt', compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt) },
  { label: 'Amount ↑', value: 'amount', compare: (a, b) => a.amount - b.amount },
  { label: 'Amount ↓', value: '-amount', compare: (a, b) => b.amount - a.amount },
]

interface StatusPillProps {
  label: string
  count: number
  colorClass: string
}

function StatusPill({ label, count, colorClass }: StatusPillProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold', colorClass)}>
      <span className="tabular-nums">{count}</span>
      <span className="font-normal opacity-80">{label}</span>
    </span>
  )
}

export function AdminDeposits() {
  const { data, isLoading, isError } = useAdminInvestments('pending')
  const approveMutation = useApproveInvestment()
  const rejectMutation = useRejectInvestment()
  const bulkApproveMutation = useBulkApproveInvestments()
  const bulkRejectMutation = useBulkRejectInvestments()

  const [selectedDeposit, setSelectedDeposit] = useState<AdminInvestment | null>(null)
  const [panelNote, setPanelNote] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkTargetIds, setBulkTargetIds] = useState<string[]>([])
  const [bulkApproving, setBulkApproving] = useState(false)
  const [bulkRejecting, setBulkRejecting] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const rows = data ?? []
  const table = useClientTable({
    rows,
    searchable: (d) => [d.user.name, d.user.email, d.referenceCode, d.planKey],
    sortOptions: SORT_OPTIONS,
  })

  // Clear selection when search changes
  useEffect(() => {
    setSelectedIds(new Set())
  }, [table.q])

  const approvingInvestment = rows.find((d) => d._id === approvingId) ?? null
  const rejectingInvestment = rows.find((d) => d._id === rejectingId) ?? null
  const isMutating =
    approveMutation.isPending ||
    rejectMutation.isPending ||
    bulkApproveMutation.isPending ||
    bulkRejectMutation.isPending

  const allPageSelected =
    table.pageRows.length > 0 && table.pageRows.every((d) => selectedIds.has(d._id))
  const somePageSelected = table.pageRows.some((d) => selectedIds.has(d._id))

  function openPanel(deposit: AdminInvestment) {
    setSelectedDeposit(deposit)
    setPanelNote('')
  }

  function closePanel() {
    setSelectedDeposit(null)
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

  function openBulkApprove(ids: string[]) {
    setBulkTargetIds(ids)
    setBulkApproving(true)
  }

  function openBulkReject(ids: string[]) {
    setBulkTargetIds(ids)
    setBulkRejecting(true)
  }

  function handleApproveConfirm() {
    if (!approvingId) return
    approveMutation.mutate([approvingId], {
      onSuccess: () => {
        setStatusMsg('Deposit approved successfully.')
        setApprovingId(null)
        closePanel()
      },
      onError: () => {
        setStatusMsg('Failed to approve deposit.')
        setApprovingId(null)
      },
    })
  }

  function handleRejectConfirm() {
    if (!rejectingId) return
    rejectMutation.mutate([rejectingId, panelNote || undefined], {
      onSuccess: () => {
        setStatusMsg('Deposit rejected.')
        setRejectingId(null)
        closePanel()
      },
      onError: () => {
        setStatusMsg('Failed to reject deposit.')
        setRejectingId(null)
      },
    })
  }

  function handleBulkApproveConfirm() {
    bulkApproveMutation.mutate(bulkTargetIds, {
      onSuccess: (result) => {
        const { approved, failed } = result
        setStatusMsg(`${approved} deposit(s) approved.${failed ? ` ${failed} failed.` : ''}`)
        setBulkApproving(false)
        setSelectedIds(new Set())
      },
      onError: () => {
        setStatusMsg('Bulk approve failed.')
        setBulkApproving(false)
      },
    })
  }

  function handleBulkRejectConfirm(note?: string) {
    bulkRejectMutation.mutate({ ids: bulkTargetIds, note }, {
      onSuccess: (result) => {
        const { rejected, failed } = result
        setStatusMsg(`${rejected} deposit(s) rejected.${failed ? ` ${failed} failed.` : ''}`)
        setBulkRejecting(false)
        setSelectedIds(new Set())
      },
      onError: () => {
        setStatusMsg('Bulk reject failed.')
        setBulkRejecting(false)
      },
    })
  }

  const checkboxColumn: Column<AdminInvestment> = {
    key: 'select',
    header: (
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer rounded border-asm-border"
        checked={allPageSelected}
        ref={(el) => { if (el) el.indeterminate = somePageSelected && !allPageSelected }}
        onChange={togglePageSelection}
      />
    ),
    render: (d) => (
      <input
        type="checkbox"
        className="h-4 w-4 cursor-pointer rounded border-asm-border"
        checked={selectedIds.has(d._id)}
        onChange={(e) => { e.stopPropagation(); toggleRow(d._id) }}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  }

  const dataColumns: Column<AdminInvestment>[] = [
    {
      key: 'user',
      header: 'User',
      render: (d) => (
        <>
          <p className="font-medium text-asm-navy">{d.user.name}</p>
          <p className="text-[11px] text-asm-muted">{d.user.email}</p>
        </>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (d) => (
        <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
          {d.planKey}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      className: 'font-mono tabular-nums text-asm-navy',
      render: (d) => inr(d.amount),
    },
    {
      key: 'reference',
      header: 'Reference',
      className: 'font-mono text-[11px] text-asm-body',
      render: (d) => d.referenceCode,
    },
    {
      key: 'date',
      header: 'Date',
      className: 'text-[12px] text-asm-body',
      render: (d) =>
        new Date(d.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
  ]

  const chevronColumn: Column<AdminInvestment> = {
    key: 'chevron',
    header: '',
    align: 'right',
    render: () => (
      <ChevronRight className="ml-auto size-4 text-asm-muted" aria-hidden />
    ),
  }

  const selCount = selectedIds.size
  const allCount = rows.length
  // Pipeline counts — derived from already-loaded pending data
  const pendingCount = rows.length

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Deposits"
        subtitle="Pending deposit requests awaiting review."
        actions={
          allCount > 0 ? (
            <>
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
            </>
          ) : undefined
        }
      />

      {/* Pipeline summary strip */}
      <div className="flex flex-wrap gap-2">
        <StatusPill label="pending" count={pendingCount} colorClass="bg-amber-50 text-amber-800" />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={table.q}
          onChange={table.setQ}
          placeholder="Search by name, email, reference or plan"
        />
        <SortSelect value={table.sort} onChange={table.setSort} options={SORT_OPTIONS} />
      </div>

      {selCount > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-asm-border bg-asm-blue-tint/30 px-4 py-2.5">
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
        columns={[checkboxColumn, ...dataColumns, chevronColumn]}
        rows={table.pageRows}
        getRowKey={(d) => d._id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load deposits. Please refresh."
        onRowClick={openPanel}
        empty={
          <EmptyState
            title={table.q ? 'No matching deposits' : 'No pending deposits'}
            description={table.q ? 'Try a different search.' : 'All deposit requests have been reviewed.'}
          />
        }
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
        {selectedDeposit && (
          <motion.div
            key="dep-backdrop"
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
        {selectedDeposit && (
          <motion.aside
            key="dep-panel"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 280, damping: 28 }}
            className="fixed inset-y-0 right-0 z-50 flex w-80 flex-col bg-white shadow-2xl md:w-96"
            aria-label="Deposit review"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-asm-line px-4 py-3">
              <h2 className="text-[14px] font-semibold text-asm-navy">Review Deposit</h2>
              <button
                type="button"
                onClick={closePanel}
                className="rounded-md p-1 text-asm-muted hover:bg-asm-tint hover:text-asm-navy"
                aria-label="Close panel"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Details */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              <dl className="space-y-3 text-[13px]">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">User</dt>
                  <dd className="mt-0.5 font-medium text-asm-navy">{selectedDeposit.user.name}</dd>
                  <dd className="text-[11px] text-asm-muted">{selectedDeposit.user.email}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Plan</dt>
                  <dd className="mt-0.5">
                    <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
                      {selectedDeposit.planKey}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Amount</dt>
                  <dd className="mt-0.5 font-mono font-semibold tabular-nums text-asm-navy">{inr(selectedDeposit.amount)}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Reference</dt>
                  <dd className="mt-0.5 font-mono text-[11px] text-asm-body">{selectedDeposit.referenceCode}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-asm-muted">Submitted</dt>
                  <dd className="mt-0.5 text-[12px] text-asm-body">
                    {new Date(selectedDeposit.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit', month: 'short', year: 'numeric',
                    })}{' '}·{' '}
                    {new Date(selectedDeposit.createdAt).toLocaleTimeString('en-IN', {
                      hour: 'numeric', minute: '2-digit', hour12: true,
                    })}
                  </dd>
                </div>
              </dl>

              <div>
                <label
                  htmlFor="dep-panel-note"
                  className="block text-[11px] font-semibold uppercase tracking-wide text-asm-muted mb-1"
                >
                  Notes (optional — for rejection)
                </label>
                <textarea
                  id="dep-panel-note"
                  rows={3}
                  value={panelNote}
                  onChange={(e) => setPanelNote(e.target.value)}
                  placeholder="Reason for rejection…"
                  className="w-full rounded-lg border border-asm-border px-3 py-2 text-[13px] text-asm-body placeholder:text-asm-muted focus:border-asm-blue focus:outline-none focus:ring-1 focus:ring-asm-blue resize-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-asm-line px-4 py-3 flex gap-2">
              <AdminButton
                size="sm"
                className="flex-1"
                onClick={() => setApprovingId(selectedDeposit._id)}
                disabled={isMutating}
              >
                Approve
              </AdminButton>
              <AdminButton
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setRejectingId(selectedDeposit._id)}
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
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Single-item confirm dialogs */}
      {approvingInvestment && (
        <ConfirmDialog
          title="Approve deposit?"
          body={
            <>
              This will credit{' '}
              <strong className="font-semibold text-asm-navy">{inr(approvingInvestment.amount)}</strong> to{' '}
              <strong className="font-semibold text-asm-navy">{approvingInvestment.user.name}</strong>'s wallet
              and apply referral bonuses. This cannot be undone.
            </>
          }
          confirmLabel="Approve"
          pendingLabel="Approving…"
          isPending={approveMutation.isPending}
          onConfirm={handleApproveConfirm}
          onCancel={() => setApprovingId(null)}
        />
      )}
      {rejectingInvestment && (
        <ConfirmDialog
          title="Reject deposit?"
          body={
            <>
              Deposit of{' '}
              <strong className="font-semibold text-asm-navy">{inr(rejectingInvestment.amount)}</strong> from{' '}
              <strong className="font-semibold text-asm-navy">{rejectingInvestment.user.name}</strong> will be
              rejected.
              {panelNote && (
                <>
                  {' '}Note: <em>{panelNote}</em>
                </>
              )}
            </>
          }
          confirmLabel="Reject"
          pendingLabel="Rejecting…"
          confirmVariant="danger"
          isPending={rejectMutation.isPending}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingId(null)}
        />
      )}

      {/* Bulk action dialogs */}
      {bulkApproving && (
        <ConfirmDialog
          title={`Approve ${bulkTargetIds.length} deposit(s)?`}
          body={
            <>
              This will approve{' '}
              <strong className="font-semibold text-asm-navy">{bulkTargetIds.length}</strong> pending deposit(s),
              start their investment cycles, and apply referral bonuses where applicable.
            </>
          }
          confirmLabel="Approve All"
          pendingLabel="Approving…"
          isPending={bulkApproveMutation.isPending}
          onConfirm={handleBulkApproveConfirm}
          onCancel={() => setBulkApproving(false)}
        />
      )}
      {bulkRejecting && (
        <ConfirmDialog
          title={`Reject ${bulkTargetIds.length} deposit(s)?`}
          body={
            <>
              <strong className="font-semibold text-asm-navy">{bulkTargetIds.length}</strong> pending deposit(s) will
              be rejected.
            </>
          }
          confirmLabel="Reject All"
          pendingLabel="Rejecting…"
          confirmVariant="danger"
          withNote
          notePlaceholder="Reason for rejection (applies to all)…"
          isPending={bulkRejectMutation.isPending}
          onConfirm={handleBulkRejectConfirm}
          onCancel={() => setBulkRejecting(false)}
        />
      )}
    </div>
  )
}
