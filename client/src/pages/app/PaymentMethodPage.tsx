import { motion } from 'framer-motion'
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
  tone: 'blue' | 'green'
}[] = [
  {
    id: 'other-wallets',
    title: 'Other Wallets (USDT)',
    subtitle: 'Use any other wallet to pay USDT',
    Icon: Wallet,
    tone: 'blue',
  },
  {
    id: 'need-help',
    title: 'Need Help?',
    subtitle: 'Contact our support team anytime',
    Icon: Headphones,
    tone: 'green',
  },
]

/* ── Framer variants ── */
const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.03 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

export function PaymentMethodPage() {
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
            Payment{' '}
            <span className="text-asm-blue">Method</span>
          </h1>
          <p className="text-[13px] font-medium leading-relaxed text-asm-body">
            Complete your payment securely to start your investment.
          </p>
        </motion.div>

        {/* ── Package summary ── */}
        <motion.div variants={fadeUp}>
          <PackageSummary />
        </motion.div>

        {/* ── Payment options ── */}
        <motion.section variants={fadeUp} className="flex flex-col gap-4">
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-asm-muted">
            Choose Payment Option
          </h2>

          <div className="flex flex-col gap-3">
            <CryptoOption />
            <InrOption />
            {SIMPLE_OPTIONS.map(({ id, title, subtitle, Icon, tone }) => (
              <OptionShell key={id}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <IconTile tone={tone}>
                      <Icon className="size-5 text-white" aria-hidden />
                    </IconTile>
                    <div className="flex flex-col gap-px">
                      <h3 className="text-[15px] font-bold leading-snug text-asm-navy">{title}</h3>
                      <p className="text-[12px] font-medium leading-snug text-asm-body">{subtitle}</p>
                    </div>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-asm-muted" aria-hidden />
                </div>
              </OptionShell>
            ))}
          </div>
        </motion.section>

        {/* ── Secure payment notice ── */}
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
              Your payment is protected with bank-grade encryption and secure gateways.
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
            <span className="font-bold text-asm-blue">Note:</span> This is a secure and monitored
            payment process. Never share your payment details with anyone.
          </p>
        </motion.section>
      </motion.div>
    </AppShell>
  )
}

/* ── Package Summary ── */
function PackageSummary() {
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
            {SELECTED_PACKAGE.name}
          </span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">
            Amount
          </span>
          <span className="text-[22px] font-extrabold leading-tight tabular-nums text-asm-blue">
            {SELECTED_PACKAGE.amount}
          </span>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-asm-line pt-4">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-medium tracking-[-0.01em] text-asm-muted">
            You are investing
          </span>
          <span className="text-[12px] font-semibold italic text-asm-body">
            {SELECTED_PACKAGE.amountInWords}
          </span>
        </div>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-asm-blue/20 bg-asm-blue-tint">
          <Info className="size-3 text-asm-blue" aria-hidden />
        </span>
      </div>
    </section>
  )
}

/* ── Crypto option ── */
function CryptoOption() {
  return (
    <OptionShell className="gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#26A17B] to-[#1A7A5D]">
            <TetherIcon className="h-6 w-[15px] text-white" />
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold leading-snug text-asm-navy">
                Pay with USDT (Crypto)
              </h3>
              <span className="shrink-0 rounded-full border border-asm-greenInk/20 bg-asm-green-tint px-2 py-0.5 text-[8px] font-extrabold uppercase tracking-[0.06em] text-asm-greenInk">
                Recommended
              </span>
            </div>
            <p className="text-[12px] font-medium leading-snug text-asm-body">Fast · Secure · 24/7</p>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-asm-muted" aria-hidden />
      </div>

      <div className="flex flex-col gap-3 pl-16">
        <p className="text-[12px] leading-relaxed text-asm-body">
          Pay using USDT (TRC20 / BEP20) via trusted crypto gateways.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="navy">
            <Shield className="size-3" aria-hidden />
            Trust Wallet
          </Chip>
          <Chip tone="navy">
            <BnbIcon className="size-3" />
            Binance Pay
          </Chip>
        </div>
      </div>
    </OptionShell>
  )
}

/* ── INR option ── */
function InrOption() {
  return (
    <OptionShell className="gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600">
            <IndianRupee className="size-5 text-white" strokeWidth={2.5} aria-hidden />
          </span>
          <div className="flex flex-col gap-0.5">
            <h3 className="text-[15px] font-bold leading-snug text-asm-navy">Pay with INR</h3>
            <p className="text-[12px] font-medium leading-snug text-asm-body">
              Simple · Safe · Convenient
            </p>
          </div>
        </div>
        <ChevronRight className="size-4 shrink-0 text-asm-muted" aria-hidden />
      </div>

      <div className="flex flex-col gap-3 pl-16">
        <p className="text-[12px] leading-relaxed text-asm-body">
          Pay in INR and our team will help you complete the payment.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="green">
            <MessageCircle className="size-3.5" aria-hidden />
            Chat on WhatsApp
          </Chip>
          <Chip tone="blue">
            <Send className="size-3.5" aria-hidden />
            Chat on Telegram
          </Chip>
        </div>
      </div>
    </OptionShell>
  )
}

/* ── Primitives ── */
function OptionShell({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: 1.005, transition: { type: 'spring' as const, stiffness: 400, damping: 30 } }}
      whileTap={{ scale: 0.995 }}
      className={cn(
        'flex w-full flex-col rounded-2xl border border-asm-line bg-white p-5 text-left',
        'shadow-[0_2px_12px_-4px_rgba(16,42,92,0.07)]',
        'transition-colors hover:border-asm-blue/30 hover:bg-asm-blue-tint/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
        className
      )}
    >
      {children}
    </motion.button>
  )
}

function IconTile({ tone, children }: { tone: 'blue' | 'green'; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br',
        tone === 'blue'
          ? 'from-asm-blue to-asm-blue-dark'
          : 'from-asm-greenInk to-[#0E6E32]'
      )}
    >
      {children}
    </span>
  )
}

function Chip({
  tone,
  children,
}: {
  tone: 'blue' | 'green' | 'navy'
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 rounded-xl border px-3 py-2',
        'text-[11px] font-bold leading-none',
        tone === 'green' && 'border-asm-greenInk/20 bg-asm-green-tint text-asm-greenInk',
        tone === 'blue'  && 'border-asm-blue/20 bg-asm-blue-tint text-asm-blue',
        tone === 'navy'  && 'border-asm-line bg-asm-tint text-asm-navy'
      )}
    >
      {children}
    </span>
  )
}
