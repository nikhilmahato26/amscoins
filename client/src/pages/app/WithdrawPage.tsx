import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Building2,
  Check,
  ChevronRight,
  Clock,
  IndianRupee,
  Info,
  Landmark,
  Loader2,
  Plus,
  User,
  Wallet,
  XCircle,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { useAuth } from '@/auth/AuthContext'
import { useWallet, useWithdrawals, useCreateWithdrawal } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { ApiError } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Withdrawal } from '@/services/api/withdrawals'

/* ── Constants (in rupees for UI display; converted to paise on submit) ── */
const MIN_WITHDRAWAL_RS = 500
const MAX_WITHDRAWAL_RS = 100_000

/* ── Motion variants ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

/* ── Helpers ── */
const rupeesCompact = (value: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)

function statusLabel(status: Withdrawal['status']): { label: string; cls: string } {
  switch (status) {
    case 'completed': return { label: 'Completed',   cls: 'bg-asm-green-tint text-asm-greenInk' }
    case 'rejected':  return { label: 'Rejected',    cls: 'bg-red-50 text-red-600'              }
    default:          return { label: 'Pending',     cls: 'bg-amber-50 text-amber-600'          }
  }
}

/* ── Page ── */
export function WithdrawPage() {
  const { user } = useAuth()
  const { data: walletData, isLoading: walletLoading } = useWallet()
  const { data: withdrawalsData, isLoading: withdrawalsLoading } = useWithdrawals()
  const mutation = useCreateWithdrawal()

  const payoutMethods = user?.payoutMethods ?? []

  const [amount, setAmount]       = useState('')
  const [destMode, setDestMode]   = useState<'saved' | 'new'>(payoutMethods.length ? 'saved' : 'new')
  const [selectedMethodId, setSelectedMethodId] = useState<string>(
    () => payoutMethods.find((m) => m.isDefault)?.id ?? payoutMethods[0]?.id ?? ''
  )
  const [newType, setNewType]     = useState<'upi' | 'bank'>('upi')
  const [upiId, setUpiId]         = useState('')
  const [accountName, setAccountName]     = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [ifsc, setIfsc]           = useState('')
  const [fieldError, setFieldError] = useState<string | null>(null)

  /* Balance in paise from API; convert to rupees for UI */
  const balancePaise = walletData?.balance ?? 0
  const balanceRs    = balancePaise / 100

  const parsedRs  = Number.parseFloat(amount)
  const validRs   = Number.isFinite(parsedRs) && parsedRs > 0 ? parsedRs : 0
  const validPaise = Math.round(validRs * 100)

  /* Client-side validation */
  function validate(): string | null {
    if (validRs <= 0)                         return 'Enter a valid amount.'
    if (validRs < MIN_WITHDRAWAL_RS)           return `Minimum withdrawal is ₹${rupeesCompact(MIN_WITHDRAWAL_RS)}.`
    if (validRs > MAX_WITHDRAWAL_RS)           return `Maximum withdrawal is ₹${rupeesCompact(MAX_WITHDRAWAL_RS)}.`
    if (validPaise > balancePaise)             return 'Amount exceeds your available balance.'
    if (destMode === 'saved') {
      if (!selectedMethodId)                   return 'Select a payout method.'
    } else if (newType === 'upi') {
      if (!upiId.trim().includes('@'))         return 'Enter a valid UPI ID (e.g. name@okicici).'
    } else {
      if (accountName.trim().length < 2)                 return 'Enter the account holder name.'
      if (!/^\d{6,18}$/.test(accountNumber.trim()))       return 'Enter a valid account number.'
      if (!/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/.test(ifsc.trim())) return 'Enter a valid IFSC code (e.g. HDFC0001234).'
    }
    return null
  }

  function handleSubmit() {
    setFieldError(null)
    const err = validate()
    if (err) { setFieldError(err); return }
    if (destMode === 'saved') {
      mutation.mutate({ amount: validPaise, payoutMethodId: selectedMethodId })
    } else if (newType === 'upi') {
      mutation.mutate({ amount: validPaise, upiId: upiId.trim() })
    } else {
      mutation.mutate({
        amount: validPaise,
        accountName: accountName.trim(),
        accountNumber: accountNumber.trim(),
        ifsc: ifsc.trim().toUpperCase(),
      })
    }
  }

  /* ── Success state — TDS breakdown ── */
  if (mutation.isSuccess && mutation.data) {
    const w = mutation.data
    return (
      <AppShell backTo="/app">
        <div className="flex flex-col items-center gap-6 py-12 text-center lg:mx-auto lg:max-w-[480px]">
          <span className="flex size-16 items-center justify-center rounded-full bg-asm-green-tint">
            <Check className="size-8 text-asm-greenInk" strokeWidth={2.5} aria-hidden />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-asm-navy">
              Withdrawal initiated
            </h1>
            <p className="text-[14px] leading-relaxed text-asm-body" aria-live="polite">
              Funds reach your bank within{' '}
              <span className="font-bold text-asm-navy">3 hours</span>{' '}
              after admin verification. You'll get an email.
            </p>
          </div>

          {/* TDS breakdown */}
          <div className="w-full rounded-2xl border border-asm-line bg-white px-6 py-5 text-left shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-asm-muted">Breakdown</p>
            <div className="mt-4 flex flex-col gap-3">
              <BreakdownRow label="Gross amount" value={inr(w.gross)} />
              <BreakdownRow label="TDS (5%)" value={`− ${inr(w.tds)}`} valueClass="text-red-600" />
              <span className="block h-px w-full bg-asm-line" />
              <BreakdownRow label="Net payout" value={inr(w.net)} valueClass="text-asm-greenInk text-base font-extrabold" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => { mutation.reset(); setAmount(''); setUpiId(''); setAccountName(''); setAccountNumber(''); setIfsc('') }}
            className="flex min-h-[44px] items-center text-[13px] font-semibold text-asm-muted transition-colors hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue rounded"
          >
            Make another withdrawal
          </button>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell backTo="/app" width="wide">
      <motion.div
        className="flex flex-col gap-5 lg:mx-auto lg:max-w-[560px]"
        variants={container}
        initial="hidden"
        animate="visible"
      >

        {/* ── Balance card ── */}
        <motion.section variants={fadeUp} className="flex items-center justify-between rounded-2xl border border-asm-line bg-white p-[17px] shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
          <div className="flex items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50">
              <Wallet className="size-5 text-amber-600" aria-hidden />
            </span>
            <div className="flex flex-col pl-4">
              <span className="text-[11px] font-bold uppercase leading-[15px] tracking-[1px] text-asm-muted">
                Withdrawable balance
              </span>
              {walletLoading ? (
                <span className="mt-0.5 flex items-center gap-1.5 font-mono text-xl font-bold tabular-nums leading-7 text-asm-muted">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Loading…
                </span>
              ) : (
                <span className="mt-0.5 font-mono text-xl font-bold tabular-nums leading-7 text-asm-navy">
                  {inr(balancePaise)}
                </span>
              )}
            </div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-asm-muted" aria-hidden />
        </motion.section>

        {/* ── Amount ── */}
        <motion.section variants={fadeUp} className="flex flex-col gap-3">
          <SectionLabel>Amount to withdraw</SectionLabel>
          <label className="flex h-14 cursor-text items-center gap-3 rounded-xl border border-asm-line bg-white px-4 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)] focus-within:ring-2 focus-within:ring-asm-blue">
            <IndianRupee className="size-3.5 shrink-0 text-asm-muted" aria-hidden />
            <input
              value={amount}
              onChange={(event) => { setAmount(event.target.value); setFieldError(null) }}
              inputMode="decimal"
              placeholder="0"
              aria-label="Amount to withdraw in rupees"
              className="min-w-0 flex-1 self-stretch bg-transparent font-mono text-base font-bold tabular-nums text-asm-navy outline-none focus-visible:!outline-none placeholder:font-sans placeholder:font-bold placeholder:text-asm-muted/50"
            />
            <span className="shrink-0 text-[12px] font-bold text-asm-muted">INR</span>
          </label>
          <p className="px-1 text-[11px] leading-[15px] text-asm-muted">
            Min <span className="font-bold text-asm-navy">₹{rupeesCompact(MIN_WITHDRAWAL_RS)}</span>
            {' '}·{' '}
            Max <span className="font-bold text-asm-blue">₹{rupeesCompact(MAX_WITHDRAWAL_RS)}</span>
            {!walletLoading && (
              <>
                {' '}·{' '}
                Balance <span className="font-bold text-asm-greenInk">₹{rupeesCompact(balanceRs)}</span>
              </>
            )}
          </p>
        </motion.section>

        {/* ── Payout destination ── */}
        <motion.section variants={fadeUp} className="flex flex-col gap-3">
          <SectionLabel>Payout destination</SectionLabel>

          {payoutMethods.length > 0 && (
            <div className="flex flex-col gap-2">
              {payoutMethods.map((m) => {
                const active = destMode === 'saved' && selectedMethodId === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setDestMode('saved'); setSelectedMethodId(m.id); setFieldError(null) }}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors',
                      active ? 'border-asm-blue bg-asm-blue-tint' : 'border-asm-line bg-white hover:border-asm-blue/40'
                    )}
                  >
                    <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-lg', active ? 'bg-asm-blue text-white' : 'bg-asm-tint text-asm-muted')}>
                      {m.type === 'bank' ? <Landmark className="size-4" aria-hidden /> : <AtSign className="size-4" aria-hidden />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-semibold text-asm-navy">
                        {m.type === 'bank' ? `Bank ••${(m.accountNumber ?? '').slice(-4)}` : m.upiId}
                      </span>
                      <span className="truncate text-[11px] text-asm-muted">
                        {m.type === 'bank' ? m.accountName : 'UPI'}{m.isDefault ? ' · Default' : ''}
                      </span>
                    </span>
                    {active && <Check className="size-4 shrink-0 text-asm-blue" strokeWidth={2.5} aria-hidden />}
                  </button>
                )
              })}

              <button
                type="button"
                onClick={() => { setDestMode('new'); setFieldError(null) }}
                className={cn(
                  'flex items-center gap-2 rounded-xl border border-dashed px-4 py-3 text-[13px] font-semibold transition-colors',
                  destMode === 'new' ? 'border-asm-blue bg-asm-blue-tint/50 text-asm-blue' : 'border-asm-line text-asm-muted hover:text-asm-navy'
                )}
              >
                <Plus className="size-4" aria-hidden /> Use a new account
              </button>
            </div>
          )}

          {destMode === 'new' && (
            <div className="flex flex-col gap-3 rounded-xl border border-asm-line bg-white p-4">
              <div className="grid grid-cols-2 gap-2">
                <TypeToggle active={newType === 'upi'}  onClick={() => { setNewType('upi');  setFieldError(null) }} Icon={AtSign}   label="UPI ID" />
                <TypeToggle active={newType === 'bank'} onClick={() => { setNewType('bank'); setFieldError(null) }} Icon={Landmark} label="Bank account" />
              </div>

              {newType === 'upi' ? (
                <FormField
                  label="UPI ID"
                  placeholder="name@okicici or 9876543210@paytm"
                  Icon={AtSign}
                  value={upiId}
                  onChange={(e) => { setUpiId(e.target.value); setFieldError(null) }}
                />
              ) : (
                <>
                  <FormField
                    label="Account holder name"
                    placeholder="As per bank records"
                    Icon={User}
                    value={accountName}
                    onChange={(e) => { setAccountName(e.target.value); setFieldError(null) }}
                  />
                  <FormField
                    label="Account number"
                    placeholder="Bank account number"
                    Icon={Landmark}
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => { setAccountNumber(e.target.value); setFieldError(null) }}
                  />
                  <FormField
                    label="IFSC code"
                    placeholder="e.g. HDFC0001234"
                    Icon={Building2}
                    className="uppercase"
                    value={ifsc}
                    onChange={(e) => { setIfsc(e.target.value); setFieldError(null) }}
                  />
                </>
              )}
              <p className="px-1 text-[11px] leading-snug text-asm-muted">
                Manage saved payout methods on your <span className="font-semibold text-asm-navy">Account</span> page.
              </p>
            </div>
          )}

          <Callout>
            Double-check the destination. A wrong UPI ID or bank account causes an
            immediate failed transfer with no reversal.
          </Callout>
        </motion.section>

        {/* ── Summary ── */}
        <section className="rounded-2xl border border-asm-line bg-white p-[21px] shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
          <h2 className="text-[11px] font-bold uppercase leading-[15px] tracking-[1px] text-asm-muted">
            Withdrawal summary
          </h2>
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-asm-body">
              TDS (5%)
              <Info className="size-3.5 text-asm-muted" aria-hidden />
            </span>
            <span className="font-mono text-[13px] font-bold tabular-nums text-red-600">
              {validRs > 0 ? `− ${inr(Math.round(validPaise * 0.05))}` : '−'}
            </span>
          </div>
          <span className="my-3 block h-px w-full bg-asm-line" />
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-asm-navy">You will get</span>
            <span className="font-mono text-lg font-bold tabular-nums text-asm-greenInk">
              {validRs > 0 ? inr(Math.round(validPaise * 0.95)) : '₹0'}
            </span>
          </div>
          <p className="mt-2 text-[11px] text-asm-muted">
            Actual amounts are confirmed in the withdrawal receipt.
          </p>
        </section>

        {/* ── Inline error ── */}
        {(fieldError || mutation.isError) && (
          <div
            className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3.5"
            role="alert"
            aria-live="assertive"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" aria-hidden />
            <p className="text-[12px] leading-relaxed text-red-800">
              {fieldError ?? (mutation.error instanceof ApiError ? mutation.error.message : 'Something went wrong. Please try again.')}
            </p>
          </div>
        )}

        {/* ── Action ── */}
        <div className="flex flex-col gap-5 pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className={cn(
              'flex h-14 w-full items-center justify-center gap-3 rounded-2xl',
              'bg-asm-greenInk shadow-[0_8px_24px_-8px_rgba(21,128,61,0.5)]',
              'text-base font-bold uppercase leading-6 tracking-[0.04em] text-white',
              'transition-colors hover:bg-green-800 active:scale-[0.99]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-greenInk focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none'
            )}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Submitting…
              </>
            ) : (
              <>
                Submit Withdrawal Request
                <ArrowRight className="size-4" aria-hidden />
              </>
            )}
          </button>

          <section className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.06)]">
            <h2 className="text-[11px] font-bold uppercase tracking-[1px] text-amber-600">
              Key Points
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              <KeyPoint>
                Every withdrawal is <Strong>reviewed by our team</Strong> before processing.
                This protects your funds.
              </KeyPoint>
              <KeyPoint>
                Processing is completed <Strong>within 3 hours</Strong> after admin review. If rejected, 100% of funds are immediately refunded to your wallet.
              </KeyPoint>
              <KeyPoint>
                Amount must be between <Strong>₹{rupeesCompact(MIN_WITHDRAWAL_RS)}</Strong> and{' '}
                <Strong>₹{rupeesCompact(MAX_WITHDRAWAL_RS)}</Strong>.
              </KeyPoint>
              <KeyPoint>
                Need help? Tap <Strong>?</Strong> or email <Strong>support@asmcoins.com</Strong>.
              </KeyPoint>
            </ul>
          </section>
        </div>

        {/* ── Past withdrawals ── */}
        <motion.section variants={fadeUp} className="flex flex-col gap-3 pb-2">
          <h2 className="px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
            Past Withdrawals
          </h2>
          {withdrawalsLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-asm-line bg-white py-8 text-asm-muted" aria-live="polite">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              <span className="text-[13px]">Loading…</span>
            </div>
          ) : !withdrawalsData || withdrawalsData.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white px-5 py-8 text-center">
              <Wallet className="size-8 text-asm-muted/40" aria-hidden />
              <p className="text-[13px] font-semibold text-asm-navy">No withdrawals yet</p>
              <p className="text-[12px] text-asm-body">Your withdrawal history will appear here.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {withdrawalsData.map((w) => {
                const { label, cls } = statusLabel(w.status)
                return (
                  <li
                    key={w._id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-asm-line bg-white px-4 py-3.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-asm-tint">
                        {w.status === 'completed' ? (
                          <Check className="size-4 text-asm-greenInk" aria-hidden />
                        ) : w.status === 'rejected' ? (
                          <XCircle className="size-4 text-red-500" aria-hidden />
                        ) : (
                          <Clock className="size-4 text-amber-500" aria-hidden />
                        )}
                      </span>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <span className="font-mono text-[13px] font-bold tabular-nums text-asm-navy">
                          {inr(w.gross)}
                        </span>
                        <span className="text-[11px] text-asm-muted">
                          Net {inr(w.net)} · {new Date(w.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                    <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em]', cls)}>
                      {label}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </motion.section>

      </motion.div>
    </AppShell>
  )
}

/* ── Sub-components ─────────────────────────────────────────────── */

function SectionLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2 className={cn('px-1 text-[11px] font-bold uppercase leading-4 tracking-[1.2px] text-asm-muted', className)}>
      {children}
    </h2>
  )
}

function FormField({
  label,
  placeholder,
  Icon,
  trailing,
  className,
  ...props
}: {
  label: string
  placeholder: string
  Icon: LucideIcon
  trailing?: React.ReactNode
} & React.ComponentProps<'input'>) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="px-1 text-[11px] font-bold uppercase leading-[15px] tracking-[0.06em] text-asm-muted">
        {label}
      </span>
      <span className="flex h-12 items-center gap-3 rounded-xl border border-asm-line bg-white px-4 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <Icon className="size-3.5 shrink-0 text-asm-muted" aria-hidden />
        <input
          placeholder={placeholder}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-[13px] text-asm-navy outline-none placeholder:text-asm-muted/55',
            className
          )}
          {...props}
        />
        {trailing}
      </span>
    </label>
  )
}

function TypeToggle({
  active,
  onClick,
  Icon,
  label,
}: {
  active: boolean
  onClick: () => void
  Icon: LucideIcon
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] font-semibold transition-colors',
        active ? 'border-asm-blue bg-asm-blue-tint text-asm-blue' : 'border-asm-line bg-white text-asm-muted hover:text-asm-navy'
      )}
    >
      <Icon className="size-4" aria-hidden />
      {label}
    </button>
  )
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3.5">
      <Info className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      <p className="text-[12px] leading-relaxed text-amber-800">{children}</p>
    </div>
  )
}

function KeyPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="mt-0.5 size-3.5 shrink-0 text-asm-greenInk" strokeWidth={2.5} aria-hidden />
      <span className="text-[12px] leading-relaxed text-asm-body">{children}</span>
    </li>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-asm-navy">{children}</span>
}

function BreakdownRow({
  label,
  value,
  valueClass,
}: {
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[13px] text-asm-body">{label}</span>
      <span className={cn('font-mono text-[13px] font-bold tabular-nums text-asm-navy', valueClass)}>
        {value}
      </span>
    </div>
  )
}
