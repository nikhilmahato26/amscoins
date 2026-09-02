import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gift, X } from 'lucide-react'
import { useWallet } from '@/hooks/queries'
import { inr } from '@/lib/format'

const STORAGE_KEY = 'asm:dismissed-referral-bonuses'

function getDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

function addDismissedIds(ids: string[]) {
  try {
    const existing = getDismissedIds()
    for (const id of ids) existing.add(id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...existing]))
  } catch {
    // ignore
  }
}

export function ReferralBonusNotice() {
  const { data } = useWallet()
  const [visible, setVisible] = useState(false)
  const [pendingIds, setPendingIds] = useState<string[]>([])
  const [totalBonus, setTotalBonus] = useState(0)

  useEffect(() => {
    if (!data?.transactions) return
    const dismissed = getDismissedIds()
    const unseen = data.transactions.filter(
      (t) => t.type === 'referral_bonus' && t.direction === 'credit' && !dismissed.has(t._id)
    )
    if (unseen.length === 0) return
    const ids = unseen.map((t) => t._id)
    const total = unseen.reduce((sum, t) => sum + t.amount, 0)
    setPendingIds(ids)
    setTotalBonus(total)
    setVisible(true)
  }, [data])

  function dismiss() {
    addDismissedIds(pendingIds)
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismiss}
          />

          {/* Dialog */}
          <motion.div
            key="dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Referral bonus received"
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-sm -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl"
            initial={{ opacity: 0, scale: 0.92, y: '-45%' }}
            animate={{ opacity: 1, scale: 1, y: '-50%' }}
            exit={{ opacity: 0, scale: 0.92, y: '-45%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          >
            {/* Close button */}
            <button
              onClick={dismiss}
              aria-label="Close"
              className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full text-asm-muted transition-colors hover:bg-asm-tint hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
            >
              <X className="size-4" strokeWidth={2.5} aria-hidden />
            </button>

            {/* Icon */}
            <div className="mb-4 flex justify-center">
              <span className="flex size-16 items-center justify-center rounded-full bg-asm-green-tint">
                <Gift className="size-8 text-asm-greenInk" strokeWidth={1.8} aria-hidden />
              </span>
            </div>

            {/* Text */}
            <div className="text-center">
              <h2 className="text-[20px] font-extrabold leading-tight text-asm-navy">
                Referral Bonus!
              </h2>
              <p className="mt-1 text-[13px] text-asm-body">
                Your friends joined ASM Coins using your referral link.
              </p>

              {/* Amount chip */}
              <div className="mx-auto mt-4 inline-flex items-baseline gap-1 rounded-xl bg-asm-green-tint px-5 py-3">
                <span className="font-jakarta text-[30px] font-extrabold tabular-nums leading-none text-asm-greenInk">
                  {inr(totalBonus)}
                </span>
                <span className="text-[13px] font-semibold text-asm-greenInk">added to wallet</span>
              </div>

              {pendingIds.length > 1 && (
                <p className="mt-2 text-[12px] text-asm-muted">
                  From {pendingIds.length} referral{pendingIds.length > 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* CTA */}
            <button
              onClick={dismiss}
              className="mt-5 flex min-h-[48px] w-full items-center justify-center rounded-xl bg-asm-greenInk text-[14px] font-bold text-white transition-colors hover:bg-asm-greenInk/90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-greenInk focus-visible:ring-offset-1"
            >
              Great, thanks!
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
