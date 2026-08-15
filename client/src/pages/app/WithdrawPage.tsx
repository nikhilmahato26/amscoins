import { motion } from 'framer-motion'
import { useState } from 'react'
import {
  ArrowRight,
  AtSign,
  Briefcase,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  CreditCard,
  IndianRupee,
  Info,
  Landmark,
  PiggyBank,
  Shield,
  Smartphone,
  User,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { cn } from '@/lib/utils'

const MIN_WITHDRAWAL = 500
const MAX_WITHDRAWAL = 100000
const WITHDRAWAL_FEE = 0

/** Placeholder until the wallet service is wired up. */
const BALANCE = { inr: 2299.3 }

const rupees = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

const rupeesCompact = (value: number) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value)

type Destination = 'bank' | 'upi'
type AccountType = 'savings' | 'current'

export function WithdrawPage() {
  const [destination, setDestination] = useState<Destination>('bank')
  const [accountType, setAccountType] = useState<AccountType>('savings')
  const [amount, setAmount] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const parsed = Number.parseFloat(amount)
  const validAmount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  const payout = Math.max(validAmount - WITHDRAWAL_FEE, 0)

  /** Mock submit — real implementation sends to the withdrawal API */
  function handleSubmit() {
    if (validAmount < MIN_WITHDRAWAL || validAmount > MAX_WITHDRAWAL) return
    setSubmitted(true)
  }

  /* ── Submitted confirmation state ── */
  if (submitted) {
    return (
      <AppShell backTo="/app">
        <div className="flex flex-col items-center gap-6 py-12 text-center lg:mx-auto lg:max-w-[480px]">
          <span className="flex size-16 items-center justify-center rounded-full bg-asm-green-tint">
            <Check className="size-8 text-asm-greenInk" strokeWidth={2.5} aria-hidden />
          </span>
          <div className="flex flex-col gap-2">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-tight text-asm-navy">
              Request submitted
            </h1>
            <p className="text-[14px] leading-relaxed text-asm-body">
              Your withdrawal of{' '}
              <span className="font-bold text-asm-navy">{rupees(validAmount)}</span>{' '}
              is under review. Our team typically processes it within{' '}
              <span className="font-bold text-asm-navy">1 hour</span>.
            </p>
          </div>
          <div className="w-full rounded-2xl border border-asm-line bg-white px-6 py-5 text-left shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
            <p className="text-[11px] font-bold uppercase tracking-[1px] text-amber-600">What happens next</p>
            <ul className="mt-4 flex flex-col gap-3">
              <KeyPoint>Our team reviews your request — usually within 1 hour.</KeyPoint>
              <KeyPoint>Once approved, funds are sent to your {destination === 'upi' ? 'UPI ID' : 'bank account'}.</KeyPoint>
              <KeyPoint>You'll receive a confirmation when the transfer is complete.</KeyPoint>
              <KeyPoint>
                Questions? Email <Strong>support@asmcoins.com</Strong> or tap the{' '}
                <Strong>?</Strong> button in the header.
              </KeyPoint>
            </ul>
          </div>
          <button
            type="button"
            onClick={() => { setSubmitted(false); setAmount('') }}
            className="flex min-h-[44px] items-center text-[13px] font-semibold text-asm-muted transition-colors hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue rounded"
          >
            Make another withdrawal
          </button>
        </div>
      </AppShell>
    )
  }

  const container = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.04 } },
  }
  const fadeUp = {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
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
              <span className="mt-0.5 font-mono text-xl font-bold tabular-nums leading-7 text-asm-navy">
                {rupees(BALANCE.inr)}
              </span>
            </div>
          </div>
          <ChevronRight className="size-4 shrink-0 text-asm-muted" aria-hidden />
        </motion.section>

        {/* ── Amount ── */}
        <motion.section variants={fadeUp} className="flex flex-col gap-3">
          <SectionLabel>Amount to withdraw</SectionLabel>
          <div className="flex h-14 items-center gap-3 rounded-xl border border-asm-line bg-white px-4 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
            <IndianRupee className="size-3.5 shrink-0 text-asm-muted" aria-hidden />
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="0"
              aria-label="Amount to withdraw"
              className="min-w-0 flex-1 bg-transparent font-mono text-base font-bold tabular-nums text-asm-navy outline-none placeholder:font-sans placeholder:font-bold placeholder:text-asm-muted/50"
            />
            <button
              type="button"
              aria-label="Select currency"
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 text-[12px] font-bold text-asm-muted transition-colors hover:bg-asm-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
            >
              INR
              <ChevronDown className="size-3" aria-hidden />
            </button>
          </div>
          <p className="px-1 text-[11px] leading-[15px] text-asm-muted">
            Min <span className="font-bold text-asm-navy">₹{rupeesCompact(MIN_WITHDRAWAL)}</span>
            {' '}·{' '}
            Max <span className="font-bold text-asm-blue">₹{rupeesCompact(MAX_WITHDRAWAL)}</span>
          </p>
        </motion.section>

        {/* ── Destination ── */}
        <motion.section variants={fadeUp} className="flex flex-col gap-3">
          <SectionLabel>Withdraw to</SectionLabel>
          <div className="flex items-stretch gap-3" role="group" aria-label="Select withdrawal destination">
            <DestinationCard
              selected={destination === 'bank'}
              onSelect={() => setDestination('bank')}
              Icon={Landmark}
              title="Bank Account"
              currency="(INR)"
              description="Send to your bank account"
            />
            <DestinationCard
              selected={destination === 'upi'}
              onSelect={() => setDestination('upi')}
              Icon={Smartphone}
              title="UPI"
              currency="(INR)"
              description="Send to your UPI ID"
            />
          </div>
        </motion.section>

        {/* ── Bank details — shown only when bank is selected ── */}
        {destination === 'bank' && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between px-1">
              <SectionLabel className="px-0">Bank details</SectionLabel>
              <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.06em] text-asm-greenInk">
                <Shield className="size-3" aria-hidden />
                100% Secure
              </span>
            </div>

            <div className="flex flex-col gap-3">
              <FormField
                label="Account holder name"
                placeholder="Full name as on your bank account"
                Icon={User}
                autoComplete="name"
              />
              <FormField
                label="Bank account number"
                placeholder="Enter account number"
                Icon={CreditCard}
                inputMode="numeric"
              />
              <div className="flex flex-col gap-1.5">
                <FormField
                  label="IFSC code"
                  placeholder="E.g. SBIN0001234"
                  Icon={Building2}
                  className="uppercase placeholder:normal-case"
                  maxLength={11}
                />
                <p className="px-1 text-[11px] leading-snug text-asm-muted">
                  11-character code on your chequebook or passbook (e.g. HDFC0000123).
                </p>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="px-1 pb-2 text-[11px] font-bold uppercase leading-[15px] tracking-[0.06em] text-asm-muted">
                  Account type
                </legend>
                <div className="flex gap-2">
                  <AccountTypeButton
                    selected={accountType === 'savings'}
                    onSelect={() => setAccountType('savings')}
                    Icon={PiggyBank}
                    label="Savings"
                  />
                  <AccountTypeButton
                    selected={accountType === 'current'}
                    onSelect={() => setAccountType('current')}
                    Icon={Briefcase}
                    label="Current"
                  />
                </div>
              </fieldset>
            </div>

            <Callout>
              Double-check your account number and IFSC — incorrect details can cause failed
              transfers that cannot be reversed.
            </Callout>
          </section>
        )}

        {/* ── UPI details — shown only when UPI is selected ── */}
        {destination === 'upi' && (
          <section className="flex flex-col gap-3">
            <SectionLabel>UPI details</SectionLabel>
            <div className="flex flex-col gap-1.5">
              <FormField
                label="UPI ID"
                placeholder="name@upi or name@okaxis"
                Icon={AtSign}
                trailing={<Smartphone className="size-4 text-asm-muted" aria-hidden />}
              />
              <p className="px-1 text-[11px] leading-snug text-asm-muted">
                Must include @ — e.g. yourname@okicici or 9876543210@paytm.
              </p>
            </div>
            <Callout>
              The UPI ID must be active and registered to your name. A wrong ID causes an
              immediate failed transfer with no reversal.
            </Callout>
          </section>
        )}

        {/* ── Summary ── */}
        <section className="rounded-2xl border border-asm-line bg-white p-[21px] shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
          <h2 className="text-[11px] font-bold uppercase leading-[15px] tracking-[1px] text-asm-muted">
            Withdrawal summary
          </h2>
          <div className="mt-3 flex items-center justify-between">
            <span className="flex items-center gap-2 text-[13px] text-asm-body">
              Withdrawal fee
              <Info className="size-3.5 text-asm-muted" aria-hidden />
            </span>
            <span className="font-mono text-[13px] font-bold tabular-nums text-asm-greenInk">
              {WITHDRAWAL_FEE === 0 ? 'Free' : rupees(WITHDRAWAL_FEE)}
            </span>
          </div>
          <span className="my-3 block h-px w-full bg-asm-line" />
          <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-asm-navy">You will get</span>
            <span className="font-mono text-lg font-bold tabular-nums text-asm-greenInk">
              {rupees(payout)}
            </span>
          </div>
        </section>

        {/* ── Action ── */}
        <div className="flex flex-col gap-5 pt-1">
          <button
            type="button"
            onClick={handleSubmit}
            className={cn(
              'flex h-14 w-full items-center justify-center gap-3 rounded-2xl',
              'bg-asm-greenInk shadow-[0_8px_24px_-8px_rgba(21,128,61,0.5)]',
              'text-base font-bold uppercase leading-6 tracking-[0.04em] text-white',
              'transition-colors hover:bg-green-800 active:scale-[0.99]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-greenInk focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none'
            )}
            disabled={validAmount < MIN_WITHDRAWAL || validAmount > MAX_WITHDRAWAL}
          >
            Submit Withdrawal Request
            <ArrowRight className="size-4" aria-hidden />
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
                Processing typically takes <Strong>under 1 hour</Strong>. In rare cases up to 24 hours.
              </KeyPoint>
              <KeyPoint>
                Amount must be between <Strong>₹{rupeesCompact(MIN_WITHDRAWAL)}</Strong> and{' '}
                <Strong>₹{rupeesCompact(MAX_WITHDRAWAL)}</Strong>.
              </KeyPoint>
              <KeyPoint>
                Need help? Tap <Strong>?</Strong> or email <Strong>support@asmcoins.com</Strong>.
              </KeyPoint>
            </ul>
          </section>
        </div>

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

function DestinationCard({
  selected,
  onSelect,
  Icon,
  title,
  currency,
  description,
}: {
  selected: boolean
  onSelect: () => void
  Icon: LucideIcon
  title: string
  currency: string
  description: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex flex-1 flex-col items-start gap-1.5 rounded-2xl border bg-white p-[17px] text-left',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-greenInk',
        selected
          ? 'border-2 border-asm-greenInk bg-asm-green-tint/20'
          : 'border-asm-line hover:border-asm-greenInk/40'
      )}
    >
      <span className="flex w-full items-start justify-between">
        <span className={cn('flex size-10 items-center justify-center rounded-xl', selected ? 'bg-asm-green-tint' : 'bg-asm-tint')}>
          <Icon className={cn('size-4', selected ? 'text-asm-greenInk' : 'text-asm-muted')} aria-hidden />
        </span>
        {selected ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-asm-greenInk">
            <Check className="size-2.5 text-white" strokeWidth={3.5} aria-hidden />
          </span>
        ) : (
          <span className="size-4 rounded-full border-2 border-asm-line" />
        )}
      </span>
      <span className={cn('text-[13px] font-bold leading-4', selected ? 'text-asm-navy' : 'text-asm-body')}>
        {title} <span className="text-[10px] font-semibold text-asm-muted">{currency}</span>
      </span>
      <span className="text-[11px] leading-snug text-asm-muted">{description}</span>
    </button>
  )
}

function AccountTypeButton({
  selected,
  onSelect,
  Icon,
  label,
}: {
  selected: boolean
  onSelect: () => void
  Icon: LucideIcon
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-xl border',
        'text-[12px] font-bold uppercase tracking-[0.05em]',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-greenInk',
        selected
          ? 'border-asm-greenInk/40 bg-asm-green-tint text-asm-greenInk'
          : 'border-asm-line bg-white text-asm-muted hover:border-asm-greenInk/30'
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </button>
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
