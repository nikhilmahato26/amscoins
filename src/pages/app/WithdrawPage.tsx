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
const BALANCE = { inr: 2299.3, usd: 27.05 }

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

  const parsed = Number.parseFloat(amount)
  const validAmount = Number.isFinite(parsed) && parsed > 0 ? parsed : 0
  const payout = Math.max(validAmount - WITHDRAWAL_FEE, 0)

  return (
    <AppShell backTo="/app" width="wide">
      <div className="flex flex-col gap-6 lg:mx-auto lg:max-w-[560px]">
        {/* Balance */}
        <section className="flex items-center justify-between rounded-2xl border border-white/[0.08] bg-surface-2 p-[17px]">
          <div className="flex items-center">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/10">
              <Wallet className="size-5 text-amber-500" aria-hidden />
            </span>
            <div className="flex flex-col pl-4">
              <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-gray-500">
                Withdrawable balance
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-xl font-bold leading-7 tracking-[-0.16px]">
                  {rupees(BALANCE.inr)}
                </span>
                <span className="text-xs leading-4 tracking-[-0.16px] text-gray-400">
                  ≈ ${BALANCE.usd.toFixed(2)}
                </span>
              </span>
            </div>
          </div>
          <ChevronRight className="size-3 shrink-0 text-gray-500" aria-hidden />
        </section>

        {/* Amount */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Amount to withdraw</SectionLabel>
          <div className="flex h-14 items-center gap-3 rounded-xl border border-white/[0.08] bg-surface-2 px-4">
            <IndianRupee className="size-3.5 shrink-0 text-gray-500" aria-hidden />
            <input
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              inputMode="decimal"
              placeholder="Enter amount"
              aria-label="Amount to withdraw"
              className="min-w-0 flex-1 bg-transparent text-base font-bold tracking-[-0.16px] text-white outline-none placeholder:font-bold placeholder:text-gray-400"
            />
            <button
              type="button"
              className="flex shrink-0 items-center gap-2 text-xs font-bold leading-4 tracking-[-0.16px] text-gray-300"
            >
              INR
              <ChevronDown className="size-2.5" aria-hidden />
            </button>
          </div>
          <p className="px-1 text-[10px] leading-[15px] tracking-[-0.16px] text-gray-500">
            Min <span className="font-bold text-gray-300">₹{rupeesCompact(MIN_WITHDRAWAL)}</span> • Max{' '}
            <span className="font-bold text-amber-500">₹{rupeesCompact(MAX_WITHDRAWAL)}</span>
          </p>
        </section>

        {/* Destination */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Withdraw to</SectionLabel>
          <div className="flex items-stretch gap-3">
            <DestinationCard
              selected={destination === 'bank'}
              onSelect={() => setDestination('bank')}
              Icon={Landmark}
              title="Bank Account"
              currency="(INR)"
              description="Withdraw to your linked bank account"
            />
            <DestinationCard
              selected={destination === 'upi'}
              onSelect={() => setDestination('upi')}
              Icon={Smartphone}
              title="UPI"
              currency="(INR)"
              description="Withdraw to your linked UPI ID"
            />
          </div>
        </section>

        {/* Bank details */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <SectionLabel className="px-0">Enter bank details</SectionLabel>
            <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase leading-[13.5px] tracking-[-0.16px] text-emerald-500">
              <Shield className="size-2.5" aria-hidden />
              100% Secure
            </span>
          </div>

          <div className="flex flex-col gap-3">
            <FormField
              label="Account holder name"
              placeholder="Enter Account Holder Name"
              Icon={User}
              autoComplete="name"
            />
            <FormField
              label="Bank account number"
              placeholder="Enter Bank Account Number"
              Icon={CreditCard}
              inputMode="numeric"
            />
            <FormField
              label="IFSC code"
              placeholder="ENTER IFSC CODE"
              Icon={Building2}
              className="uppercase placeholder:uppercase"
            />

            <fieldset className="flex flex-col gap-2">
              <legend className="px-1 pb-2 text-[10px] font-bold uppercase leading-[15px] tracking-[-0.16px] text-gray-500">
                Account type
              </legend>
              <div className="flex gap-2">
                <AccountTypeButton
                  selected={accountType === 'savings'}
                  onSelect={() => setAccountType('savings')}
                  Icon={PiggyBank}
                  label="Savings account"
                />
                <AccountTypeButton
                  selected={accountType === 'current'}
                  onSelect={() => setAccountType('current')}
                  Icon={Briefcase}
                  label="Current account"
                />
              </div>
            </fieldset>
          </div>

          <Callout>
            Please ensure all bank details are correct. Incorrect details may result in failed
            transactions or delays.
          </Callout>
        </section>

        {/* OR */}
        <div className="flex items-center gap-4 py-2">
          <span className="h-px flex-1 bg-white/5" />
          <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[-0.16px] text-gray-600">
            or
          </span>
          <span className="h-px flex-1 bg-white/5" />
        </div>

        {/* UPI details */}
        <section className="flex flex-col gap-3">
          <SectionLabel>Enter UPI details</SectionLabel>
          <FormField
            label="UPI ID"
            placeholder="Enter UPI ID (e.g. name@upi)"
            Icon={AtSign}
            trailing={<Smartphone className="size-4 text-gray-500" aria-hidden />}
          />
          <Callout>
            Please ensure your UPI ID is correct. Withdrawals sent to the wrong UPI ID may fail.
          </Callout>
        </section>

        {/* Summary */}
        <section className="flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-surface-2 p-[21px]">
          <h2 className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-gray-500">
            Withdrawal summary
          </h2>
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-xs leading-4 tracking-[-0.16px] text-gray-400">
              Withdrawal Fee
              <Info className="size-[9px]" aria-hidden />
            </span>
            <span className="text-xs font-bold leading-4 tracking-[-0.16px]">
              {rupees(WITHDRAWAL_FEE)}
            </span>
          </div>
          <span className="h-px w-full bg-white/5" />
          <div className="flex items-center justify-between pt-1">
            <span className="text-sm font-bold leading-5 tracking-[-0.16px] text-gray-300">
              You Will Get
            </span>
            <span className="text-lg font-bold leading-7 tracking-[-0.45px] text-emerald-400">
              {rupees(payout)}
            </span>
          </div>
        </section>

        {/* Action */}
        <div className="flex flex-col gap-6 pt-2">
          <button
            type="button"
            className={cn(
              'flex h-14 w-full items-center justify-center gap-3 rounded-2xl',
              'bg-gradient-to-br from-gold to-yellow-500 shadow-2xl shadow-black/25',
              'text-base font-bold uppercase leading-6 tracking-[-0.4px] text-black',
              'transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-white/60 disabled:pointer-events-none disabled:opacity-50'
            )}
            disabled={validAmount < MIN_WITHDRAWAL || validAmount > MAX_WITHDRAWAL}
          >
            Submit Withdrawal Request
            <ArrowRight className="size-3" aria-hidden />
          </button>

          <section className="rounded-lg border border-white/[0.08] bg-surface-2 p-[21px]">
            <h2 className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-amber-500">
              Key Points
            </h2>
            <ul className="mt-4 flex flex-col gap-3">
              <KeyPoint>
                Withdrawals are usually processed within <Strong>1 hour</Strong>, with a maximum of
                24hrs.
              </KeyPoint>
              <KeyPoint>
                Withdrawal amount should be between{' '}
                <Strong>
                  ₹{rupeesCompact(MIN_WITHDRAWAL)} - ₹{rupeesCompact(MAX_WITHDRAWAL)}
                </Strong>
                .
              </KeyPoint>
              <KeyPoint>Raise a support ticket for any queries.</KeyPoint>
            </ul>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

function SectionLabel({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <h2
      className={cn(
        'px-1 text-xs font-bold uppercase leading-4 tracking-[1.2px] text-gray-400',
        className
      )}
    >
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
        'flex flex-1 flex-col items-start gap-1 rounded-2xl border bg-surface-2 p-[17px] text-left',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        selected ? 'border-yellow-500' : 'border-surface-2 hover:border-white/10'
      )}
    >
      <span className="flex w-full items-start justify-between">
        <span
          className={cn(
            'flex size-10 items-center justify-center rounded-xl',
            selected ? 'bg-amber-500/10' : 'bg-white/5'
          )}
        >
          <Icon
            className={cn('size-4', selected ? 'text-amber-500' : 'text-gray-500 opacity-50')}
            aria-hidden
          />
        </span>
        {selected ? (
          <span className="flex size-4 items-center justify-center rounded-full bg-amber-500">
            <Check className="size-2.5 text-black" strokeWidth={3.5} aria-hidden />
          </span>
        ) : (
          <span className="size-4 rounded-full border border-white/20" />
        )}
      </span>
      <span className="text-xs font-bold leading-4 tracking-[-0.16px]">
        {title} <span className="text-[9px] font-bold text-gray-500">{currency}</span>
      </span>
      <span className="text-[9px] leading-[13.5px] tracking-[-0.16px] text-gray-500">
        {description}
      </span>
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
        'flex h-10 flex-1 items-center justify-center gap-2 rounded-xl border',
        'text-[10px] font-bold uppercase leading-[15px] tracking-[-0.16px]',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        selected
          ? 'border-yellow-500/40 bg-yellow-500/10 text-yellow-500'
          : 'border-white/5 bg-surface text-gray-500 hover:border-white/10'
      )}
    >
      <Icon className="size-2.5" aria-hidden />
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
    <label className="flex flex-col">
      <span className="px-1 pb-[15px] text-[10px] font-bold uppercase leading-[15px] tracking-[-0.16px] text-gray-500">
        {label}
      </span>
      <span className="flex h-12 items-center gap-3 rounded-xl border border-white/[0.08] bg-surface px-4">
        <Icon className="size-3.5 shrink-0 text-gray-500" aria-hidden />
        <input
          placeholder={placeholder}
          className={cn(
            'min-w-0 flex-1 bg-transparent text-xs tracking-[-0.16px] text-white outline-none placeholder:text-gray-400',
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
    <div className="flex items-start gap-3 rounded-xl border border-amber-500/10 bg-amber-500/5 p-[13px]">
      <Info className="mt-0.5 size-2.5 shrink-0 text-amber-500" aria-hidden />
      <p className="text-[9px] leading-[14.6px] tracking-[-0.16px] text-gray-500">{children}</p>
    </div>
  )
}

function KeyPoint({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <Check className="mt-0.5 size-2.5 shrink-0 text-emerald-500" strokeWidth={3} aria-hidden />
      <span className="text-[9px] leading-[14.6px] tracking-[-0.16px] text-gray-400">{children}</span>
    </li>
  )
}

function Strong({ children }: { children: React.ReactNode }) {
  return <span className="font-bold text-white">{children}</span>
}
