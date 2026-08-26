import { useState } from 'react'
import { LifeBuoy, Loader2 } from 'lucide-react'

import { useAdminSupport, useResolveSupport } from '@/hooks/queries'
import type { AdminSupportTicket } from '@/services/api/support'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { SearchInput } from '@/components/admin/SearchInput'
import { SortSelect } from '@/components/admin/SortSelect'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { AdminButton } from '@/components/admin/AdminButton'
import { Pagination } from '@/components/admin/Pagination'
import { useClientTable, type SortOption } from '@/hooks/useClientTable'
import { cn } from '@/lib/utils'

type StatusFilter = 'open' | 'resolved'

const SORT_OPTIONS: SortOption<AdminSupportTicket>[] = [
  { label: 'Newest first', value: '-createdAt', compare: (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt) },
  { label: 'Oldest first', value: 'createdAt', compare: (a, b) => +new Date(a.createdAt) - +new Date(b.createdAt) },
]

const QUICK_REPLIES = [
  'Your issue has been resolved. Please check and confirm.',
  'We have processed your request. Thank you for your patience.',
  'This has been escalated to our team. We will update you shortly.',
  'Your account has been updated as requested.',
  'Please try again. If the issue persists, raise a new ticket.',
]

/* ── Resolve dialog (specialised: quick-reply chips + ticket context) ── */
function ResolveDialog({
  ticket,
  onConfirm,
  onCancel,
  isPending,
}: {
  ticket: AdminSupportTicket
  onConfirm: (note: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [note, setNote] = useState('')
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="resolve-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"
    >
      <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="resolve-title" className="text-[15px] font-bold text-asm-navy">
          Resolve {ticket.publicRef}
        </h2>
        <p className="mt-1 text-[12px] text-asm-muted">{ticket.subject}</p>
        <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-asm-tint px-3 py-2 text-[13px] text-asm-body">
          {ticket.message}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              type="button"
              onClick={() => setNote(reply)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors',
                note === reply
                  ? 'border-asm-blue bg-asm-blue-tint text-asm-blue'
                  : 'border-asm-line text-asm-body hover:border-asm-blue/40 hover:bg-asm-tint',
              )}
            >
              {reply.length > 50 ? reply.slice(0, 47) + '…' : reply}
            </button>
          ))}
        </div>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
            Response note <span className="font-normal normal-case tracking-normal">(pick a reply or type your own)</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="How was this resolved?"
            className="mt-1.5 w-full rounded-lg border border-asm-line bg-asm-tint px-3 py-2 text-[13px] text-asm-navy placeholder:text-asm-muted focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2.5">
          <AdminButton variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            Cancel
          </AdminButton>
          <AdminButton size="sm" onClick={() => onConfirm(note)} disabled={isPending}>
            {isPending ? 'Resolving…' : 'Mark resolved'}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}

export function AdminSupport() {
  const [status, setStatus] = useState<StatusFilter>('open')
  const { data, isLoading, isError } = useAdminSupport(status)
  const resolveMutation = useResolveSupport()

  const [resolving, setResolving] = useState<AdminSupportTicket | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const rows = data ?? []
  const table = useClientTable({
    rows,
    searchable: (t) => [t.publicRef, t.subject, t.message, t.user?.name, t.user?.email, t.user?.publicId],
    sortOptions: SORT_OPTIONS,
  })

  function handleResolve(note: string) {
    if (!resolving) return
    resolveMutation.mutate([resolving.id, note || undefined], {
      onSuccess: () => { setStatusMsg(`${resolving.publicRef} resolved.`); setResolving(null) },
      onError: () => { setStatusMsg('Failed to resolve ticket.'); setResolving(null) },
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <AdminPageHeader title="Support" subtitle="Incoming user queries." />

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput value={table.q} onChange={table.setQ} placeholder="Search by ref, subject, message or user" />
        <SortSelect value={table.sort} onChange={table.setSort} options={SORT_OPTIONS} />
      </div>

      <StatusBanner message={statusMsg} />

      {/* Status filter */}
      <div className="flex gap-2">
        {(['open', 'resolved'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatus(s)}
            className={cn(
              'rounded-lg px-3.5 py-1.5 text-[12px] font-semibold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
              status === s ? 'bg-asm-blue text-white' : 'border border-asm-line text-asm-body hover:bg-asm-tint',
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-asm-line bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-asm-muted">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span className="text-[13px]">Loading…</span>
          </div>
        ) : isError ? (
          <p role="alert" className="px-4 py-10 text-center text-[13px] text-asm-red">Failed to load tickets.</p>
        ) : table.total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-asm-tint">
              <LifeBuoy className="size-5 text-asm-muted" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="mt-1 text-[13px] font-semibold text-asm-navy">
              {table.q ? 'No matching tickets' : `No ${status} tickets`}
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-asm-line">
            {table.pageRows.map((t) => (
              <li key={t.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] font-semibold text-asm-blue">{t.publicRef}</span>
                    <span className="truncate text-[13px] font-semibold text-asm-navy">{t.subject}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-[12px] text-asm-body">{t.message}</p>
                  <p className="text-[11px] text-asm-muted">
                    {t.user ? `${t.user.name} · ${t.user.email}` : 'Unknown user'}
                    {t.user?.publicId ? ` · ${t.user.publicId}` : ''}
                    {' · '}
                    {new Date(t.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                  {t.status === 'resolved' && t.adminNote && (
                    <p className="mt-1 rounded-lg bg-green-50 px-3 py-2 text-[12px] text-asm-greenInk">
                      <span className="font-semibold">Response:</span> {t.adminNote}
                    </p>
                  )}
                </div>
                {t.status === 'open' && (
                  <AdminButton
                    size="sm"
                    className="shrink-0 self-start"
                    onClick={() => setResolving(t)}
                    disabled={resolveMutation.isPending}
                  >
                    Resolve
                  </AdminButton>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Pagination
        page={table.page}
        pageCount={table.pageCount}
        total={table.total}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />

      {resolving && (
        <ResolveDialog
          ticket={resolving}
          onConfirm={handleResolve}
          onCancel={() => setResolving(null)}
          isPending={resolveMutation.isPending}
        />
      )}
    </div>
  )
}
