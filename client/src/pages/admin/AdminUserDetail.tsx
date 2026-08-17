import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  AtSign,
  Copy,
  Check,
  Landmark,
  Loader2,
} from 'lucide-react'

import { useAdminUserDetail, useFreezeUser, useUnfreezeUser, useAdjustWallet } from '@/hooks/queries'
import type { Transaction } from '@/types'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Deposit / Return dialog (wraps the adjust-wallet endpoint) ── */
function AdjustDialog({
  title,
  direction,
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string
  direction: 'credit' | 'debit'
  onConfirm: (amountPaise: number, note: string) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [amountStr, setAmountStr] = useState('')
  const [note, setNote] = useState('')
  const amountRupees = parseFloat(amountStr)
  const isValid = !Number.isNaN(amountRupees) && amountRupees > 0

  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border border-asm-line bg-white p-6 shadow-xl">
        <h2 className="text-[15px] font-bold text-asm-navy">{title}</h2>
        <form
          onSubmit={(e) => { e.preventDefault(); if (isValid) onConfirm(Math.round(amountRupees * 100), note) }}
          className="mt-4 flex flex-col gap-4"
        >
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">Amount (₹)</span>
            <input
              type="number" min="0.01" step="0.01" required autoFocus
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              placeholder="0.00"
              className="mt-1.5 w-full rounded-lg border border-asm-line bg-asm-tint px-3 py-2 font-mono text-[13px] text-asm-navy placeholder:text-asm-muted focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue"
            />
            {amountStr && isValid && <p className="mt-1 text-[11px] text-asm-muted">= {inr(Math.round(amountRupees * 100))}</p>}
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">Note (optional)</span>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason…"
              className="mt-1.5 w-full rounded-lg border border-asm-line bg-asm-tint px-3 py-2 text-[13px] text-asm-navy placeholder:text-asm-muted focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue"
            />
          </label>
          <div className="flex justify-end gap-2.5">
            <button type="button" onClick={onCancel} disabled={isPending} className="rounded-lg border border-asm-line px-3.5 py-2 text-[12px] font-semibold text-asm-body hover:bg-asm-tint disabled:opacity-50">
              Cancel
            </button>
            <button
              type="submit" disabled={isPending || !isValid}
              className={cn(
                'rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white disabled:opacity-50',
                direction === 'credit' ? 'bg-asm-greenInk hover:bg-green-800' : 'bg-asm-red hover:bg-red-700',
              )}
            >
              {isPending ? 'Applying…' : direction === 'credit' ? 'Deposit' : 'Return'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DIR_META: Record<Transaction['direction'], { Icon: typeof ArrowDownLeft; sign: '+' | '−'; color: string; bg: string }> = {
  credit: { Icon: ArrowDownLeft, sign: '+', color: 'text-asm-greenInk', bg: 'bg-asm-green-tint' },
  debit: { Icon: ArrowUpRight, sign: '−', color: 'text-asm-red', bg: 'bg-red-50' },
}

export function AdminUserDetail() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const { data, isLoading, isError } = useAdminUserDetail(id)
  const freeze = useFreezeUser()
  const unfreeze = useUnfreezeUser()
  const adjust = useAdjustWallet()

  const [dialog, setDialog] = useState<null | 'credit' | 'debit'>(null)
  const [msg, setMsg] = useState('')

  const refresh = () => qc.invalidateQueries({ queryKey: ['admin', 'user', id] })

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-asm-muted">
        <Loader2 className="size-5 animate-spin" aria-hidden /> <span className="text-[13px]">Loading…</span>
      </div>
    )
  }
  if (isError || !data) {
    return (
      <div className="p-6">
        <Link to="/admin/users" className="text-[13px] font-semibold text-asm-blue">← Back to users</Link>
        <p role="alert" className="mt-4 text-[13px] text-asm-red">Failed to load this user.</p>
      </div>
    )
  }

  const { user, balance, transactions } = data
  const payoutMethods = user.payoutMethods

  function toggleFreeze() {
    const m = user.status === 'active' ? freeze : unfreeze
    m.mutate([user._id], {
      onSuccess: () => { setMsg(`${user.name} ${user.status === 'active' ? 'frozen' : 'unfrozen'}.`); void refresh() },
      onError: () => setMsg('Action failed.'),
    })
  }

  function handleAdjust(amountPaise: number, note: string) {
    if (!dialog) return
    adjust.mutate([user._id, { amount: amountPaise, direction: dialog, note: note || undefined }], {
      onSuccess: () => { setMsg(`Wallet ${dialog === 'credit' ? 'credited' : 'debited'} for ${user.name}.`); setDialog(null); void refresh() },
      onError: () => { setMsg('Wallet adjustment failed.'); setDialog(null) },
    })
  }

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <Link to="/admin/users" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-asm-blue hover:text-asm-blue-dark">
        <ArrowLeft className="size-4" aria-hidden /> Back to users
      </Link>

      <p role="status" aria-live="polite" className="sr-only">{msg}</p>
      {msg && (
        <p className={cn('rounded-lg px-4 py-3 text-[13px] font-medium', msg.includes('failed') ? 'bg-red-50 text-asm-red' : 'bg-green-50 text-asm-green')}>
          {msg}
        </p>
      )}

      {/* Profile + actions */}
      <div className="rounded-xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {user.avatar ? (
              <img src={user.avatar} alt="" loading="lazy" decoding="async" className="size-14 rounded-2xl object-cover" />
            ) : (
              <span className="flex size-14 items-center justify-center rounded-2xl bg-asm-blue text-[18px] font-extrabold text-white" aria-hidden>
                {user.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div>
              <p className="text-[16px] font-bold text-asm-navy">{user.name}</p>
              <p className="text-[13px] text-asm-muted">{user.email}</p>
              {user.phone && <p className="text-[12px] text-asm-muted">{user.phone}</p>}
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                {user.publicId && <CopyId value={user.publicId} />}
                <span className="rounded-md bg-asm-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-asm-body">{user.tier}</span>
                <span className={cn('rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', user.status === 'active' ? 'bg-green-50 text-asm-green' : 'bg-red-50 text-asm-red')}>
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setDialog('credit')} disabled={adjust.isPending}
              className="rounded-lg bg-asm-greenInk px-3.5 py-2 text-[12px] font-semibold text-white hover:bg-green-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-greenInk disabled:opacity-50">
              Deposit to wallet
            </button>
            <button type="button" onClick={() => setDialog('debit')} disabled={adjust.isPending}
              className="rounded-lg border border-asm-line px-3.5 py-2 text-[12px] font-semibold text-asm-red hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red disabled:opacity-50">
              Deduct
            </button>
            <button type="button" onClick={toggleFreeze} disabled={freeze.isPending || unfreeze.isPending}
              className={cn(
                'rounded-lg px-3.5 py-2 text-[12px] font-semibold focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50',
                user.status === 'active' ? 'border border-asm-line text-asm-red hover:bg-red-50 focus-visible:ring-asm-red' : 'bg-asm-blue text-white hover:bg-asm-blue-dark focus-visible:ring-asm-blue',
              )}>
              {user.status === 'active' ? 'Freeze' : 'Unfreeze'}
            </button>
          </div>
        </div>

        {/* Balance */}
        <div className="mt-5 flex items-center gap-3 rounded-xl border border-asm-line bg-asm-tint/50 px-4 py-3">
          <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Wallet balance</span>
          <span className="font-mono text-[18px] font-bold tabular-nums text-asm-navy">{inr(balance)}</span>
        </div>
      </div>

      {/* Payout methods */}
      <section>
        <h2 className="mb-2 text-[13px] font-bold text-asm-navy">Payout methods</h2>
        <div className="rounded-xl border border-asm-line bg-white">
          {payoutMethods.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-asm-muted">No payout methods saved.</p>
          ) : (
            <ul className="divide-y divide-asm-line">
              {payoutMethods.map((m) => (
                <li key={m._id} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-asm-blue-tint text-asm-blue">
                    {m.type === 'bank' ? <Landmark className="size-4" aria-hidden /> : <AtSign className="size-4" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold text-asm-navy">
                      {m.type === 'bank' ? `${m.accountName} · A/C ${m.accountNumber}` : m.upiId}
                    </p>
                    <p className="text-[11px] text-asm-muted">{m.type === 'bank' ? m.ifsc : 'UPI'}{m.isDefault ? ' · Default' : ''}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Transaction history (deposits + withdrawals + adjustments) */}
      <section>
        <h2 className="mb-2 text-[13px] font-bold text-asm-navy">Transaction history</h2>
        <div className="rounded-xl border border-asm-line bg-white">
          {transactions.length === 0 ? (
            <p className="px-4 py-6 text-center text-[12px] text-asm-muted">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-asm-line">
              {transactions.map((tx) => {
                const meta = DIR_META[tx.direction]
                const { Icon } = meta
                return (
                  <li key={tx._id} className="flex items-center gap-3 px-4 py-3">
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', meta.bg)} aria-hidden>
                      <Icon className={cn('size-4', meta.color)} strokeWidth={2.2} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium capitalize text-asm-navy">{tx.note || tx.type}</p>
                      <p className="text-[11px] text-asm-muted">{tx.type} · {tx.actor} · {fmtDate(tx.createdAt)}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className={cn('font-mono text-[13px] font-bold tabular-nums', meta.color)}>{meta.sign}{inr(tx.amount)}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-asm-muted">{tx.status}</span>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>

      {dialog && (
        <AdjustDialog
          title={dialog === 'credit' ? `Deposit to ${user.name}'s wallet` : `Return / deduct from ${user.name}'s wallet`}
          direction={dialog}
          onConfirm={handleAdjust}
          onCancel={() => setDialog(null)}
          isPending={adjust.isPending}
        />
      )}
    </div>
  )
}

/* ── User ID with copy ── */
function CopyId({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500) } catch { /* ignore */ }
      }}
      className="inline-flex items-center gap-1 rounded-md bg-asm-blue-tint px-2 py-0.5 font-mono text-[11px] font-semibold text-asm-blue hover:bg-asm-blue/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
      aria-label="Copy User ID"
    >
      {value}
      {copied ? <Check className="size-3" strokeWidth={2.5} aria-hidden /> : <Copy className="size-3" aria-hidden />}
    </button>
  )
}
