import { useState } from 'react'
import { Gift, X } from 'lucide-react'
import { Link } from 'react-router'
import { useWallet } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

const DISMISS_KEY = 'asm:dismissed-referral-bonuses'

function getDismissed(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DISMISS_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveDismissed(ids: Set<string>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify([...ids]))
  } catch { /* storage full — ignore */ }
}

/**
 * Dismissible banner that surfaces any uncollected referral_bonus credits.
 * Shown on Home so the user immediately knows money arrived from a referral.
 * Each bonus is dismissed independently by its transaction ID — shown only once.
 */
export function ReferralBonusNotice({ className }: { className?: string }) {
  const { data } = useWallet()
  const [dismissed, setDismissed] = useState<Set<string>>(getDismissed)

  if (!data?.transactions) return null

  // All unseen referral_bonus credits from the last 30 days
  const cutoff = Date.now() - 30 * 24 * 3600e3
  const pending = data.transactions.filter(
    (t) =>
      t.type === 'referral_bonus' &&
      t.direction === 'credit' &&
      t.status === 'settled' &&
      new Date(t.createdAt).getTime() > cutoff &&
      !dismissed.has(t._id),
  )

  if (pending.length === 0) return null

  const total = pending.reduce((s, t) => s + t.amount, 0)
  const ids   = pending.map((t) => t._id)
  const count = ids.length

  function dismiss() {
    const next = new Set(dismissed)
    ids.forEach((id) => next.add(id))
    setDismissed(next)
    saveDismissed(next)
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'relative flex items-start gap-3 overflow-hidden rounded-2xl border border-asm-greenInk/20',
        'bg-gradient-to-br from-asm-green-tint to-white px-4 py-3.5 shadow-sm',
        className,
      )}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-asm-greenInk/10">
        <Gift className="size-4 text-asm-greenInk" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-bold text-asm-navy">
          {inr(total)} referral reward credited!
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-asm-body">
          {count === 1
            ? 'A friend you referred just made their first deposit — your 3% bonus is now in your wallet.'
            : `${count} referral bonuses totalling ${inr(total)} have been added to your wallet.`}
        </p>
        <Link
          to="/app/withdraw"
          className="mt-2 inline-block text-[11px] font-bold text-asm-greenInk underline-offset-2 hover:underline"
        >
          Withdraw now →
        </Link>
      </div>

      <button
        type="button"
        aria-label="Dismiss referral bonus notification"
        onClick={dismiss}
        className="shrink-0 rounded-lg p-1 text-asm-muted transition-colors hover:bg-asm-line hover:text-asm-navy"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}
