import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Inbox } from 'lucide-react'
import {
  useAdminInvestments,
  useApproveInvestment,
  useRejectInvestment,
  useApproveReturn,
  useRejectReturn,
} from '@/hooks/queries'
import type { AdminInvestment } from '@/services/api/admin'
import { SearchInput } from '@/components/admin/SearchInput'
import { InvestmentCountdown } from '@/components/admin/InvestmentCountdown'
import { inr } from '@/lib/format'
import { formatInvestId, IdChip } from '@/lib/ids'
import { cn } from '@/lib/utils'

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function fmtDuration(from: string, to: string) {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (ms < 0) return '-'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

// ── Status badge ───────────────────────────────────────────────────────────

type InvStatus = AdminInvestment['status']

const STATUS_STYLES: Record<InvStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-asm-blue-tint text-asm-blue',
  matured: 'bg-purple-50 text-purple-700',
  returned: 'bg-green-50 text-asm-green',
  rejected: 'bg-red-50 text-asm-red',
}

function StatusBadge({ status }: { status: InvStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  )
}

// ── Skeleton row ───────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr className="animate-pulse border-b border-asm-line">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-3 py-3">
          <span className="block h-3.5 rounded bg-asm-tint" />
        </td>
      ))}
    </tr>
  )
}

// ── Empty state ────────────────────────────────────────────────────────────

function EmptyRow({ colSpan, q, label }: { colSpan: number; q: string; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-16 text-center">
        <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-asm-tint">
          <Inbox className="size-5 text-asm-muted" strokeWidth={1.5} aria-hidden />
        </span>
        <p className="mt-3 text-[13px] font-semibold text-asm-navy">
          {q ? 'No matching investments' : `No ${label} investments`}
        </p>
        <p className="mt-1 text-[12px] text-asm-muted">
          {q ? 'Try a different search.' : 'Nothing to review right now.'}
        </p>
      </td>
    </tr>
  )
}

// ── Approve (investment) dialog ────────────────────────────────────────────

interface ApprovInvDialogProps {
  inv: AdminInvestment
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

function ApproveInvDialog({ inv, onConfirm, onCancel, isPending }: ApprovInvDialogProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appinv-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="appinv-title" className="text-[15px] font-bold text-asm-navy">
          Approve investment?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Activate <strong className="font-semibold text-asm-navy">{inr(inv.amount)}</strong> investment
          from <strong className="font-semibold text-asm-navy">{inv.user.name}</strong>. The 36-hour
          term will start immediately. This cannot be undone.
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

// ── Reject (investment) dialog ─────────────────────────────────────────────

interface RejectInvDialogProps {
  inv: AdminInvestment
  onConfirm: (note: string) => void
  onCancel: () => void
  isPending: boolean
}

function RejectInvDialog({ inv, onConfirm, onCancel, isPending }: RejectInvDialogProps) {
  const [note, setNote] = useState('')
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rejinv-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="rejinv-title" className="text-[15px] font-bold text-asm-navy">
          Reject investment?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Investment of <strong className="font-semibold text-asm-navy">{inr(inv.amount)}</strong> from{' '}
          <strong className="font-semibold text-asm-navy">{inv.user.name}</strong> will be rejected.
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

// ── Approve return dialog ──────────────────────────────────────────────────

interface ApproveReturnDialogProps {
  inv: AdminInvestment
  onConfirm: () => void
  onCancel: () => void
  isPending: boolean
}

function ApproveReturnDialog({ inv, onConfirm, onCancel, isPending }: ApproveReturnDialogProps) {
  const total = inv.amount + (inv.expectedReturn ?? 0)
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="appret-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="appret-title" className="text-[15px] font-bold text-asm-navy">
          Approve return?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Credit full return of{' '}
          <strong className="font-semibold text-asm-navy">{inr(total)}</strong> to{' '}
          <strong className="font-semibold text-asm-navy">{inv.user.name}</strong>'s wallet. This
          cannot be undone.
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
              'rounded-lg bg-asm-green px-3.5 py-2 text-[12px] font-semibold text-white',
              'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-green focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            {isPending ? 'Approving…' : 'Approve return'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Reject return dialog (react-hook-form + zod) ───────────────────────────

interface RejectReturnDialogProps {
  inv: AdminInvestment
  onConfirm: (reason: string, amountPaise: number) => void
  onCancel: () => void
  isPending: boolean
}

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

function RejectReturnDialog({ inv, onConfirm, onCancel, isPending }: RejectReturnDialogProps) {
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="rejret-title" className="text-[15px] font-bold text-asm-navy">
          Reject return?
        </h2>
        <p className="mt-2 text-[13px] text-asm-body">
          Reject the return for{' '}
          <strong className="font-semibold text-asm-navy">{inv.user.name}</strong>. Enter a reason
          and the partial amount (in rupees) to credit — max{' '}
          <strong className="font-semibold text-asm-navy">{inr(inv.amount + (inv.expectedReturn ?? 0))}</strong>.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-4 flex flex-col gap-4">
          {/* Reason */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
              Reason *
            </span>
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

          {/* Custom amount */}
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
              0 = no credit; max {inr(inv.amount + (inv.expectedReturn ?? 0))} (principal +
              expected return).
            </p>
          </label>

          <div className="flex justify-end gap-2.5">
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
              type="submit"
              disabled={isPending}
              className={cn(
                'rounded-lg bg-asm-red px-3.5 py-2 text-[12px] font-semibold text-white',
                'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {isPending ? 'Submitting…' : 'Reject return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tab bar ────────────────────────────────────────────────────────────────

type Tab = 'investments' | 'returns' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'investments', label: 'Investments' },
  { id: 'returns', label: 'Returns' },
  { id: 'history', label: 'History' },
]

// ── Investment tab ─────────────────────────────────────────────────────────

function InvestmentTab() {
  const { data, isLoading, isError } = useAdminInvestments('pending,active')
  const approveMutation = useApproveInvestment()
  const rejectMutation = useRejectInvestment()

  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [q, setQ] = useState('')

  const approvingInv = data?.find((d) => d._id === approvingId) ?? null
  const rejectingInv = data?.find((d) => d._id === rejectingId) ?? null

  const filtered = (data ?? []).filter((d) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      d.user.name.toLowerCase().includes(s) ||
      d.user.email.toLowerCase().includes(s) ||
      d.referenceCode.toLowerCase().includes(s) ||
      d.planKey.toLowerCase().includes(s)
    )
  })

  const isMutating = approveMutation.isPending || rejectMutation.isPending

  function handleApprove() {
    if (!approvingId) return
    approveMutation.mutate([approvingId], {
      onSuccess: () => { setStatusMsg('Investment approved.'); setApprovingId(null) },
      onError: () => { setStatusMsg('Failed to approve investment.'); setApprovingId(null) },
    })
  }

  function handleReject(note: string) {
    if (!rejectingId) return
    rejectMutation.mutate([rejectingId, note || undefined], {
      onSuccess: () => { setStatusMsg('Investment rejected.'); setRejectingId(null) },
      onError: () => { setStatusMsg('Failed to reject investment.'); setRejectingId(null) },
    })
  }

  return (
    <>
      <SearchInput value={q} onChange={setQ} placeholder="Search by name, email, reference or plan" />

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{statusMsg}</p>
      {statusMsg && (
        <p className={cn('rounded-lg px-4 py-3 text-[13px] font-medium', statusMsg.includes('Failed') ? 'bg-red-50 text-asm-red' : 'bg-green-50 text-asm-green')}>
          {statusMsg}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-asm-line bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <table className="w-full min-w-[760px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
              <th scope="col" className="px-3 py-2.5 text-left">User</th>
              <th scope="col" className="px-3 py-2.5 text-left">Plan</th>
              <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
              <th scope="col" className="px-3 py-2.5 text-left">Reference</th>
              <th scope="col" className="px-3 py-2.5 text-left">Date</th>
              <th scope="col" className="px-3 py-2.5 text-left">Status / Countdown</th>
              <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
            ) : isError ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-asm-red" role="alert">
                  Failed to load investments. Please refresh.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={7} q={q} label="pending or active" />
            ) : (
              filtered.map((inv, idx) => (
                <tr
                  key={inv._id}
                  className={cn('border-b border-asm-line last:border-0', idx % 2 === 0 ? 'bg-white' : 'bg-asm-tint/40')}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-asm-navy">{inv.user.name}</p>
                    <p className="text-[11px] text-asm-muted">{inv.user.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
                      {inv.planKey}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-navy">
                    {inr(inv.amount)}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-asm-body">
                    <IdChip label={formatInvestId(inv.referenceCode)} />
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-asm-body">
                    {fmt(inv.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    {inv.status === 'active' && inv.maturesAt ? (
                      <div className="flex flex-col gap-1">
                        <StatusBadge status="active" />
                        <span className="font-mono text-[11px] tabular-nums text-asm-muted" data-testid="countdown">
                          <InvestmentCountdown maturesAt={inv.maturesAt} />
                        </span>
                      </div>
                    ) : (
                      <StatusBadge status={inv.status} />
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    {inv.status === 'pending' ? (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          data-testid="approve-investment"
                          onClick={() => setApprovingId(inv._id)}
                          disabled={isMutating}
                          className={cn(
                            'inline-flex min-h-[36px] items-center rounded-md bg-asm-blue px-3 py-1.5 text-[11px] font-semibold text-white',
                            'hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
                            'disabled:cursor-not-allowed disabled:opacity-40',
                          )}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          data-testid="reject-investment"
                          onClick={() => setRejectingId(inv._id)}
                          disabled={isMutating}
                          className={cn(
                            'inline-flex min-h-[36px] items-center rounded-md border border-asm-line px-3 py-1.5 text-[11px] font-semibold text-asm-red',
                            'hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red focus-visible:ring-offset-1',
                            'disabled:cursor-not-allowed disabled:opacity-40',
                          )}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="block text-right text-[11px] text-asm-muted">Active</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {approvingInv && (
        <ApproveInvDialog
          inv={approvingInv}
          onConfirm={handleApprove}
          onCancel={() => setApprovingId(null)}
          isPending={approveMutation.isPending}
        />
      )}
      {rejectingInv && (
        <RejectInvDialog
          inv={rejectingInv}
          onConfirm={handleReject}
          onCancel={() => setRejectingId(null)}
          isPending={rejectMutation.isPending}
        />
      )}
    </>
  )
}

// ── Return tab ─────────────────────────────────────────────────────────────

function ReturnTab() {
  const { data, isLoading, isError } = useAdminInvestments('matured')
  const approveMutation = useApproveReturn()
  const rejectMutation = useRejectReturn()

  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [q, setQ] = useState('')

  const approvingInv = data?.find((d) => d._id === approvingId) ?? null
  const rejectingInv = data?.find((d) => d._id === rejectingId) ?? null

  const filtered = (data ?? []).filter((d) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      d.user.name.toLowerCase().includes(s) ||
      d.user.email.toLowerCase().includes(s) ||
      d.referenceCode.toLowerCase().includes(s) ||
      d.planKey.toLowerCase().includes(s)
    )
  })

  const isMutating = approveMutation.isPending || rejectMutation.isPending

  function handleApprove() {
    if (!approvingId) return
    approveMutation.mutate([approvingId], {
      onSuccess: () => { setStatusMsg('Return approved and credited.'); setApprovingId(null) },
      onError: () => { setStatusMsg('Failed to approve return.'); setApprovingId(null) },
    })
  }

  function handleReject(reason: string, amountPaise: number) {
    if (!rejectingId) return
    rejectMutation.mutate([rejectingId, { reason, amount: amountPaise }], {
      onSuccess: () => { setStatusMsg('Return rejected.'); setRejectingId(null) },
      onError: () => { setStatusMsg('Failed to reject return.'); setRejectingId(null) },
    })
  }

  return (
    <>
      <SearchInput value={q} onChange={setQ} placeholder="Search by name, email, reference or plan" />

      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{statusMsg}</p>
      {statusMsg && (
        <p className={cn('rounded-lg px-4 py-3 text-[13px] font-medium', statusMsg.includes('Failed') ? 'bg-red-50 text-asm-red' : 'bg-green-50 text-asm-green')}>
          {statusMsg}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-asm-line bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
              <th scope="col" className="px-3 py-2.5 text-left">User</th>
              <th scope="col" className="px-3 py-2.5 text-left">Plan</th>
              <th scope="col" className="px-3 py-2.5 text-right">Principal</th>
              <th scope="col" className="px-3 py-2.5 text-right">Expected return</th>
              <th scope="col" className="px-3 py-2.5 text-right">Return %</th>
              <th scope="col" className="px-3 py-2.5 text-left">Reference</th>
              <th scope="col" className="px-3 py-2.5 text-left">Matured</th>
              <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={8} />)
            ) : isError ? (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13px] text-asm-red" role="alert">
                  Failed to load matured investments. Please refresh.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={8} q={q} label="matured" />
            ) : (
              filtered.map((inv, idx) => (
                <tr
                  key={inv._id}
                  className={cn('border-b border-asm-line last:border-0', idx % 2 === 0 ? 'bg-white' : 'bg-asm-tint/40')}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-asm-navy">{inv.user.name}</p>
                    <p className="text-[11px] text-asm-muted">{inv.user.email}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
                      {inv.planKey}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-navy">
                    {inr(inv.amount)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-green font-semibold">
                    {inr(inv.expectedReturn)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-body">
                    {inv.returnPct}%
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px] text-asm-body">
                    <IdChip label={formatInvestId(inv.referenceCode)} />
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-asm-body">
                    {inv.maturesAt ? fmt(inv.maturesAt) : '-'}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        data-testid="approve-return"
                        onClick={() => setApprovingId(inv._id)}
                        disabled={isMutating}
                        className={cn(
                          'inline-flex min-h-[36px] items-center rounded-md bg-asm-green px-3 py-1.5 text-[11px] font-semibold text-white',
                          'hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-green focus-visible:ring-offset-1',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                        )}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        data-testid="reject-return"
                        onClick={() => setRejectingId(inv._id)}
                        disabled={isMutating}
                        className={cn(
                          'inline-flex min-h-[36px] items-center rounded-md border border-asm-line px-3 py-1.5 text-[11px] font-semibold text-asm-red',
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

      {approvingInv && (
        <ApproveReturnDialog
          inv={approvingInv}
          onConfirm={handleApprove}
          onCancel={() => setApprovingId(null)}
          isPending={approveMutation.isPending}
        />
      )}
      {rejectingInv && (
        <RejectReturnDialog
          inv={rejectingInv}
          onConfirm={handleReject}
          onCancel={() => setRejectingId(null)}
          isPending={rejectMutation.isPending}
        />
      )}
    </>
  )
}

// ── History tab ────────────────────────────────────────────────────────────

function HistoryTab() {
  const { data, isLoading, isError } = useAdminInvestments('returned,rejected')
  const [q, setQ] = useState('')

  const filtered = (data ?? []).filter((d) => {
    if (!q.trim()) return true
    const s = q.toLowerCase()
    return (
      d.user.name.toLowerCase().includes(s) ||
      d.user.email.toLowerCase().includes(s) ||
      d.referenceCode.toLowerCase().includes(s) ||
      d.planKey.toLowerCase().includes(s)
    )
  })

  return (
    <>
      <SearchInput value={q} onChange={setQ} placeholder="Search by name, email, reference or plan" />

      <div className="overflow-x-auto rounded-xl border border-asm-line bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <table className="w-full min-w-[820px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
              <th scope="col" className="px-3 py-2.5 text-left">User</th>
              <th scope="col" className="px-3 py-2.5 text-left">Plan</th>
              <th scope="col" className="px-3 py-2.5 text-right">Principal</th>
              <th scope="col" className="px-3 py-2.5 text-right">Credited</th>
              <th scope="col" className="px-3 py-2.5 text-left">Reference</th>
              <th scope="col" className="px-3 py-2.5 text-left">Duration</th>
              <th scope="col" className="px-3 py-2.5 text-left">Final status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} cols={7} />)
            ) : isError ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-asm-red" role="alert">
                  Failed to load history. Please refresh.
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <EmptyRow colSpan={7} q={q} label="completed" />
            ) : (
              filtered.map((inv, idx) => {
                const startDate = inv.startAt ?? inv.createdAt
                const endDate = inv.maturesAt ?? inv.createdAt
                return (
                  <tr
                    key={inv._id}
                    className={cn('border-b border-asm-line last:border-0', idx % 2 === 0 ? 'bg-white' : 'bg-asm-tint/40')}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-asm-navy">{inv.user.name}</p>
                      <p className="text-[11px] text-asm-muted">{inv.user.email}</p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
                        {inv.planKey}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-navy">
                      {inr(inv.amount)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-navy">
                      {inv.creditedAmount != null ? inr(inv.creditedAmount) : inr(inv.amount + (inv.expectedReturn ?? 0))}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-asm-body">
                      <IdChip label={formatInvestId(inv.referenceCode)} />
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-asm-body">
                      {fmtDuration(startDate, endDate)}
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusBadge status={inv.status} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Main page ──────────────────────────────────────────────────────────────

export function AdminInvestments() {
  const [activeTab, setActiveTab] = useState<Tab>('investments')

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-asm-navy">Investments</h1>
        <p className="mt-0.5 text-[13px] text-asm-muted">
          Review pending investments, process matured returns, and view history.
        </p>
      </div>

      {/* Tab bar */}
      <div
        role="tablist"
        aria-label="Investment sections"
        className="flex gap-1 rounded-xl border border-asm-line bg-asm-tint p-1"
      >
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`tabpanel-${id}`}
            id={`tab-${id}`}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'flex-1 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
              activeTab === id
                ? 'bg-white text-asm-navy shadow-[0_1px_3px_rgba(16,42,92,0.08)]'
                : 'text-asm-muted hover:text-asm-body',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="flex flex-col gap-4"
      >
        {activeTab === 'investments' && <InvestmentTab />}
        {activeTab === 'returns' && <ReturnTab />}
        {activeTab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}
