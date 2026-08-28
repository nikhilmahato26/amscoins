import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import {
  useAdminUsers,
  useFreezeUser,
  useUnfreezeUser,
  useAdjustWallet,
} from '@/hooks/queries'
import type { AdminUser, AdminUsersParams } from '@/services/api/admin'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { SearchInput } from '@/components/admin/SearchInput'
import { StatusBanner } from '@/components/admin/StatusBanner'
import { AdminButton } from '@/components/admin/AdminButton'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { Pagination } from '@/components/admin/Pagination'
import { useClientTable } from '@/hooks/useClientTable'
import { inr } from '@/lib/format'
import { formatUserId } from '@/lib/ids'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'

/* ── Adjust wallet dialog (specialised form: direction + amount + note) ── */
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
    onConfirm(Math.round(amountRupees * 100), direction, note)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-title"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"
    >
      <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 id="adjust-title" className="text-[15px] font-bold text-asm-navy">
          Adjust wallet — {user.name}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          <fieldset>
            <legend className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">Direction</legend>
            <div className="mt-1.5 flex gap-2">
              {(['credit', 'debit'] as const).map((dir) => (
                <label key={dir} className="flex flex-1 cursor-pointer items-center gap-2">
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
                      direction === dir ? (dir === 'credit' ? 'text-asm-greenInk' : 'text-asm-red') : 'text-asm-body',
                    )}
                  >
                    {dir}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">Amount (₹)</span>
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
            {amountStr && !isValid && <p className="mt-1 text-[11px] text-asm-red">Enter a valid positive amount.</p>}
            {amountStr && isValid && (
              <p className="mt-1 text-[11px] text-asm-muted">= {inr(Math.round(amountRupees * 100))}</p>
            )}
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">Note (optional)</span>
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
            <AdminButton variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
              Cancel
            </AdminButton>
            <AdminButton type="submit" size="sm" disabled={isPending || !isValid}>
              {isPending ? 'Adjusting…' : 'Apply'}
            </AdminButton>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── User avatar ── */
function UserAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-asm-blue-tint text-[13px] font-bold text-asm-blue">
      {initials}
    </span>
  )
}

/* ── Tier badge ── */
const TIER_BADGE: Record<AdminUser['tier'], string> = {
  silver:  'bg-[#CED5E1]/40 text-[#5A6472] border-[#B1B5BB]/40',
  gold:    'bg-amber-50 text-amber-700 border-amber-200',
  diamond: 'bg-asm-blue-tint text-asm-blue border-asm-blue/20',
}
const TIER_BADGE_DARK: Record<AdminUser['tier'], string> = {
  silver:  'bg-[#2a2a2e] text-[#a0a8b4] border-[#3a3a42]',
  gold:    'bg-amber-900/30 text-amber-400 border-amber-700/40',
  diamond: 'bg-blue-900/30 text-[#5a96f5] border-blue-700/30',
}

function TierChip({ tier }: { tier: AdminUser['tier'] }) {
  const { isDark } = useTheme()
  const cls = (isDark ? TIER_BADGE_DARK : TIER_BADGE)[tier] ?? 'bg-asm-tint text-asm-muted border-asm-line'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize', cls)}>
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
        status === 'active' ? 'bg-green-50 text-asm-greenInk' : 'bg-red-50 text-asm-red',
      )}
    >
      <span className={cn('size-1.5 rounded-full', status === 'active' ? 'bg-asm-greenInk' : 'bg-asm-red')} aria-hidden />
      {status}
    </span>
  )
}

type InvestorFilter = 'all' | 'investor' | 'non-investor'

/* ── Main page ── */
export function AdminUsers() {
  const [input, setInput] = useState('')
  const [q, setQ] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  // Default view is Investors-first: with no explicit param, show investors.
  const investorFilter = (searchParams.get('investor') ?? 'investor') as InvestorFilter
  const [amountSort, setAmountSort] = useState<'invested' | '-invested' | undefined>(undefined)

  /* Debounce the search box into the server query so it feels real-time. */
  useEffect(() => {
    const id = setTimeout(() => setQ(input.trim()), 300)
    return () => clearTimeout(id)
  }, [input])

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

  const rows = data ?? []
  const table = useClientTable({ rows })

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

  function handleAdjustConfirm(amount: number, direction: 'credit' | 'debit', note: string) {
    if (!adjustingUser) return
    adjustMutation.mutate([adjustingUser._id, { amount, direction, note: note || undefined }], {
      onSuccess: () => { setStatusMsg(`Wallet adjusted for ${adjustingUser.name}.`); setAdjustingUser(null) },
      onError: () => { setStatusMsg('Failed to adjust wallet.'); setAdjustingUser(null) },
    })
  }

  const isMutating = freezeMutation.isPending || unfreezeMutation.isPending || adjustMutation.isPending

  const columns: Column<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <UserAvatar name={user.name} />
          <div>
            <p className="text-[13px] font-semibold text-asm-navy">{user.name}</p>
            <p className="text-[11px] text-asm-muted">{user.email}</p>
            {user.publicId && <p className="font-mono text-[10px] text-asm-blue">{formatUserId(user.publicId)}</p>}
          </div>
        </div>
      ),
    },
    { key: 'tier', header: 'Tier', render: (user) => <TierChip tier={user.tier} /> },
    { key: 'referrals', header: 'Referrals', align: 'right', className: 'font-mono tabular-nums text-asm-body', render: (user) => user.referralCount },
    {
      key: 'invested',
      align: 'right',
      className: 'font-mono tabular-nums',
      header: (
        <button
          type="button"
          onClick={() => setAmountSort((s) => (s === '-invested' ? 'invested' : '-invested'))}
          className="ml-auto flex select-none items-center gap-1 uppercase tracking-[0.07em] hover:text-asm-blue"
          title="Sort by invested amount"
        >
          Active Investments {amountSort === 'invested' ? '↑' : amountSort === '-invested' ? '↓' : ''}
        </button>
      ),
      render: (user) =>
        user.activeInvested > 0 ? (
          <span className="font-bold text-asm-blue">{inr(user.activeInvested)}</span>
        ) : (
          <span className="text-asm-muted">—</span>
        ),
    },
    { key: 'status', header: 'Status', render: (user) => <StatusChip status={user.status} /> },
    {
      key: 'joined',
      header: 'Joined',
      className: 'text-[12px] text-asm-body',
      render: (user) =>
        new Date(user.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    },
    {
      key: 'created',
      header: 'Account Created At',
      className: 'text-[12px] text-asm-muted',
      render: (user) =>
        new Date(user.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (user) => (
        <div className="flex justify-end gap-2">
          <Link
            to={`/admin/users/${user._id}`}
            className="inline-flex min-h-[40px] items-center rounded-md border border-asm-line px-3 py-1.5 text-[11px] font-semibold text-asm-blue hover:bg-asm-blue-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1"
          >
            View
          </Link>
          <AdminButton
            size="sm"
            variant={user.status === 'active' ? 'outline' : 'primary'}
            onClick={() => handleToggleFreeze(user)}
            disabled={isMutating}
          >
            {user.status === 'active' ? <span className="text-asm-red">Freeze</span> : 'Unfreeze'}
          </AdminButton>
          <AdminButton size="sm" variant="outline" onClick={() => setAdjustingUser(user)} disabled={isMutating}>
            Adjust wallet
          </AdminButton>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <AdminPageHeader title="Users" subtitle="All registered platform members." />

      <SearchInput value={input} onChange={setInput} placeholder="Search by User ID, name or email" />

      {/* Investor filter */}
      <div className="flex items-center gap-2">
        {(['investor', 'non-investor', 'all'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setSearchParams(f === 'investor' ? {} : { investor: f }, { replace: true })}
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

      <StatusBanner message={statusMsg} />

      <DataTable
        columns={columns}
        rows={table.pageRows}
        getRowKey={(user) => user._id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load users. Please refresh."
        minWidth={900}
        empty={<EmptyState title={q ? 'No matching users' : 'No users found'} />}
      />

      <Pagination
        page={table.page}
        pageCount={table.pageCount}
        total={table.total}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />

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
