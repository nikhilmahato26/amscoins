import { useState } from 'react'
import { LifeBuoy, Loader2 } from 'lucide-react'

import { useAdminSupport, useResolveSupport } from '@/hooks/queries'
import type { AdminSupportTicket } from '@/services/api/support'
import { SearchInput } from '@/components/admin/SearchInput'
import { cn } from '@/lib/utils'

type StatusFilter = 'open' | 'resolved'

/* ── Resolve dialog ── */
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="resolve-title" className="text-[15px] font-bold text-asm-navy">
          Resolve {ticket.publicRef}
        </h2>
        <p className="mt-1 text-[12px] text-asm-muted">{ticket.subject}</p>
        <p className="mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-asm-tint px-3 py-2 text-[13px] text-asm-body">
          {ticket.message}
        </p>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
            Response note (optional — emailed to the user's record)
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
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-lg border border-asm-line px-3.5 py-2 text-[12px] font-semibold text-asm-body hover:bg-asm-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note)}
            disabled={isPending}
            className="rounded-lg bg-asm-blue px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue disabled:opacity-50"
          >
            {isPending ? 'Resolving…' : 'Mark resolved'}
          </button>
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
  const [q, setQ] = useState('')

  const tickets = (data ?? []).filter((t) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      t.publicRef.toLowerCase().includes(s) ||
      t.subject.toLowerCase().includes(s) ||
      t.message.toLowerCase().includes(s) ||
      (t.user?.name ?? '').toLowerCase().includes(s) ||
      (t.user?.email ?? '').toLowerCase().includes(s) ||
      (t.user?.publicId ?? '').toLowerCase().includes(s)
    )
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
      <div>
        <h1 className="text-[22px] xl:text-[26px] font-bold tracking-tight text-asm-navy">Support</h1>
        <p className="mt-0.5 text-[13px] xl:text-[14px] text-asm-muted">Incoming user queries.</p>
      </div>

      <SearchInput value={q} onChange={setQ} placeholder="Search by ref, subject, message or user" />

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{statusMsg}</p>
      {statusMsg && (
        <p className={cn('rounded-lg px-4 py-3 text-[13px] font-medium', statusMsg.includes('Failed') ? 'bg-red-50 text-asm-red' : 'bg-green-50 text-asm-green')}>
          {statusMsg}
        </p>
      )}

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
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
            <span className="flex size-10 items-center justify-center rounded-full bg-asm-tint">
              <LifeBuoy className="size-5 text-asm-muted" strokeWidth={1.5} aria-hidden />
            </span>
            <p className="mt-1 text-[13px] font-semibold text-asm-navy">No {status} tickets</p>
          </div>
        ) : (
          <ul className="divide-y divide-asm-line">
            {tickets.map((t) => (
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
                    <p className="mt-1 rounded-lg bg-green-50 px-3 py-2 text-[12px] text-asm-green">
                      <span className="font-semibold">Response:</span> {t.adminNote}
                    </p>
                  )}
                </div>
                {t.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => setResolving(t)}
                    disabled={resolveMutation.isPending}
                    className="shrink-0 self-start rounded-md bg-asm-blue px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue disabled:opacity-50"
                  >
                    Resolve
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

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
