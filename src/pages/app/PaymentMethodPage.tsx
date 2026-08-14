import {
  ChevronRight,
  Headphones,
  IndianRupee,
  Info,
  MessageCircle,
  Send,
  Shield,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { BnbIcon, TetherIcon } from '@/components/app/icons'
import { cn } from '@/lib/utils'

/** Placeholder until the package selection screen feeds this through. */
const SELECTED_PACKAGE = {
  name: 'Silver',
  amount: '₹10,000',
  amountInWords: 'Ten thousand rupees only',
}

const SIMPLE_OPTIONS: {
  id: string
  title: string
  subtitle: string
  Icon: LucideIcon
  tile: string
}[] = [
  {
    id: 'other-wallets',
    title: 'Other Wallets (USDT)',
    subtitle: 'Use any other wallet to pay USDT',
    Icon: Wallet,
    tile: 'from-purple-500 to-purple-700',
  },
  {
    id: 'need-help',
    title: 'Need Help?',
    subtitle: 'Contact our support team anytime',
    Icon: Headphones,
    tile: 'from-yellow-400 to-yellow-500',
  },
]

export function PaymentMethodPage() {
  return (
    <AppShell backTo="/app" contentClassName="px-[15px]">
      <div>
        <div className="flex flex-col gap-1">
          <h1 className="text-[30px] font-extrabold leading-9 tracking-[-0.75px]">
            Payment{' '}
            <span className="bg-gradient-to-br from-gold-light via-gold to-gold-dark bg-clip-text text-transparent">
              Method
            </span>
          </h1>
          <p className="text-sm font-medium leading-5 tracking-[-0.16px] text-gray-400">
            Complete your payment securely to start your investment.
          </p>
        </div>

        <div className="mt-[22px] flex flex-col gap-6">
          <PackageSummary />

          <section className="flex flex-col gap-6">
            <h2 className="px-1 text-base font-bold leading-6 tracking-[-0.16px] text-gray-300">
              Choose Payment Option
            </h2>

            <div className="flex flex-col gap-3">
              <CryptoOption />
              <InrOption />
              {SIMPLE_OPTIONS.map(({ id, title, subtitle, Icon, tile }) => (
                <OptionShell key={id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <IconTile className={tile}>
                        <Icon className="size-5 text-white" aria-hidden />
                      </IconTile>
                      <div className="flex flex-col gap-px pl-4">
                        <h3 className="text-base font-bold leading-6 tracking-[-0.16px]">{title}</h3>
                        <p className="text-[11px] font-medium leading-[16.5px] tracking-[-0.16px] text-gray-500">
                          {subtitle}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-gray-500" aria-hidden />
                  </div>
                </OptionShell>
              ))}
            </div>
          </section>

          <section className="flex items-start gap-4 rounded-2xl border border-emerald-500/10 bg-emerald-500/10 p-[17px]">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <ShieldCheck className="size-5 text-emerald-500" aria-hidden />
            </span>
            <div className="flex flex-col gap-[3px]">
              <h3 className="text-sm font-bold leading-5 tracking-[-0.35px] text-emerald-500">
                100% Secure Payment
              </h3>
              <p className="text-[11px] font-normal leading-[17.9px] tracking-[-0.16px] text-gray-500">
                Your payment is protected with bank-grade encryption and secure gateways.
              </p>
            </div>
          </section>

          <section className="flex items-start gap-4 rounded-2xl border border-amber-500/10 bg-amber-500/10 p-[17px]">
            <Info className="mt-1 size-4 shrink-0 text-amber-500" aria-hidden />
            <p className="text-[11px] font-medium leading-[17.9px] tracking-[-0.16px] text-gray-500">
              <span className="font-bold text-amber-500">Note:</span> This is a secure and monitored
              payment process. Never share your payment details with anyone.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

function PackageSummary() {
  return (
    <section className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-surface-2 p-[21px]">
      <IndianRupee
        className="pointer-events-none absolute right-4 top-[17px] h-[60px] w-[45px] opacity-5"
        strokeWidth={2.5}
        aria-hidden
      />

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1.5 pt-1.5">
          <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-gray-500">
            Selected package
          </span>
          <span className="text-xl font-bold uppercase leading-7 tracking-[-0.5px]">
            {SELECTED_PACKAGE.name}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1.5 pt-1.5">
          <span className="text-[10px] font-bold uppercase leading-[15px] tracking-[1px] text-gray-500">
            Amount
          </span>
          <span className="text-2xl font-extrabold leading-8 tracking-[-0.16px] text-amber-500">
            {SELECTED_PACKAGE.amount}
          </span>
        </div>
      </div>

      <div className="mt-6 flex items-end justify-between border-t border-white/5 pt-[17px]">
        <div className="flex flex-col gap-px">
          <span className="text-[10px] font-medium leading-[15px] tracking-[-0.16px] text-gray-500">
            You are investing
          </span>
          <span className="text-[11px] font-semibold uppercase italic leading-[16.5px] tracking-[-0.16px] text-gray-300">
            {SELECTED_PACKAGE.amountInWords}
          </span>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10">
          <Info className="size-3 text-amber-500" aria-hidden />
        </span>
      </div>
    </section>
  )
}

function CryptoOption() {
  return (
    <OptionShell className="gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {/* Tether brand green — outside the Tailwind palette. */}
          <IconTile className="w-[41px] from-[#26A17B] to-[#1A7A5D] shadow-lg shadow-emerald-900/20">
            <TetherIcon className="h-6 w-[15px] text-white" />
          </IconTile>
          <div className="flex flex-col gap-0.5 pl-4">
            <div className="flex items-start gap-2">
              <h3 className="text-base font-bold leading-6 tracking-[-0.16px]">
                Pay with USDT (Crypto)
              </h3>
              <span className="mt-1 shrink-0 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-[9px] py-[3px] text-[8px] font-extrabold uppercase leading-3 tracking-[-0.16px] text-emerald-500">
                Recommended
              </span>
            </div>
            <p className="text-xs font-medium leading-4 tracking-[-0.16px] text-gray-400">
              Fast • Secure • 24/7
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-gray-500" aria-hidden />
      </div>

      <div className="flex flex-col gap-4 pl-16">
        <p className="text-xs font-medium leading-[19.5px] tracking-[-0.16px] text-gray-500">
          Pay using USDT (TRC20 / BEP20) via trusted crypto gateways.
        </p>
        <div className="flex items-center gap-3">
          <Chip className="border-white/5 bg-white/5 text-gray-300">
            <Shield className="size-3" aria-hidden />
            Trust Wallet
          </Chip>
          <Chip className="border-white/5 bg-white/5 text-gray-300">
            <BnbIcon className="size-3" />
            Binance Pay
          </Chip>
        </div>
      </div>
    </OptionShell>
  )
}

function InrOption() {
  return (
    <OptionShell className="gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <IconTile className="from-orange-500 to-orange-600 shadow-lg shadow-orange-900/20">
            <IndianRupee className="size-5 text-white" strokeWidth={2.5} aria-hidden />
          </IconTile>
          <div className="flex flex-col gap-0.5 pl-4">
            <h3 className="text-base font-bold leading-6 tracking-[-0.16px]">Pay with INR</h3>
            <p className="text-xs font-medium leading-4 tracking-[-0.16px] text-gray-400">
              Simple • Safe • Convenient
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-gray-500" aria-hidden />
      </div>

      <div className="flex flex-col gap-4 pl-16">
        <p className="text-xs font-medium leading-[19.5px] tracking-[-0.16px] text-gray-500">
          Pay in INR and our team will help you complete the payment.
        </p>
        <div className="flex items-center gap-3">
          <Chip className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <MessageCircle className="size-3.5" aria-hidden />
            Chat on WhatsApp
          </Chip>
          <Chip className="border-sky-500/20 bg-sky-500/10 text-sky-500">
            <Send className="size-3.5" aria-hidden />
            Chat on Telegram
          </Chip>
        </div>
      </div>
    </OptionShell>
  )
}

function OptionShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full flex-col rounded-2xl border border-white/[0.08] bg-surface p-[21px] text-left',
        'transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand',
        className
      )}
    >
      {children}
    </button>
  )
}

function IconTile({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br',
        className
      )}
    >
      {children}
    </span>
  )
}

function Chip({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'flex items-center gap-2 rounded-xl border px-[13px] py-[9px]',
        'text-[10px] font-bold leading-[15px] tracking-[-0.16px]',
        className
      )}
    >
      {children}
    </span>
  )
}
