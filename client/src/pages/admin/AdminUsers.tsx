import { useState } from 'react'
import { Link } from 'react-router'
import { Search, Users } from 'lucide-react'
import {
  useAdminUsers,
  useFreezeUser,
  useUnfreezeUser,
  useAdjustWallet,
} from '@/hooks/queries'
import type { AdminUser, AdminUsersParams } from '@/services/api/admin'
import { inr } from '@/lib/format'
import { formatUserId } from '@/lib/ids'
import { cn } from '@/lib/utils'

/* ── Adjust wallet dialog ── */
interface AdjustDialogProps {
  user: AdminUser
  onConfirm: (amount: number, direction: 'credit' | 'debit', note: string) => void
  onCancel: () => void
  isPending: boolean
}

function AdjustDialog({ user, onConfirm, onCancel, isPending }: AdjustDialogProps) {
  const [amountStr, setAmountStr] = useState('')
  const [direction, setDirection] = useState<'credit' | 'debit'>('credit')
  const [note, setNote] = useState('')

  const amountRupees = parseFloat(amountStr)
  const isValid = !Number.isNaN(amountRupees) && amountRupees > 0

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    // Convert rupees to paise
    onConfirm(Math.round(amountRupees * 100), direction, note)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="adjust-title" className="text-[15px] font-bold text-asm-navy">
          Adjust wallet — {user.name}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Direction */}
          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
              Direction
            </legend>
            <div className="mt-1.5 flex gap-2">
              {(['credit', 'debit'] as const).map((dir) => (
                <label key={dir} className="flex flex-1 items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="direction"
                    value={dir}
                    checked={direction === dir}
                    onChange={() => setDirection(dir)}
                    className="accent-asm-blue"
                  />
                  <span
                    className={cn(
                      'text-[13px] font-medium capitalize',
                      direction === dir
                        ? dir === 'credit'
                          ? 'text-asm-green'
                          : 'text-asm-red'
                        : 'text-asm-body',
                    )}
                  >
                    {dir}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* Amount */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
              Amount (₹)
            </span>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              required
              className={cn(
                'mt-1.5 w-full rounded-lg border border-asm-line bg-asm-tint px-3 py-2',
                'font-mono text-[13px] text-asm-navy placeholder:text-asm-muted',
                'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1',
              )}
            />
            {amountStr && !isValid && (
              <p className="mt-1 text-[11px] text-asm-red">Enter a valid positive amount.</p>
            )}
            {amountStr && isValid && (
              <p className="mt-1 text-[11px] text-asm-muted">
                = {inr(Math.round(amountRupees * 100))}
              </p>
            )}
          </label>

          {/* Note */}
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
              Note (optional)
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Reason for adjustment…"
              className={cn(
                'mt-1.5 w-full rounded-lg border border-asm-line bg-asm-tint px-3 py-2',
                'text-[13px] text-asm-navy placeholder:text-asm-muted',
                'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1',
              )}
            />
          </label>

          <div className="flex justify-end gap-2.5 pt-1">
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
              disabled={isPending || !isValid}
              className={cn(
                'rounded-lg bg-asm-blue px-3.5 py-2 text-[12px] font-semibold text-white',
                'hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
                'disabled:cursor-not-allowed disabled:opacity-50',
              )}
            >
              {isPending ? 'Adjusting…' : 'Apply'}
            </button>
          </div>
        </form>
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

/* ── Tier badge ── */
function TierChip({ tier }: { tier: AdminUser['tier'] }) {
  const styles: Record<AdminUser['tier'], string> = {
    silver: 'bg-slate-100 text-slate-600',
    gold: 'bg-amber-50 text-amber-700',
    diamond: 'bg-blue-50 text-blue-600',
  }
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', styles[tier])}>
      {tier}
    </span>
  )
}

/* ── Status badge ── */
function StatusChip({ status }: { status: AdminUser['status'] }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
        status === 'active' ? 'bg-green-50 text-asm-green' : 'bg-red-50 text-asm-red',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          status === 'active' ? 'bg-asm-green' : 'bg-asm-red',
        )}
        aria-hidden
      />
      {status}
    </span>
  )
}

/* ── Main page ── */
export function AdminUsers() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  type InvestorFilter = 'all' | 'investor' | 'non-investor'
  const [investorFilter, setInvestorFilter] = useState<InvestorFilter>('all')
  const [amountSort, setAmountSort] = useState<'invested' | '-invested' | undefined>(undefined)
  const { data, isLoading, isError } = useAdminUsers({
    q,
    investor: investorFilter === 'investor' ? 'true' : investorFilter === 'non-investor' ? 'false' : undefined,
    sort: amountSort,
  } as AdminUsersParams)
  const freezeMutation = useFreezeUser()
  const unfreezeMutation = useUnfreezeUser()
  const adjustMutation = useAdjustWallet()

  const [adjustingUser, setAdjustingUser] = useState<AdminUser | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  function handleToggleFreeze(user: AdminUser) {
    if (user.status === 'active') {
      freezeMutation.mutate([user._id], {
        onSuccess: () => setStatusMsg(`${user.name} has been frozen.`),
        onError: () => setStatusMsg('Failed to freeze user.'),
      })
    } else {
      unfreezeMutation.mutate([user._id], {
        onSuccess: () => setStatusMsg(`${user.name} has been unfrozen.`),
        onError: () => setStatusMsg('Failed to unfreeze user.'),
      })
    }
  }

  function handleAdjustConfirm(
    amount: number,
    direction: 'credit' | 'debit',
    note: string,
  ) {
    if (!adjustingUser) return
    adjustMutation.mutate([adjustingUser._id, { amount, direction, note: note || undefined }], {
      onSuccess: () => {
        setStatusMsg(`Wallet adjusted for ${adjustingUser.name}.`)
        setAdjustingUser(null)
      },
      onError: () => {
        setStatusMsg('Failed to adjust wallet.')
        setAdjustingUser(null)
      },
    })
  }

  const isMutating = freezeMutation.isPending || unfreezeMutation.isPending

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-asm-navy">Users</h1>
        <p className="mt-0.5 text-[13px] text-asm-muted">All registered platform members.</p>
      </div>

      {/* Search */}
      <form onSubmit={(e) => { e.preventDefault(); setQ(input.trim()) }} className="flex items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-asm-muted" aria-hidden />
          <input
            type="search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search by User ID, name or email"
            aria-label="Search users"
            className="w-full rounded-lg border border-asm-line bg-white py-2 pl-9 pr-3 text-[13px] text-asm-navy placeholder:text-asm-muted focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue"
          />
        </div>
        <button type="submit" className="rounded-lg bg-asm-blue px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue">
          Search
        </button>
        {q && (
          <button type="button" onClick={() => { setInput(''); setQ('') }} className="text-[12px] font-semibold text-asm-muted hover:text-asm-navy">
            Clear
          </button>
        )}
      </form>

      {/* Investor filter */}
      <div className="flex items-center gap-2">
        {(['all', 'investor', 'non-investor'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setInvestorFilter(f)}
            className={cn(
              'rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors',
              investorFilter === f
                ? 'bg-asm-blue text-white'
                : 'border border-asm-line bg-white text-asm-body hover:border-asm-blue hover:text-asm-blue',
            )}
            aria-pressed={investorFilter === f}
          >
            {f === 'all' ? 'All Users' : f === 'investor' ? 'Investors' : 'Non-investors'}
          </button>
        ))}
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
        <table className="w-full min-w-[900px] border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
              <th scope="col" className="px-3 py-2.5 text-left">User</th>
              <th scope="col" className="px-3 py-2.5 text-left">Tier</th>
              <th scope="col" className="px-3 py-2.5 text-right">Referrals</th>
              <th
                scope="col"
                className="px-3 py-2.5 text-right cursor-pointer hover:text-asm-blue select-none"
                onClick={() => setAmountSort((s) => s === '-invested' ? 'invested' : '-invested')}
                title="Sort by invested amount"
              >
                Total Invested {amountSort === 'invested' ? '↑' : amountSort === '-invested' ? '↓' : ''}
              </th>
              <th scope="col" className="px-3 py-2.5 text-left">Status</th>
              <th scope="col" className="px-3 py-2.5 text-left">Joined</th>
              <th scope="col" className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
            ) : isError ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-10 text-center text-[13px] text-asm-red"
                  role="alert"
                >
                  Failed to load users. Please refresh.
                </td>
              </tr>
            ) : !data || data.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center">
                  <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-asm-tint">
                    <Users className="size-5 text-asm-muted" strokeWidth={1.5} aria-hidden />
                  </span>
                  <p className="mt-3 text-[13px] font-semibold text-asm-navy">No users found</p>
                </td>
              </tr>
            ) : (
              data.map((user, idx) => (
                <tr
                  key={user._id}
                  className={cn(
                    'border-b border-asm-line last:border-0',
                    idx % 2 === 0 ? 'bg-white' : 'bg-asm-tint/40',
                  )}
                >
                  <td className="px-3 py-2.5">
                    <p className="font-medium text-asm-navy">{user.name}</p>
                    <p className="text-[11px] text-asm-muted">{user.email}</p>
                    {user.publicId && (
                      <p className="font-mono text-[10px] text-asm-blue">{formatUserId(user.publicId)}</p>
                    )}
                  </td>
                  <td className="px-3 py-2.5">
                    <TierChip tier={user.tier} />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-body">
                    {user.referralCount}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono tabular-nums text-asm-navy">
                    {user.totalInvested > 0 ? inr(user.totalInvested) : <span className="text-asm-muted">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusChip status={user.status} />
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-asm-body">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Link
                        to={`/admin/users/${user._id}`}
                        className="inline-flex min-h-[40px] items-center rounded-md border border-asm-line px-3 py-1.5 text-[11px] font-semibold text-asm-blue hover:bg-asm-blue-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1"
                      >
                        View
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleToggleFreeze(user)}
                        disabled={isMutating || adjustMutation.isPending}
                        className={cn(
                          'rounded-md inline-flex min-h-[40px] items-center px-3 py-1.5 text-[11px] font-semibold',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                          user.status === 'active'
                            ? 'border border-asm-line text-asm-red hover:bg-red-50 focus-visible:ring-asm-red'
                            : 'bg-asm-blue text-white hover:bg-asm-blue-dark focus-visible:ring-asm-blue',
                        )}
                      >
                        {user.status === 'active' ? 'Freeze' : 'Unfreeze'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdjustingUser(user)}
                        disabled={isMutating || adjustMutation.isPending}
                        className={cn(
                          'rounded-md border border-asm-line inline-flex min-h-[40px] items-center px-3 py-1.5 text-[11px] font-semibold text-asm-body',
                          'hover:bg-asm-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
                          'disabled:cursor-not-allowed disabled:opacity-40',
                        )}
                      >
                        Adjust wallet
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Adjust wallet dialog */}
      {adjustingUser && (
        <AdjustDialog
          user={adjustingUser}
          onConfirm={handleAdjustConfirm}
          onCancel={() => setAdjustingUser(null)}
          isPending={adjustMutation.isPending}
        />
      )}
    </div>
  )
}
