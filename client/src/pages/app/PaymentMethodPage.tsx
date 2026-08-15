import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  IndianRupee,
  Info,
  Loader2,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { useLocation } from 'react-router'

import { AppShell } from '@/components/app/AppShell'
import { usePlans } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { createInvestment } from '@/services/api/investments'
import type { Investment } from '@/services/api/investments'
import type { Tier } from '@/types'

interface LocationState {
  planKey: Tier
  amount: number // paise
}

/* ── Framer variants ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.03 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

type PageState =
  | { phase: 'idle' }
  | { phase: 'submitting' }
  | { phase: 'success'; investment: Investment; telegramLink: string }
  | { phase: 'error'; message: string }

export function PaymentMethodPage() {
  const location = useLocation()
  const state = location.state as LocationState | null

  const { data: plans } = usePlans()
  const plan = plans?.find((p) => p.key === state?.planKey)

  const [pageState, setPageState] = useState<PageState>({ phase: 'idle' })

  async function handleConfirm() {
    if (!state) return
    setPageState({ phase: 'submitting' })
    try {
      const result = await createInvestment({
        planKey: state.planKey,
        amount: state.amount,
      })
      setPageState({ phase: 'success', investment: result.investment, telegramLink: result.telegramLink })
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Something went wrong. Please try again.'
      setPageState({ phase: 'error', message })
    }
  }

  if (pageState.phase === 'success') {
    return (
      <AppShell backTo="/app" contentClassName="px-5">
        <ConfirmationState
          investment={pageState.investment}
          telegramLink={pageState.telegramLink}
          planName={plan?.name ?? state?.planKey ?? 'Investment'}
          amountPaise={state?.amount ?? pageState.investment.amount}
        />
      </AppShell>
    )
  }

  return (
    <AppShell backTo="/app" contentClassName="px-5">
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="flex flex-col gap-6"
      >
        {/* ── Page title ── */}
        <motion.div variants={fadeUp} className="flex flex-col gap-1">
          <h1 className="text-[26px] font-extrabold leading-tight tracking-[-0.02em] text-asm-navy">
            Confirm{' '}
            <span className="text-asm-blue">Payment</span>
          </h1>
          <p className="text-[13px] font-medium leading-relaxed text-asm-body">
            Review your investment details and confirm to proceed via Telegram.
          </p>
        </motion.div>

        {/* ── Package summary ── */}
        <motion.div variants={fadeUp}>
          <PackageSummary
            planName={plan?.name ?? state?.planKey ?? '—'}
            amountPaise={state?.amount ?? 0}
          />
        </motion.div>

        {/* ── Error state ── */}
        {pageState.phase === 'error' && (
          <motion.div
            variants={fadeUp}
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-red-700">Payment Failed</span>
              <p className="text-[12px] leading-relaxed text-red-600">{pageState.message}</p>
            </div>
          </motion.div>
        )}

        {/* ── How it works ── */}
        <motion.section variants={fadeUp} className="flex flex-col gap-3">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-asm-muted">
            How it works
          </h2>
          <div className="flex flex-col gap-2">
            {HOW_IT_WORKS.map(({ step, text }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-asm-blue-tint text-[11px] font-bold text-asm-blue">
                  {step}
                </span>
                <p className="text-[13px] leading-relaxed text-asm-body">{text}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* ── Secure notice ── */}
        <motion.section
          variants={fadeUp}
          className="flex items-start gap-4 rounded-2xl border border-asm-greenInk/15 bg-asm-green-tint p-4"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/80">
            <ShieldCheck className="size-5 text-asm-greenInk" aria-hidden />
          </span>
          <div className="flex flex-col gap-1">
            <h3 className="text-[13px] font-bold leading-tight text-asm-greenInk">
              100% Secure Payment
            </h3>
            <p className="text-[12px] leading-relaxed text-asm-body">
              Your payment is processed via Telegram with admin verification. Never share your payment
              details with anyone.
            </p>
          </div>
        </motion.section>

        {/* ── Note ── */}
        <motion.section
          variants={fadeUp}
          className="flex items-start gap-3 rounded-2xl border border-asm-blue/15 bg-asm-blue-tint p-4"
        >
          <Info className="mt-0.5 size-4 shrink-0 text-asm-blue" aria-hidden />
          <p className="text-[12px] leading-relaxed text-asm-body">
            <span className="font-bold text-asm-blue">Note:</span> After confirming, you will receive a
            Telegram link with payment instructions. Your deposit remains pending until an admin approves it.
          </p>
        </motion.section>

        {/* ── Confirm button ── */}
        <motion.div variants={fadeUp}>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {pageState.phase === 'submitting' ? 'Processing your investment…' : ''}
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={pageState.phase === 'submitting' || !state}
            className={cn(
              'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
              'bg-asm-blue text-base font-bold text-white',
              'shadow-[0_4px_20px_-4px_rgba(11,79,216,0.5)] transition-opacity hover:opacity-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50'
            )}
          >
            {pageState.phase === 'submitting' ? (
              <>
                <Loader2 className="size-5 animate-spin" aria-hidden />
                Processing…
              </>
            ) : (
              <>
                <Send className="size-5" aria-hidden />
                Confirm &amp; Get Telegram Link
              </>
            )}
          </button>
        </motion.div>
      </motion.div>
    </AppShell>
  )
}

/* ── Package Summary ── */
function PackageSummary({ planName, amountPaise }: { planName: string; amountPaise: number }) {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-asm-line bg-white p-5 shadow-[0_4px_20px_-6px_rgba(16,42,92,0.10)]">
      {/* Decorative rupee watermark */}
      <IndianRupee
        className="pointer-events-none absolute right-4 top-4 h-[56px] w-[42px] text-asm-blue opacity-[0.05]"
        strokeWidth={2.5}
        aria-hidden
      />

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">
            Selected package
          </span>
          <span className="text-[20px] font-extrabold uppercase leading-tight tracking-[-0.02em] text-asm-navy">
            {planName}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">
            Amount
          </span>
          <span className="text-[22px] font-extrabold leading-tight tabular-nums text-asm-blue">
            {inr(amountPaise)}
          </span>
        </div>
      </div>
    </section>
  )
}

/* ── Waiting / confirmation state ── */
function ConfirmationState({
  investment,
  telegramLink,
  planName,
  amountPaise,
}: {
  investment: Investment
  telegramLink: string
  planName: string
  amountPaise: number
}) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="visible"
      className="flex flex-col gap-6"
    >
      {/* Success header */}
      <motion.div variants={fadeUp} className="flex flex-col items-center gap-3 pt-4 text-center">
        <span className="flex size-16 items-center justify-center rounded-full bg-asm-green-tint shadow-[0_0_0_8px_rgba(22,163,74,0.08)]">
          <CheckCircle2 className="size-8 text-asm-greenInk" aria-hidden />
        </span>
        <div className="flex flex-col gap-1">
          <h1 className="text-[24px] font-extrabold leading-tight tracking-[-0.02em] text-asm-navy">
            Investment Created
          </h1>
          <p className="text-[13px] font-medium leading-relaxed text-asm-body">
            Your investment is pending admin confirmation. Follow the steps below to complete payment.
          </p>
        </div>
      </motion.div>

      {/* Reference code — prominent */}
      <motion.section
        variants={fadeUp}
        aria-label="Investment reference"
        className="flex flex-col gap-2 rounded-2xl border-2 border-asm-blue/20 bg-asm-blue-tint p-5"
      >
        <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-asm-muted">
          Reference Code
        </span>
        <span
          className="font-mono text-[28px] font-black leading-none tracking-[0.06em] text-asm-blue"
          aria-label={`Reference code: ${investment.referenceCode}`}
        >
          {investment.referenceCode}
        </span>
        <p className="text-[11px] leading-relaxed text-asm-body">
          Keep this code safe — you'll need it if you contact support.
        </p>
      </motion.section>

      {/* Investment summary */}
      <motion.section
        variants={fadeUp}
        className="flex flex-col rounded-2xl border border-asm-line bg-white p-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.07)]"
        aria-label="Investment summary"
      >
        <div className="flex items-center justify-between pb-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">Plan</span>
          <span className="text-[14px] font-bold text-asm-navy">{planName}</span>
        </div>
        <span className="h-px w-full bg-asm-line" />
        <div className="flex items-center justify-between py-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">Amount</span>
          <span className="text-[16px] font-extrabold tabular-nums text-asm-blue">{inr(amountPaise)}</span>
        </div>
        <span className="h-px w-full bg-asm-line" />
        <div className="flex items-center justify-between pt-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">Status</span>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-amber-700">
            Pending
          </span>
        </div>
      </motion.section>

      {/* Next steps */}
      <motion.section variants={fadeUp} className="flex flex-col gap-3">
        <h2 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-asm-muted">
          Next steps
        </h2>
        <div className="flex flex-col gap-2">
          {NEXT_STEPS.map(({ step, text }) => (
            <div key={step} className="flex items-start gap-3">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-asm-blue-tint text-[11px] font-bold text-asm-blue">
                {step}
              </span>
              <p className="text-[13px] leading-relaxed text-asm-body">{text}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Telegram CTA */}
      <motion.div variants={fadeUp}>
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
            'bg-[#0088cc] text-base font-bold text-white',
            'shadow-[0_4px_20px_-4px_rgba(0,136,204,0.5)] transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc] focus-visible:ring-offset-2'
          )}
        >
          <Send className="size-5" aria-hidden />
          Open Telegram to Pay
          <ExternalLink className="size-4 opacity-70" aria-hidden />
        </a>
      </motion.div>

      {/* Security notice */}
      <motion.section
        variants={fadeUp}
        className="flex items-start gap-3 rounded-2xl border border-asm-greenInk/15 bg-asm-green-tint p-4"
      >
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-asm-greenInk" aria-hidden />
        <p className="text-[12px] leading-relaxed text-asm-body">
          <span className="font-bold text-asm-greenInk">Secure process:</span> Pay via the QR code in
          Telegram. An admin will verify and confirm your deposit. Your plan activates only after
          confirmation.
        </p>
      </motion.section>
    </motion.div>
  )
}

/* ── Static content ── */
const HOW_IT_WORKS: { step: number; text: string }[] = [
  { step: 1, text: 'Confirm your investment details below.' },
  { step: 2, text: 'You\'ll receive a Telegram link with the payment QR code.' },
  { step: 3, text: 'Complete payment in Telegram. An admin will verify and activate your plan.' },
]

const NEXT_STEPS: { step: number; text: string }[] = [
  { step: 1, text: 'Tap "Open Telegram to Pay" below.' },
  { step: 2, text: 'Scan the QR code in Telegram and complete your payment.' },
  { step: 3, text: 'An admin will confirm your deposit. Your plan activates upon confirmation.' },
]
