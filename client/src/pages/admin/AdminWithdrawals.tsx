import { useState } from 'react'
import {
  useAdminWithdrawals,
  useCompleteWithdrawal,
  useRejectWithdrawal,
  useRetryWithdrawal,
  useBulkApproveWithdrawals,
} from '@/hooks/queries'
import type { AdminWithdrawal } from '@/services/api/admin'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { SearchInput } from '@/components/admin/SearchInput'
import { SortSelect } from '@/components/admin/SortSelect'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { AdminButton } from '@/components/admin/AdminButton'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { Pagination } from '@/components/admin/Pagination'
import { useClientTable, type SortOption } from '@/hooks/useClientTable'
import { inr, payoutView } from '@/lib/format'
import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/admin/StatusBadge'

type Tab = 'pending' | 'history'

const SORT_OPTIONS: SortOption<AdminWithdrawal>[] = [
  { label: 'Newest first', value: '-createdAt', compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt) },
  { label: 'Oldest first', value: 'createdAt', compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt) },
  { label: 'Net ↑', value: 'net', compare: (a, b) => a.net - b.net },
  { label: 'Net ↓', value: '-net', compare: (a, b) => b.net - a.net },
]

/* ── Shared helpers ── */
function DestCell({ wd }: { wd: AdminWithdrawal }) {
  const dest = payoutView(wd)
  return (
    <div className="flex flex-col gap-0.5">
      <span
        className={cn(
          'inline-flex w-fit rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]',
          dest.method === 'bank' ? 'bg-asm-blue/10 text-asm-blue' : 'bg-asm-green/10 text-asm-greenInk',
        )}
      >
        {dest.badge}
      </span>
      <span className="font-mono text-[11px] text-asm-navy">{dest.primary}</span>
      {dest.secondary && <span className="text-[11px] text-asm-muted">{dest.secondary}</span>}
    </div>
  )
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function DateCell({ iso }: { iso: string }) {
  return (
    <>
      <p className="text-[12px] text-asm-body">{formatDate(iso)}</p>
      <p className="font-mono text-[10px] text-asm-muted">{formatTime(iso)}</p>
    </>
  )
}

function UserCell({ wd }: { wd: AdminWithdrawal }) {
  return (
    <>
      <p className="font-medium text-asm-navy">{wd.user.name}</p>
      <p className="text-[11px] text-asm-muted">{wd.user.email}</p>
    </>
  )
}

const searchFields = (w: AdminWithdrawal) => [w.user.name, w.user.email, payoutView(w).search]

/* ── Pending tab ── */
function PendingTab() {
  const { data, isLoading, isError } = useAdminWithdrawals('pending')
  const completeMutation = useCompleteWithdrawal()
  const rejectMutation = useRejectWithdrawal()
  const retryMutation = useRetryWithdrawal()
  const bulkMutation = useBulkApproveWithdrawals()

  const [completingId, setCompletingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const rows = data ?? []
  const table = useClientTable({ rows, searchable: searchFields, sortOptions: SORT_OPTIONS })

  const completingWithdrawal = rows.find((w) => w._id === completingId) ?? null
  const rejectingWithdrawal = rows.find((w) => w._id === rejectingId) ?? null

  function handleCompleteConfirm() {
    if (!completingId) return
    completeMutation.mutate([completingId], {
      onSuccess: () => { setStatusMsg('Withdrawal marked as paid.'); setCompletingId(null) },
      onError: () => { setStatusMsg('Failed to complete withdrawal.'); setCompletingId(null) },
    })
  }

  function handleRejectConfirm(note?: string) {
    if (!rejectingId) return
    rejectMutation.mutate([rejectingId, note || undefined], {
      onSuccess: () => { setStatusMsg('Withdrawal rejected and refunded.'); setRejectingId(null) },
      onError: () => { setStatusMsg('Failed to reject withdrawal.'); setRejectingId(null) },
    })
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleBulkApprove() {
    bulkMutation.mutate([...selected], {
      onSuccess: ({ approved }) => {
        setStatusMsg(`${approved} withdrawal${approved !== 1 ? 's' : ''} approved.`)
        setSelected(new Set())
      },
      onError: () => setStatusMsg('Bulk approve failed.'),
    })
  }

  const isMutating = completeMutation.isPending || rejectMutation.isPending || bulkMutation.isPending

  const columns: Column<AdminWithdrawal>[] = [
    {
      key: 'select',
      headerClassName: 'w-8',
      header: (
        <button
          type="button"
          aria-label="Select all pending"
          onClick={() => setSelected(new Set(rows.filter((w) => w.status === 'pending').map((w) => w._id)))}
          className="text-[10px] font-semibold uppercase text-asm-muted hover:text-asm-navy"
        >
          All
        </button>
      ),
      render: (wd) =>
        wd.status === 'pending' ? (
          <input
            type="checkbox"
            aria-label={`Select withdrawal for ${wd.user.name}`}
            checked={selected.has(wd._id)}
            onChange={() => toggleSelect(wd._id)}
            className="h-3.5 w-3.5 cursor-pointer accent-asm-blue"
          />
        ) : wd.status === 'processing' ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-asm-tint px-2 py-0.5 text-[11px] font-semibold text-asm-blue">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-asm-blue opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-asm-blue" />
            </span>
            Processing
          </span>
        ) : wd.status === 'failed' ? (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center rounded-full bg-asm-tint px-2 py-0.5 text-[11px] font-semibold text-asm-red">
              Failed
            </span>
            {wd.failureReason && <p className="text-[10px] text-asm-muted">{wd.failureReason}</p>}
            <button
              type="button"
              onClick={() => retryMutation.mutate(wd._id)}
              disabled={retryMutation.isPending}
              className="mt-1 rounded px-2 py-0.5 text-[10px] font-semibold text-asm-blue underline hover:opacity-80 disabled:opacity-50"
            >
              {retryMutation.isPending ? 'Retrying…' : 'Retry'}
            </button>
          </div>
        ) : null,
    },
    { key: 'user', header: 'User', render: (wd) => <UserCell wd={wd} /> },
    { key: 'gross', header: 'Gross', align: 'right', className: 'font-mono tabular-nums text-asm-navy', render: (wd) => inr(wd.gross) },
    { key: 'tds', header: 'TDS', align: 'right', className: 'font-mono tabular-nums text-asm-body', render: (wd) => inr(wd.tds) },
    { key: 'net', header: 'Net', align: 'right', className: 'font-mono tabular-nums font-semibold text-asm-navy', render: (wd) => inr(wd.net) },
    { key: 'dest', header: 'Destination', render: (wd) => <DestCell wd={wd} /> },
    { key: 'date', header: 'Date', render: (wd) => <DateCell iso={wd.createdAt} /> },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (wd) => (
        <div className="flex justify-end gap-2">
          <AdminButton size="sm" onClick={() => setCompletingId(wd._id)} disabled={isMutating}>
            Mark paid
          </AdminButton>
          <AdminButton variant="outline" size="sm" onClick={() => setRejectingId(wd._id)} disabled={isMutating}>
            <span className="text-asm-red">Reject</span>
          </AdminButton>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={table.q} onChange={table.setQ} placeholder="Search by name, email or destination" />
        <SortSelect value={table.sort} onChange={table.setSort} options={SORT_OPTIONS} />
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-asm-line bg-asm-tint px-4 py-2.5">
          <span className="text-[12px] font-semibold text-asm-navy">{selected.size} selected</span>
          <AdminButton size="sm" onClick={handleBulkApprove} disabled={isMutating}>
            {bulkMutation.isPending ? 'Approving…' : 'Bulk approve'}
          </AdminButton>
          <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] text-asm-muted hover:text-asm-body">
            Clear
          </button>
        </div>
      )}

      <StatusBanner message={statusMsg} />

      <DataTable
        columns={columns}
        rows={table.pageRows}
        getRowKey={(wd) => wd._id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load withdrawals. Please refresh."
        minWidth={800}
        empty={
          <EmptyState
            title={table.q ? 'No matching withdrawals' : 'No pending withdrawals'}
            description={table.q ? 'Try a different search.' : 'All withdrawal requests have been processed.'}
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

      {completingWithdrawal && (
        <ConfirmDialog
          title="Mark as paid?"
          body={
            <>
              Confirm payment of <strong className="font-semibold text-asm-navy">{inr(completingWithdrawal.net)}</strong> to{' '}
              <strong className="font-semibold text-asm-navy">{completingWithdrawal.user.name}</strong>{' '}
              <span className="font-mono text-asm-navy">{payoutView(completingWithdrawal).sentence}</span>. This cannot be undone.
            </>
          }
          confirmLabel="Mark paid"
          pendingLabel="Confirming…"
          isPending={completeMutation.isPending}
          onConfirm={handleCompleteConfirm}
          onCancel={() => setCompletingId(null)}
        />
      )}
      {rejectingWithdrawal && (
        <ConfirmDialog
          title="Reject & refund?"
          body={
            <>
              Withdrawal of <strong className="font-semibold text-asm-navy">{inr(rejectingWithdrawal.net)}</strong> for{' '}
              <strong className="font-semibold text-asm-navy">{rejectingWithdrawal.user.name}</strong> will be rejected and the
              gross amount refunded to their wallet.
            </>
          }
          confirmLabel="Reject & refund"
          pendingLabel="Rejecting…"
          confirmVariant="danger"
          withNote
          notePlaceholder="Reason for rejection…"
          isPending={rejectMutation.isPending}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingId(null)}
        />
      )}
    </>
  )
}

/* ── History tab ── */
function HistoryTab() {
  const { data, isLoading, isError } = useAdminWithdrawals('completed,rejected')
  const rows = data ?? []
  const table = useClientTable({ rows, searchable: searchFields, sortOptions: SORT_OPTIONS })

  const columns: Column<AdminWithdrawal>[] = [
    { key: 'user', header: 'User', render: (wd) => <UserCell wd={wd} /> },
    { key: 'gross', header: 'Gross', align: 'right', className: 'font-mono tabular-nums text-asm-navy', render: (wd) => inr(wd.gross) },
    { key: 'tds', header: 'TDS', align: 'right', className: 'font-mono tabular-nums text-asm-body', render: (wd) => inr(wd.tds) },
    { key: 'net', header: 'Net', align: 'right', className: 'font-mono tabular-nums font-semibold text-asm-navy', render: (wd) => inr(wd.net) },
    { key: 'dest', header: 'Destination', render: (wd) => <DestCell wd={wd} /> },
    { key: 'requested', header: 'Requested', render: (wd) => <DateCell iso={wd.createdAt} /> },
    {
      key: 'settled',
      header: 'Settled',
      render: (wd) => {
        const settledAt = wd.completedAt ?? wd.processedAt
        return settledAt ? <DateCell iso={settledAt} /> : '—'
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (wd) => <StatusBadge status={wd.status === 'completed' ? 'paid' : wd.status} />,
    },
    { key: 'note', header: 'Note', className: 'text-[12px] text-asm-muted', render: (wd) => wd.note ?? '—' },
  ]

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={table.q} onChange={table.setQ} placeholder="Search by name, email or destination" />
        <SortSelect value={table.sort} onChange={table.setSort} options={SORT_OPTIONS} />
      </div>

      <DataTable
        columns={columns}
        rows={table.pageRows}
        getRowKey={(wd) => wd._id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load history. Please refresh."
        minWidth={860}
        empty={
          <EmptyState
            title={table.q ? 'No matching records' : 'No withdrawal history yet'}
            description={table.q ? 'Try a different search.' : 'Completed and rejected withdrawals will appear here.'}
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
    </>
  )
}

/* ── Main page ── */
export function AdminWithdrawals() {
  const [activeTab, setActiveTab] = useState<Tab>('pending')
  const { data: pendingData } = useAdminWithdrawals('pending')
  const pendingCount = pendingData?.filter((w) => w.status === 'pending').length ?? 0

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Withdrawals"
        subtitle="Manage pending withdrawal requests and view completed history."
      />

      {/* Tabs */}
      <div role="tablist" aria-label="Withdrawal sections" className="flex w-fit gap-1 rounded-xl border border-asm-line bg-asm-tint p-1">
        {(['pending', 'history'] as const).map((tab) => (
          <button
            key={tab}
            role="tab"
            type="button"
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium capitalize transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
              activeTab === tab
                ? 'bg-white text-asm-navy shadow-[0_1px_3px_rgba(16,42,92,0.08)]'
                : 'text-asm-muted hover:text-asm-body',
            )}
          >
            {tab === 'pending' ? 'Pending' : 'History'}
            {tab === 'pending' && pendingCount > 0 && (
              <span className="rounded-full bg-asm-red px-1.5 py-0.5 text-[9px] font-bold text-white">{pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'pending' ? <PendingTab /> : <HistoryTab />}
    </div>
  )
}
