import { useState } from 'react'
import { Inbox } from 'lucide-react'
import {
  useAdminWithdrawals,
  useCompleteWithdrawal,
  useRejectWithdrawal,
} from '@/hooks/queries'
import type { AdminWithdrawal } from '@/services/api/admin'
import { SearchInput } from '@/components/admin/SearchInput'
import { inr, payoutView } from '@/lib/format'
import { cn } from '@/lib/utils'

/* ── Mark paid dialog ── */
interface MarkPaidDialogProps {
  withdrawal: AdminWithdrawal
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

function MarkPaidDialog({ withdrawal, onConfirm, onCancel, isPending }: MarkPaidDialogProps) {
  const dest = payoutView(withdrawal)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="markpaid-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="markpaid-title" className="text-[15px] font-bold text-asm-navy">
          Mark as paid?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Confirm payment of{' '}
          <strong className="font-semibold text-asm-navy">{inr(withdrawal.net)}</strong> to{' '}
          <strong className="font-semibold text-asm-navy">{withdrawal.user.name}</strong>{' '}
          <span className="font-mono text-asm-navy">{dest.sentence}</span>. This cannot be undone.
        </p>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={cn(
              'rounded-lg border border-asm-line px-3.5 py-2 text-[12px] font-semibold text-asm-body',
              'hover:bg-asm-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={cn(
              'rounded-lg bg-asm-blue px-3.5 py-2 text-[12px] font-semibold text-white',
              'hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isPending ? 'Confirming…' : 'Mark paid'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Reject/refund dialog ── */
interface RejectDialogProps {
  withdrawal: AdminWithdrawal
  onConfirm: (note: string) => void
  onCancel: () => void
  isPending: boolean
}

function RejectDialog({ withdrawal, onConfirm, onCancel, isPending }: RejectDialogProps) {
  const [note, setNote] = useState('')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejectwd-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="rejectwd-title" className="text-[15px] font-bold text-asm-navy">
          Reject &amp; refund?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Withdrawal of <strong className="font-semibold text-asm-navy">{inr(withdrawal.net)}</strong>{' '}
          for <strong className="font-semibold text-asm-navy">{withdrawal.user.name}</strong> will be
          rejected and the gross amount refunded to their wallet.
        </p>
        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
            Note (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Reason for rejection…"
            className={cn(
              'mt-1.5 w-full resize-none rounded-lg border border-asm-line bg-asm-tint px-3 py-2',
              'text-[13px] text-asm-navy placeholder:text-asm-muted',
              'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1',
            )}
          />
        </label>
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className={cn(
              'rounded-lg border border-asm-line px-3.5 py-2 text-[12px] font-semibold text-asm-body',
              'hover:bg-asm-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(note)}
            disabled={isPending}
            className={cn(
              'rounded-lg bg-asm-red px-3.5 py-2 text-[12px] font-semibold text-white',
              'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isPending ? 'Rejecting…' : 'Reject & refund'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Table skeleton ── */
function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-asm-line">
      {Array.from({ length: 7 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <span className="block h-3.5 rounded bg-asm-tint" />
        </td>
      ))}
    </tr>
  )
}

/* ── Main page ── */
export function AdminWithdrawals() {
  const { data, isLoading, isError } = useAdminWithdrawals('pending')
  const completeMutation = useCompleteWithdrawal()
  const rejectMutation = useRejectWithdrawal()

  const [completingId, setCompletingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [q, setQ] = useState('')

  const completingWithdrawal = data?.find((w) => w._id === completingId) ?? null
  const rejectingWithdrawal = data?.find((w) => w._id === rejectingId) ?? null

  const filtered = (data ?? []).filter((w) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      w.user.name.toLowerCase().includes(s) ||
      w.user.email.toLowerCase().includes(s) ||
      payoutView(w).search.includes(s)
    )
  })

  function handleCompleteConfirm() {
    if (!completingId) return
    completeMutation.mutate([completingId], {
      onSuccess: () => {
        setStatusMsg('Withdrawal marked as paid.')
        setCompletingId(null)
      },
      onError: () => {
        setStatusMsg('Failed to complete withdrawal.')
        setCompletingId(null)
      },
    })
  }

  function handleRejectConfirm(note: string) {
    if (!rejectingId) return
    rejectMutation.mutate([rejectingId, note || undefined], {
      onSuccess: () => {
        setStatusMsg('Withdrawal rejected and refunded.')
        setRejectingId(null)
      },
      onError: () => {
        setStatusMsg('Failed to reject withdrawal.')
        setRejectingId(null)
      },
    })
  }

  const isMutating = completeMutation.isPending || rejectMutation.isPending

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-asm-navy">Withdrawals</h1>
        <p className="mt-0.5 text-[13px] text-asm-muted">Pending withdrawal requests awaiting payment.</p>
      </div>

      <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or destination" />

      {/* Status announcer */}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {statusMsg}
      </p>

      {/* Status banner */}
      {statusMsg && (
        <p
          className={cn(
            'rounded-lg px-4 py-3 text-[13px] font-medium',
            statusMsg.includes('Failed')
              ? 'bg-red-50 text-asm-red'
              : 'bg-green-50 text-asm-green',
          )}
        >
          {statusMsg}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-asm-line bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <table className="w-full min-w-[800px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
              <th scope="col" className="px-3 py-2.5 text-left">User</th>
              <th scope="col" className="px-3 py-2.5 text-right">Gross</th>
              <th scope="col" className="px-3 py-2.5 text-right">TDS</th>
              <th scope="col" className="px-3 py-2.5 text-right">Net</th>
              <th scope="col" className="px-3 py-2.5 text-left">Destination</th>
              <th scope="col" className="px-3 py-2.5 text-left">Date</th>
              <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)
            ) : isError ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[13px] text-asm-red"
                  role="alert"
                >
                  Failed to load withdrawals. Please refresh.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-asm-tint">
                    <Inbox className="size-5 text-asm-muted" strokeWidth={1.5} aria-hidden />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold text-asm-navy">
                    {q ? 'No matching withdrawals' : 'No pending withdrawals'}
                  </p>
                  <p className="mt-1 text-[12px] text-asm-muted">
                    {q ? 'Try a different search.' : 'All withdrawal requests have been processed.'}
                  </p>
                </td>
              </tr>
            ) : (
              filtered.map((wd, idx) => (
                <tr
                  key={wd._id}
                  className={cn(
                    'border-b border-asm-line last:border-0',
                    idx % 2 === 0 ? 'bg-white' : 'bg-asm-tint/40',
                  )}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-asm-navy">{wd.user.name}</p>
                    <p className="text-[11px] text-asm-muted">{wd.user.email}</p>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-navy">
                    {inr(wd.gross)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-body">
                    {inr(wd.tds)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-asm-navy">
                    {inr(wd.net)}
                  </td>
                  <td className="px-3 py-2.5">
                    {(() => {
                      const dest = payoutView(wd)
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span
                            className={cn(
                              'inline-flex w-fit rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]',
                              dest.method === 'bank' ? 'bg-asm-blue/10 text-asm-blue' : 'bg-asm-green/10 text-asm-green',
                            )}
                          >
                            {dest.badge}
                          </span>
                          <span className="font-mono text-[11px] text-asm-navy">{dest.primary}</span>
                          {dest.secondary && <span className="text-[11px] text-asm-muted">{dest.secondary}</span>}
                        </div>
                      )
                    })()}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-asm-body">
                    {new Date(wd.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setCompletingId(wd._id)}
                        disabled={isMutating}
                        className={cn(
                          'rounded-md bg-asm-blue inline-flex min-h-[40px] items-center px-3 py-1.5 text-[11px] font-semibold text-white',
                          'hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                        )}
                      >
                        Mark paid
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(wd._id)}
                        disabled={isMutating}
                        className={cn(
                          'rounded-md border border-asm-line inline-flex min-h-[40px] items-center px-3 py-1.5 text-[11px] font-semibold text-asm-red',
                          'hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red focus-visible:ring-offset-1',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                        )}
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dialogs */}
      {completingWithdrawal && (
        <MarkPaidDialog
          withdrawal={completingWithdrawal}
          onConfirm={handleCompleteConfirm}
          onCancel={() => setCompletingId(null)}
          isPending={completeMutation.isPending}
        />
      )}
      {rejectingWithdrawal && (
        <RejectDialog
          withdrawal={rejectingWithdrawal}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingId(null)}
          isPending={rejectMutation.isPending}
        />
      )}
    </div>
  )
}
