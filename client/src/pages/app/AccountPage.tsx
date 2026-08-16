import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import type { FormEvent, ChangeEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import {
  ArrowDownLeft,
  ArrowUpRight,
  AtSign,
  Camera,
  Check,
  ChevronRight,
  Copy,
  CreditCard,
  Landmark,
  LogOut,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/auth/AuthContext'
import { useWallet, useDashboard } from '@/hooks/queries'
import { authService } from '@/services/authService'
import {
  updateProfile,
  uploadAvatar,
  addPayoutMethod,
  deletePayoutMethod,
  setDefaultPayoutMethod,
} from '@/services/api/users'
import { ApiError } from '@/lib/api'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Transaction } from '@/types'

/* ── Motion variants ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

/* ── Helpers ── */
function initials(name: string): string {
  const words = name.trim().split(/\s+/)
  const first = words[0]?.[0] ?? ''
  const last  = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase()
}

function memberSince(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return 'Member since ' + d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
}

function relDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

/* ── Transaction display meta — keyed on direction ── */
const DIR_META: Record<Transaction['direction'], {
  Icon: typeof ArrowDownLeft; sign: '+' | '−'; color: string; bg: string
}> = {
  credit: { Icon: ArrowDownLeft, sign: '+', color: 'text-asm-greenInk', bg: 'bg-asm-green-tint' },
  debit:  { Icon: ArrowUpRight,  sign: '−', color: 'text-asm-red',      bg: 'bg-red-50'         },
}

const STATUS_PILL: Record<Transaction['status'], string> = {
  settled:  'bg-asm-green-tint text-asm-greenInk',
  pending:  'bg-amber-50 text-amber-700',
  rejected: 'bg-red-50 text-asm-red',
}

/* ── Skeleton ── */
function SkeletonRow() {
  return (
    <li className="flex items-center gap-3 px-5 py-4 animate-pulse">
      <span className="size-9 shrink-0 rounded-full bg-asm-tint" />
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="h-3 w-2/3 rounded bg-asm-tint" />
        <span className="h-2.5 w-1/3 rounded bg-asm-tint" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className="h-3.5 w-16 rounded bg-asm-tint" />
        <span className="h-2.5 w-10 rounded bg-asm-tint" />
      </div>
    </li>
  )
}

function StatSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 animate-pulse">
      <span className="size-9 rounded-xl bg-asm-tint" />
      <span className="h-4 w-14 rounded bg-asm-tint" />
      <span className="h-2.5 w-10 rounded bg-asm-tint" />
    </div>
  )
}

/* ── Page ── */
export function AccountPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()

  const walletQuery = useWallet()
  const dashQuery   = useDashboard()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editOpen, setEditOpen]   = useState(false)
  const [formName, setFormName]   = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [saving, setSaving]       = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [copied, setCopied]       = useState(false)

  async function handleSignOut() {
    await authService.logout()
    setUser(null)
    navigate('/login', { replace: true })
  }

  function openEdit() {
    setFormName(user?.name ?? '')
    setFormPhone(user?.phone ?? '')
    setFormError(null)
    setEditOpen(true)
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const { user: updated } = await updateProfile({
        name: formName.trim() || undefined,
        phone: formPhone.trim() || undefined,
      })
      setUser(updated)
      setEditOpen(false)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save changes')
    } finally {
      setSaving(false)
    }
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // let the user re-pick the same file later
    if (!file) return
    setUploading(true)
    try {
      const { user: updated } = await uploadAvatar(file)
      setUser(updated)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not upload photo')
    } finally {
      setUploading(false)
    }
  }

  async function handleCopyId() {
    if (!publicId) return
    try {
      await navigator.clipboard.writeText(publicId)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch { /* clipboard unavailable — ignore */ }
  }

  /* ── Payout methods ── */
  const payoutMethods = user?.payoutMethods ?? []
  const [payoutOpen, setPayoutOpen] = useState(false)
  const [pType, setPType]     = useState<'upi' | 'bank'>('upi')
  const [pUpi, setPUpi]       = useState('')
  const [pAccName, setPAccName] = useState('')
  const [pAccNum, setPAccNum] = useState('')
  const [pIfsc, setPIfsc]     = useState('')
  const [pSaving, setPSaving] = useState(false)
  const [pError, setPError]   = useState<string | null>(null)
  const [payoutBusy, setPayoutBusy] = useState(false)

  function openAddPayout() {
    setPType('upi'); setPUpi(''); setPAccName(''); setPAccNum(''); setPIfsc('')
    setPError(null); setPayoutOpen(true)
  }

  async function handleAddPayout(e: FormEvent) {
    e.preventDefault()
    setPSaving(true)
    setPError(null)
    try {
      const input =
        pType === 'upi'
          ? { type: 'upi' as const, upiId: pUpi.trim() }
          : { type: 'bank' as const, accountName: pAccName.trim(), accountNumber: pAccNum.trim(), ifsc: pIfsc.trim().toUpperCase() }
      const { user: updated } = await addPayoutMethod(input)
      setUser(updated)
      setPayoutOpen(false)
    } catch (err) {
      setPError(err instanceof ApiError ? err.message : 'Could not add payout method')
    } finally {
      setPSaving(false)
    }
  }

  async function handleSetDefault(id: string) {
    setPayoutBusy(true)
    try {
      const { user: updated } = await setDefaultPayoutMethod(id)
      setUser(updated)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not update payout method')
    } finally {
      setPayoutBusy(false)
    }
  }

  async function handleDeleteMethod(id: string) {
    setPayoutBusy(true)
    try {
      const { user: updated } = await deletePayoutMethod(id)
      setUser(updated)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not remove payout method')
    } finally {
      setPayoutBusy(false)
    }
  }

  const name   = user?.name   ?? 'Investor'
  const email  = user?.email  ?? ''
  const publicId = user?.publicId ?? null
  const avatar   = user?.avatar ?? null
  const status = user?.status ?? 'active'
  const since  = user?.createdAt ? memberSince(user.createdAt) : ''
  const tier   = user?.tier ?? null
  const referralCode  = user?.referralCode  ?? '—'
  const referralCount = user?.referralCount ?? 0

  const walletBalance  = walletQuery.data?.balance ?? null
  const transactions   = walletQuery.data?.transactions ?? []
  const dashBalance    = dashQuery.data?.balance ?? null
  const totalInvested  = dashQuery.data?.totals.invested ?? null
  const expectedReturn = dashQuery.data?.totals.expectedReturn ?? null

  // Prefer wallet balance (more up-to-date), fall back to dashboard balance
  const displayBalance = walletBalance ?? dashBalance

  return (
    <AppShell backTo="/app">
      <motion.div
        className="flex flex-col gap-5"
        variants={container}
        initial="hidden"
        animate="visible"
      >

        {/* ── Identity card ── */}
        <motion.section
          variants={fadeUp}
          className="relative overflow-hidden rounded-2xl border border-asm-line bg-white shadow-[0_4px_20px_-6px_rgba(16,42,92,0.12)]"
        >
          {/* Gradient header strip */}
          <div
            aria-hidden
            className="h-[72px] w-full"
            style={{ background: 'linear-gradient(135deg, #0B4FD8 0%, #15803D 100%)' }}
          />

          {/* Status pill — sits on the gradient, reads in white */}
          <span
            className={cn(
              'absolute right-4 top-3 z-10 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur',
              status === 'active' ? 'bg-white/15 text-white ring-1 ring-white/30' : 'bg-amber-100 text-amber-800'
            )}
          >
            <span className={cn('size-1.5 rounded-full', status === 'active' ? 'bg-white' : 'bg-amber-500')} aria-hidden />
            {status === 'active' ? 'Active' : 'Frozen'}
          </span>

          <div className="px-5 pb-5">
            {/* Avatar + edit — overlapping the gradient, baseline-aligned */}
            <div className="-mt-9 mb-3 flex items-end justify-between">
              {/* Avatar with photo upload */}
              <div className="relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    className="size-[64px] shrink-0 rounded-2xl border-4 border-white object-cover shadow-[0_4px_12px_-2px_rgba(11,79,216,0.4)]"
                  />
                ) : (
                  <span
                    className="flex size-[64px] shrink-0 items-center justify-center rounded-2xl border-4 border-white bg-asm-blue font-jakarta text-[22px] font-extrabold tracking-tight text-white shadow-[0_4px_12px_-2px_rgba(11,79,216,0.4)]"
                    aria-hidden
                  >
                    {initials(name)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  aria-label="Change profile photo"
                  className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border-2 border-white bg-asm-blue text-white shadow-sm transition-colors hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue disabled:opacity-60"
                >
                  {uploading ? (
                    <span className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                  ) : (
                    <Camera className="size-3.5" strokeWidth={2.2} aria-hidden />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              {/* Edit profile — aligned to the avatar baseline */}
              <button
                type="button"
                onClick={openEdit}
                className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-asm-line bg-white px-3.5 py-2 text-[12px] font-semibold text-asm-navy shadow-sm transition-colors hover:bg-asm-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
              >
                <Pencil className="size-3.5" strokeWidth={2.2} aria-hidden />
                Edit profile
              </button>
            </div>

            <p className="text-[18px] font-extrabold leading-tight tracking-tight text-asm-navy">{name}</p>
            <p className="mt-0.5 text-[13px] text-asm-body">{email}</p>
            {since && <p className="mt-1 text-[11px] text-asm-muted">{since}</p>}

            {/* User ID with copy button */}
            {publicId && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-asm-tint px-2.5 py-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wide text-asm-muted">User ID</span>
                <span className="font-mono text-[12px] font-semibold text-asm-navy">{publicId}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  aria-label="Copy User ID"
                  className="ml-0.5 inline-flex items-center justify-center rounded-md p-1 text-asm-muted transition-colors hover:bg-white hover:text-asm-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
                >
                  {copied ? (
                    <Check className="size-3.5 text-asm-greenInk" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={2} aria-hidden />
                  )}
                </button>
              </div>
            )}

            {formError && !editOpen && (
              <p role="alert" className="mt-2 text-[11px] font-medium text-asm-red">{formError}</p>
            )}

            {/* Tier + referral row */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {tier && (
                <span className={cn(
                  'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide',
                  tier === 'silver'  ? 'bg-[#CED5E1] text-[#4B5563]'           :
                  tier === 'gold'    ? 'bg-amber-50 text-[#F37400]'             :
                                       'bg-asm-blue-tint text-asm-blue'
                )}>
                  {tier}
                </span>
              )}
              <span className="text-[11px] text-asm-muted">
                Referral: <span className="font-mono font-semibold text-asm-navy">{referralCode}</span>
              </span>
              <span className="text-[11px] text-asm-muted">
                {referralCount} {referralCount === 1 ? 'referral' : 'referrals'}
              </span>
            </div>
          </div>
        </motion.section>

        {/* ── Portfolio snapshot ── */}
        <motion.section variants={fadeUp} aria-live="polite" aria-label="Portfolio summary">
          <h2 className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
            Portfolio
          </h2>
          <div className="grid grid-cols-3 gap-2.5">
            {walletQuery.isLoading || dashQuery.isLoading ? (
              <>
                <StatSkeleton />
                <StatSkeleton />
                <StatSkeleton />
              </>
            ) : (
              <>
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-asm-blue-tint text-asm-blue">
                    <Wallet className="size-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-asm-navy">
                    {displayBalance !== null ? inr(displayBalance) : '—'}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">Balance</span>
                </div>

                <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-asm-green-tint text-asm-greenInk">
                    <TrendingUp className="size-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-asm-navy">
                    {totalInvested !== null ? inr(totalInvested) : '—'}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">Invested</span>
                </div>

                <div className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white py-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
                  <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <ArrowDownLeft className="size-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="font-mono text-[15px] font-bold tabular-nums text-asm-navy">
                    {expectedReturn !== null ? inr(expectedReturn) : '—'}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">Expected</span>
                </div>
              </>
            )}
          </div>
        </motion.section>

        {/* ── Recent activity ── */}
        <motion.section variants={fadeUp} aria-labelledby="activity-heading" aria-live="polite">
          <h2
            id="activity-heading"
            className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted"
          >
            Recent Activity
          </h2>
          <div className="rounded-2xl border border-asm-line bg-white shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
            {walletQuery.isLoading ? (
              <ul aria-label="Loading transactions">
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </ul>
            ) : walletQuery.isError ? (
              <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-red-50">
                  <Wallet className="size-5 text-asm-red" aria-hidden />
                </span>
                <p className="text-[13px] font-semibold text-asm-navy">Couldn't load transactions</p>
                <p className="text-[12px] text-asm-body">Check your connection and try again.</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-5 py-10 text-center">
                <span className="flex size-12 items-center justify-center rounded-full bg-asm-tint">
                  <Wallet className="size-5 text-asm-muted" aria-hidden />
                </span>
                <p className="text-[13px] font-semibold text-asm-navy">No transactions yet</p>
                <p className="text-[12px] text-asm-body">Your investment activity will appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-asm-line">
                {transactions.slice(0, 10).map((tx) => {
                  const meta = DIR_META[tx.direction]
                  const { Icon } = meta
                  return (
                    <li key={tx._id} className="flex items-center gap-3 px-5 py-4">
                      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-full', meta.bg)} aria-hidden>
                        <Icon className={cn('size-4', meta.color)} strokeWidth={2.2} aria-hidden />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[13px] font-semibold text-asm-navy">{tx.note || tx.type}</span>
                        <span className="text-[11px] text-asm-muted">{relDate(tx.createdAt)}</span>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1">
                        <span className={cn('font-mono text-[14px] font-bold tabular-nums', meta.color)}>
                          {meta.sign}{inr(tx.amount)}
                        </span>
                        <span className={cn('rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide', STATUS_PILL[tx.status])}>
                          {tx.status}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </motion.section>

        {/* ── Payout methods ── */}
        <motion.section variants={fadeUp} aria-labelledby="payout-heading">
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 id="payout-heading" className="text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
              Payout Methods
            </h2>
            <button
              type="button"
              onClick={openAddPayout}
              className="inline-flex items-center gap-1 rounded text-[12px] font-semibold text-asm-blue transition-colors hover:text-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
            >
              <Plus className="size-3.5" strokeWidth={2.5} aria-hidden /> Add
            </button>
          </div>
          <div className="rounded-2xl border border-asm-line bg-white shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
            {payoutMethods.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-5 py-8 text-center">
                <span className="flex size-11 items-center justify-center rounded-full bg-asm-tint">
                  <Landmark className="size-5 text-asm-muted" aria-hidden />
                </span>
                <p className="text-[13px] font-semibold text-asm-navy">No payout methods yet</p>
                <p className="text-[12px] text-asm-body">Add a UPI ID or bank account to withdraw to.</p>
              </div>
            ) : (
              <ul className="divide-y divide-asm-line">
                {payoutMethods.map((m) => (
                  <li key={m.id} className="flex items-center gap-3 px-5 py-4">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-asm-blue-tint text-asm-blue">
                      {m.type === 'bank' ? <Landmark className="size-4" aria-hidden /> : <AtSign className="size-4" aria-hidden />}
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[13px] font-semibold text-asm-navy">
                        {m.type === 'bank' ? `Bank ••${(m.accountNumber ?? '').slice(-4)}` : m.upiId}
                      </span>
                      <span className="truncate text-[11px] text-asm-muted">
                        {m.type === 'bank' ? `${m.accountName} · ${m.ifsc}` : 'UPI'}
                        {m.isDefault && ' · Default'}
                      </span>
                    </div>
                    {!m.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(m.id)}
                        disabled={payoutBusy}
                        className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-semibold text-asm-blue transition-colors hover:bg-asm-blue-tint disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteMethod(m.id)}
                      disabled={payoutBusy}
                      aria-label="Remove payout method"
                      className="shrink-0 rounded-lg p-1.5 text-asm-muted transition-colors hover:bg-red-50 hover:text-asm-red disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </motion.section>

        {/* ── Account settings ── */}
        <motion.section variants={fadeUp} aria-labelledby="settings-heading">
          <h2
            id="settings-heading"
            className="mb-3 px-1 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted"
          >
            Account
          </h2>
          <div className="rounded-2xl border border-asm-line bg-white shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
            <Link
              to="/app/payment"
              className={cn(
                'flex items-center gap-3 border-b border-asm-line px-5 py-4',
                'transition-colors hover:bg-asm-tint',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-inset'
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-asm-blue-tint">
                <CreditCard className="size-4 text-asm-blue" strokeWidth={2} aria-hidden />
              </span>
              <span className="flex-1 text-[14px] font-semibold text-asm-navy">Payment Methods</span>
              <ChevronRight className="size-4 shrink-0 text-asm-muted" aria-hidden />
            </Link>

            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                'flex w-full items-center gap-3 px-5 py-4',
                'transition-colors hover:bg-red-50',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-red focus-visible:ring-inset'
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-red-50">
                <LogOut className="size-4 text-asm-red" strokeWidth={2} aria-hidden />
              </span>
              <span className="flex-1 text-left text-[14px] font-semibold text-asm-red">Sign out</span>
            </button>
          </div>
        </motion.section>

      </motion.div>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="asm-dialog rounded-2xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your name and phone number.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Your full name"
                autoComplete="name"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                type="tel"
                inputMode="tel"
                value={formPhone}
                onChange={(e) => setFormPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                autoComplete="tel"
              />
            </div>
            {formError && editOpen && (
              <p role="alert" className="text-[12px] font-medium text-asm-red">{formError}</p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add payout method dialog */}
      <Dialog open={payoutOpen} onOpenChange={setPayoutOpen}>
        <DialogContent className="asm-dialog rounded-2xl sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add payout method</DialogTitle>
            <DialogDescription>Choose UPI or a bank account to receive withdrawals.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddPayout} className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setPType('upi'); setPError(null) }}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] font-semibold transition-colors',
                  pType === 'upi' ? 'border-asm-blue bg-asm-blue-tint text-asm-blue' : 'border-asm-line bg-white text-asm-muted hover:text-asm-navy'
                )}
              >
                <AtSign className="size-4" aria-hidden /> UPI ID
              </button>
              <button
                type="button"
                onClick={() => { setPType('bank'); setPError(null) }}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] font-semibold transition-colors',
                  pType === 'bank' ? 'border-asm-blue bg-asm-blue-tint text-asm-blue' : 'border-asm-line bg-white text-asm-muted hover:text-asm-navy'
                )}
              >
                <Landmark className="size-4" aria-hidden /> Bank account
              </button>
            </div>

            {pType === 'upi' ? (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="p-upi">UPI ID</Label>
                <Input id="p-upi" value={pUpi} onChange={(e) => setPUpi(e.target.value)} placeholder="name@okicici" />
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-accname">Account holder name</Label>
                  <Input id="p-accname" value={pAccName} onChange={(e) => setPAccName(e.target.value)} placeholder="As per bank records" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-accnum">Account number</Label>
                  <Input id="p-accnum" inputMode="numeric" value={pAccNum} onChange={(e) => setPAccNum(e.target.value)} placeholder="Bank account number" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="p-ifsc">IFSC code</Label>
                  <Input id="p-ifsc" className="uppercase" value={pIfsc} onChange={(e) => setPIfsc(e.target.value)} placeholder="e.g. HDFC0001234" />
                </div>
              </>
            )}

            {pError && <p role="alert" className="text-[12px] font-medium text-asm-red">{pError}</p>}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPayoutOpen(false)} disabled={pSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={pSaving}>
                {pSaving ? 'Adding…' : 'Add method'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
