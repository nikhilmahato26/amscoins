import { useState } from 'react'
import { Inbox } from 'lucide-react'
import {
  useAdminInvestments,
  useApproveInvestment,
  useRejectInvestment,
} from '@/hooks/queries'
import type { AdminInvestment } from '@/services/api/admin'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

/* ── Confirm approve dialog ── */
interface ApproveDialogProps {
  investment: AdminInvestment
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

function ApproveDialog({ investment, onConfirm, onCancel, isPending }: ApproveDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="approve-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="approve-title" className="text-[15px] font-bold text-asm-navy">
          Approve deposit?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          This will credit <strong className="font-semibold text-asm-navy">{inr(investment.amount)}</strong> to{' '}
          <strong className="font-semibold text-asm-navy">{investment.user.name}</strong>'s wallet and
          apply referral bonuses. This cannot be undone.
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
            {isPending ? 'Approving…' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ── Reject dialog ── */
interface RejectDialogProps {
  investment: AdminInvestment
  onConfirm: (note: string) => void
  onCancel: () => void
  isPending: boolean
}

function RejectDialog({ investment, onConfirm, onCancel, isPending }: RejectDialogProps) {
  const [note, setNote] = useState('')

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="reject-title" className="text-[15px] font-bold text-asm-navy">
          Reject deposit?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Deposit of <strong className="font-semibold text-asm-navy">{inr(investment.amount)}</strong>{' '}
          from <strong className="font-semibold text-asm-navy">{investment.user.name}</strong> will be rejected.
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
            {isPending ? 'Rejecting…' : 'Reject'}
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
      {Array.from({ length: 6 }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <span className="block h-3.5 rounded bg-asm-tint" />
        </td>
      ))}
    </tr>
  )
}

/* ── Main page ── */
export function AdminDeposits() {
  const { data, isLoading, isError } = useAdminInvestments('pending')
  const approveMutation = useApproveInvestment()
  const rejectMutation = useRejectInvestment()

  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const approvingInvestment = data?.find((d) => d._id === approvingId) ?? null
  const rejectingInvestment = data?.find((d) => d._id === rejectingId) ?? null

  function handleApproveConfirm() {
    if (!approvingId) return
    approveMutation.mutate([approvingId], {
      onSuccess: () => {
        setStatusMsg('Deposit approved successfully.')
        setApprovingId(null)
      },
      onError: () => {
        setStatusMsg('Failed to approve deposit.')
        setApprovingId(null)
      },
    })
  }

  function handleRejectConfirm(note: string) {
    if (!rejectingId) return
    rejectMutation.mutate([rejectingId, note || undefined], {
      onSuccess: () => {
        setStatusMsg('Deposit rejected.')
        setRejectingId(null)
      },
      onError: () => {
        setStatusMsg('Failed to reject deposit.')
        setRejectingId(null)
      },
    })
  }

  const isMutating = approveMutation.isPending || rejectMutation.isPending

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-asm-navy">Deposits</h1>
        <p className="mt-0.5 text-[13px] text-asm-muted">Pending deposit requests awaiting review.</p>
      </div>

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
        <table className="w-full min-w-[700px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
              <th scope="col" className="px-3 py-2.5 text-left">User</th>
              <th scope="col" className="px-3 py-2.5 text-left">Plan</th>
              <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
              <th scope="col" className="px-3 py-2.5 text-left">Reference</th>
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
                  colSpan={6}
                  className="px-4 py-10 text-center text-[13px] text-asm-red"
                  role="alert"
                >
                  Failed to load deposits. Please refresh.
                </td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-asm-tint">
                    <Inbox className="size-5 text-asm-muted" strokeWidth={1.5} aria-hidden />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold text-asm-navy">No pending deposits</p>
                  <p className="mt-1 text-[12px] text-asm-muted">All deposit requests have been reviewed.</p>
                </td>
              </tr>
            ) : (
              data.map((dep, idx) => (
                <tr
                  key={dep._id}
                  className={cn(
                    'border-b border-asm-line last:border-0',
                    idx % 2 === 0 ? 'bg-white' : 'bg-asm-tint/40',
                  )}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-asm-navy">{dep.user.name}</p>
                    <p className="text-[11px] text-asm-muted">{dep.user.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
                      {dep.planKey}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-navy">
                    {inr(dep.amount)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-asm-body">
                    {dep.referenceCode}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-asm-body">
                    {new Date(dep.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setApprovingId(dep._id)}
                        disabled={isMutating}
                        className={cn(
                          'rounded-md bg-asm-blue inline-flex min-h-[40px] items-center px-3 py-1.5 text-[11px] font-semibold text-white',
                          'hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                        )}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectingId(dep._id)}
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
      {approvingInvestment && (
        <ApproveDialog
          investment={approvingInvestment}
          onConfirm={handleApproveConfirm}
          onCancel={() => setApprovingId(null)}
          isPending={approveMutation.isPending}
        />
      )}
      {rejectingInvestment && (
        <RejectDialog
          investment={rejectingInvestment}
          onConfirm={handleRejectConfirm}
          onCancel={() => setRejectingId(null)}
          isPending={rejectMutation.isPending}
        />
      )}
    </div>
  )
}
