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

/* ── Tier-specific membership-card gradients ── */
// Each ramp stays dark enough for white body/secondary text to clear AA over
// its top-left origin (135deg → stop 0 is where the name and email sit).
const TIER_BANNER: Record<'silver' | 'gold' | 'diamond', string> = {
  silver:  'linear-gradient(135deg, #475569 0%, #64748B 55%, #334155 100%)',
  gold:    'linear-gradient(135deg, #92400E 0%, #C2740A 55%, #7C2D12 100%)',
  diamond: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 50%, #1E3A8A 100%)',
}
const DEFAULT_BANNER = 'linear-gradient(135deg, #0B4FD8 0%, #0A6BC0 45%, #15803D 100%)'

/* ── Skeleton ── */
function SkeletonRow() {
  return (
    <li className="flex items-center gap-3 px-5 py-4">
      <span className="skeleton size-9 shrink-0 rounded-full" />
      <div className="flex flex-1 flex-col gap-1.5">
        <span className="skeleton h-3 w-2/3" />
        <span className="skeleton h-2.5 w-1/3" />
      </div>
      <div className="flex flex-col items-end gap-1.5">
        <span className="skeleton h-3.5 w-16" />
        <span className="skeleton h-2.5 w-10" />
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
  const [visibleCount, setVisibleCount] = useState(10)

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

        {/* ── Membership / identity card ── */}
        <motion.section
          variants={fadeUp}
          className="membership-card relative isolate overflow-hidden rounded-2xl text-white shadow-[0_16px_40px_-14px_rgba(11,42,92,0.55)]"
          style={{ background: tier ? TIER_BANNER[tier] : DEFAULT_BANNER }}
        >
          {/* Decorative geometry — soft glows, concentric rings, top sheen, scrim */}
          <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-20 -top-24 size-64 rounded-full bg-white/12 blur-2xl" />
            <div className="absolute -bottom-28 -left-16 size-64 rounded-full bg-black/20 blur-3xl" />
            <svg className="absolute -right-8 -top-10 h-44 w-44 text-white/[0.09]" viewBox="0 0 176 176" fill="none">
              <circle cx="132" cy="44" r="30" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="132" cy="44" r="50" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="132" cy="44" r="70" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/45 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 via-transparent to-black/25" />
          </div>

          {/* Top bar — brand wordmark + account status */}
          <div className="relative flex items-center justify-between px-5 pt-4">
            <span className="inline-flex items-center gap-1.5">
              <span className="flex size-5 items-center justify-center rounded-md bg-white/20 ring-1 ring-white/30">
                <TrendingUp className="size-3" strokeWidth={2.6} aria-hidden />
              </span>
              <span className="text-[12px] font-extrabold tracking-tight">ASM Coins</span>
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide backdrop-blur',
                status === 'active' ? 'bg-white/15 text-white ring-1 ring-white/30' : 'bg-amber-100 text-amber-800'
              )}
            >
              <span className={cn('size-1.5 rounded-full', status === 'active' ? 'bg-white' : 'bg-amber-500')} aria-hidden />
              {status === 'active' ? 'Active' : 'Frozen'}
            </span>
          </div>

          {/* Identity — avatar, name, edit */}
          <div className="relative flex items-center gap-4 px-5 pt-4">
            <div className="relative shrink-0">
              {avatar ? (
                <img
                  src={avatar}
                  alt=""
                  decoding="async"
                  className="size-[68px] rounded-2xl object-cover ring-[3px] ring-white/80 shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)]"
                />
              ) : (
                <span
                  className="flex size-[68px] items-center justify-center rounded-2xl bg-white/15 font-jakarta text-[24px] font-extrabold tracking-tight text-white ring-[3px] ring-white/80 backdrop-blur shadow-[0_6px_16px_-4px_rgba(0,0,0,0.5)]"
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
                className="absolute -bottom-1.5 -right-1.5 flex size-7 items-center justify-center rounded-full bg-white text-asm-blue ring-2 ring-white shadow-[0_2px_6px_-1px_rgba(0,0,0,0.4)] transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-60"
              >
                {uploading ? (
                  <span className="size-3 animate-spin rounded-full border-2 border-asm-blue/30 border-t-asm-blue" aria-hidden />
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

            <div className="min-w-0 flex-1">
              <p className="truncate text-[19px] font-extrabold leading-tight tracking-tight">{name}</p>
              {email && <p className="mt-0.5 truncate text-[13px] text-white/75">{email}</p>}
              {since && <p className="mt-1 text-[11px] text-white/70">{since}</p>}
            </div>

            <button
              type="button"
              onClick={openEdit}
              aria-label="Edit profile"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-white/15 px-3 py-2 text-[12px] font-semibold text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            >
              <Pencil className="size-3.5" strokeWidth={2.2} aria-hidden />
              Edit
            </button>
          </div>

          {formError && !editOpen && (
            <p role="alert" className="relative mx-5 mt-3 inline-flex rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-medium text-asm-red">{formError}</p>
          )}

          {/* Meta chips — ID, tier, referral (glass on gradient) */}
          <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-white/15 px-5 pb-5 pt-4">
            {publicId && (
              <span className="inline-flex items-center gap-2 rounded-full bg-white/12 px-2.5 py-1 ring-1 ring-white/20 backdrop-blur">
                <span className="text-[9px] font-bold uppercase tracking-wide text-white/70">ID</span>
                <span className="font-mono text-[12px] font-semibold text-white">{publicId}</span>
                <button
                  type="button"
                  onClick={handleCopyId}
                  aria-label="Copy User ID"
                  className="-mr-0.5 inline-flex items-center justify-center rounded-md p-0.5 text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  {copied ? (
                    <Check className="size-3.5" strokeWidth={2.5} aria-hidden />
                  ) : (
                    <Copy className="size-3.5" strokeWidth={2} aria-hidden />
                  )}
                </button>
              </span>
            )}

            {tier && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white ring-1 ring-white/25 backdrop-blur">
                <span className="size-1.5 rounded-full bg-white" aria-hidden />
                {tier}
              </span>
            )}

            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/12 px-2.5 py-1 ring-1 ring-white/20 backdrop-blur">
              <span className="text-[9px] font-bold uppercase tracking-wide text-white/70">Referral</span>
              <span className="font-mono text-[12px] font-semibold text-white">{referralCode}</span>
              <span className="text-[11px] text-white/70">· {referralCount}</span>
            </span>
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
              (() => {
                const visible = transactions.slice(0, visibleCount)
                // Group by date label
                const groups: { dateLabel: string; items: typeof visible }[] = []
                for (const tx of visible) {
                  const label = relDate(tx.createdAt)
                  const last = groups[groups.length - 1]
                  if (last && last.dateLabel === label) {
                    last.items.push(tx)
                  } else {
                    groups.push({ dateLabel: label, items: [tx] })
                  }
                }
                return (
                  <>
                    {groups.map((group) => (
                      <div key={group.dateLabel} className="relative">
                        <div className="sticky top-0 bg-asm-tint/80 px-5 py-1.5 backdrop-blur-sm">
                          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">
                            {group.dateLabel}
                          </span>
                        </div>
                        <ul>
                          {group.items.map((tx) => {
                            const meta = DIR_META[tx.direction]
                            const { Icon } = meta
                            return (
                              <li key={tx._id} className="flex items-center gap-3 border-t border-asm-line px-5 py-4 first:border-t-0">
                                <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', meta.bg)} aria-hidden>
                                  <Icon className={cn('size-4', meta.color)} strokeWidth={2.2} aria-hidden />
                                </span>
                                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                                  <span className="truncate text-[13px] font-semibold text-asm-navy">{tx.note || tx.type}</span>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1">
                                  <span className={cn('font-mono text-[15px] font-bold tabular-nums', meta.color)}>
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
                      </div>
                    ))}
                    {transactions.length > visibleCount && (
                      <button
                        type="button"
                        onClick={() => setVisibleCount((c) => c + 10)}
                        className="flex w-full items-center justify-center border-t border-asm-line py-4 text-[12px] font-semibold text-asm-blue transition-colors hover:bg-asm-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-inset"
                      >
                        Load more
                      </button>
                    )}
                  </>
                )
              })()
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
                  pType === 'upi' ? 'border-asm-blue bg-asm-blue-tint text-asm-blue' : 'border-asm-muted/30 bg-asm-tint text-asm-body hover:border-asm-blue/50 hover:bg-asm-blue-tint hover:text-asm-navy'
                )}
              >
                <AtSign className="size-4" aria-hidden /> UPI ID
              </button>
              <button
                type="button"
                onClick={() => { setPType('bank'); setPError(null) }}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-[12px] font-semibold transition-colors',
                  pType === 'bank' ? 'border-asm-blue bg-asm-blue-tint text-asm-blue' : 'border-asm-muted/30 bg-asm-tint text-asm-body hover:border-asm-blue/50 hover:bg-asm-blue-tint hover:text-asm-navy'
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
