import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  IndianRupee,
  Info,
  Loader2,
  ShieldCheck,
  Wallet,
} from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router'

import { AppShell } from '@/components/app/AppShell'
import { TelegramIcon, TetherIcon, WhatsAppIcon } from '@/components/app/icons'
import {
  deriveTelegram,
  deriveUsdtWallets,
  deriveWhatsapp,
  isMethodConfigured,
  whatsappUrl,
} from '@/config/payment'
import type { PaymentMethodId, UsdtWallet } from '@/config/payment'
import { usePlans, useSettings } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { createInvestment } from '@/services/api/investments'
import type { Investment } from '@/services/api/investments'
import type { PublicSettings } from '@/services/api/settings'
import type { Tier } from '@/types'
import { InrQrScreen } from './InrQrScreen'

interface LocationState {
  planKey: Tier
  amount: number // paise
}

/* ── Framer variants ── */
export const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.03 } },
}
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

const METHOD_LABEL: Record<PaymentMethodId, string> = {
  usdt: 'USDT (Crypto)',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
}

// `'inr-qr'` is a pseudo-method: it reuses the single createInvestment call but
// routes straight to the dedicated INR QR pay screen instead of PayScreen.
type ChooserMethod = PaymentMethodId | 'inr-qr'

export function PaymentMethodPage() {
  const location = useLocation()
  const [params] = useSearchParams()
  const state = location.state as LocationState | null

  // Resolve the selection from the URL query first, then router state, so a
  // refresh or a shared/deep link keeps the chosen plan and amount instead of
  // collapsing to "— / ₹0".
  const planKey = (params.get('plan') as Tier | null) ?? state?.planKey ?? null
  const amountPaise = Number(params.get('amt')) || state?.amount || 0
  const hasSelection = Boolean(planKey) && amountPaise > 0

  const { data: plans } = usePlans()
  const plan = plans?.find((p) => p.key === planKey)
  const planName = plan?.name ?? planKey ?? '—'

  const { data: settings } = useSettings()
  // Below the INR threshold, small deposits get a currency toggle (INR QR vs
  // USDT wallets); above it, the full four-option chooser stands.
  // When inrQr is disabled by the admin, the INR tab is hidden and mode
  // defaults to (and stays on) USDT — matching the same guard the other four
  // methods use via isMethodConfigured.
  const inrQrAvailable = settings?.methods.inrQr ?? true
  const [mode, setMode] = useState<'INR' | 'USDT'>(() =>
    (settings?.methods.inrQr ?? true) ? 'INR' : 'USDT'
  )
  const threshold = settings?.inrThresholdPaise ?? 200000
  const isSmall = amountPaise > 0 && amountPaise <= threshold

  // Sync mode to availability when settings first load (inrQr off → force USDT).
  useEffect(() => {
    if (!inrQrAvailable) setMode('USDT')
  }, [inrQrAvailable])

  /*
   * The investment record is created once, on the first method the user picks,
   * and then reused. Switching between payment methods is a change of mind about
   * *how* to pay, not a second deposit — creating another pending record would
   * leave the admin two rows to reconcile for one payment.
   */
  const [investment, setInvestment] = useState<Investment | null>(null)
  const [supportLink, setSupportLink] = useState<string>('')
  const [whatsappSupport, setWhatsappSupport] = useState<string>('')
  const [method, setMethod] = useState<ChooserMethod | null>(null)
  const [pending, setPending] = useState<ChooserMethod | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSelect = useCallback(
    async (next: ChooserMethod) => {
      if (!planKey || !hasSelection || pending) return
      setError(null)

      if (investment) {
        setMethod(next)
        return
      }

      setPending(next)
      try {
        const result = await createInvestment({ planKey, amount: amountPaise })
        setInvestment(result.investment)
        setSupportLink(result.telegramLink)
        setWhatsappSupport(result.whatsappLink)
        setMethod(next)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      } finally {
        setPending(null)
      }
    },
    [amountPaise, hasSelection, investment, pending, planKey]
  )

  /* ── Pay screen: one method, with its own instructions ── */
  if (method && investment && settings) {
    return (
      <AppShell backTo="/app" contentClassName="px-5">
        {method === 'inr-qr' ? (
          <InrQrScreen
            settings={settings}
            investment={investment}
            planName={planName}
            amountPaise={amountPaise || investment.amount}
            telegramFallback={supportLink}
            whatsappFallback={whatsappSupport}
          />
        ) : (
          <PayScreen
            method={method}
            settings={settings}
            investment={investment}
            planName={planName}
            amountPaise={amountPaise || investment.amount}
            telegramFallback={supportLink}
            whatsappFallback={whatsappSupport}
            onBack={() => setMethod(null)}
          />
        )}
      </AppShell>
    )
  }

  // Every method shape is derived from settings now, so hold the chooser until
  // it lands rather than rendering a chooser with no configured methods.
  if (!settings) {
    return (
      <AppShell backTo="/app" contentClassName="px-5">
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-asm-blue" aria-hidden />
          <span className="sr-only">Loading payment options…</span>
        </div>
      </AppShell>
    )
  }

  /* ── Chooser ── */
  return (
    <AppShell backTo="/app" contentClassName="px-5">
      <motion.div variants={container} initial="hidden" animate="visible" className="flex flex-col gap-5">
        {/* ── Step header ── */}
        <motion.div variants={fadeUp} className="flex flex-col items-center gap-1 text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-asm-blue">
            Step 2
          </span>
          <h1 className="text-[26px] font-extrabold uppercase leading-tight tracking-[-0.01em] text-asm-navy">
            Invest &amp; Pay
          </h1>
        </motion.div>

        {/* ── Selection summary ── */}
        <motion.div variants={fadeUp}>
          <PackageSummary planName={planName} amountPaise={amountPaise} />
        </motion.div>

        {!hasSelection && (
          <motion.div
            variants={fadeUp}
            className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
          >
            <Info className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-[12px] leading-relaxed text-amber-800">
              No package selected yet.{' '}
              <Link to="/app/invest" className="font-bold underline">
                Choose an investment
              </Link>{' '}
              to continue.
            </p>
          </motion.div>
        )}

        {error && (
          <motion.div
            variants={fadeUp}
            role="alert"
            aria-live="assertive"
            className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" aria-hidden />
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-red-700">Could not start payment</span>
              <p className="text-[12px] leading-relaxed text-red-600">{error}</p>
            </div>
          </motion.div>
        )}

        {/* ── Section rule ── */}
        <motion.div variants={fadeUp} className="flex items-center gap-3 pt-1">
          <span aria-hidden className="h-px flex-1 bg-asm-line" />
          <h2 className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-asm-muted">
            Choose payment method
          </h2>
          <span aria-hidden className="h-px flex-1 bg-asm-line" />
        </motion.div>

        {/*
         * Small deposits (≤ threshold) get a currency toggle: INR settles via a
         * single UPI QR screen, USDT keeps the crypto wallet options. Larger
         * deposits fall through to the full four-option chooser below.
         */}
        {/* Only render the toggle when both modes are available for small deposits */}
        {isSmall && inrQrAvailable && (
          <motion.div
            variants={fadeUp}
            role="tablist"
            aria-label="Deposit currency"
            className="flex gap-2 rounded-xl bg-asm-tint p-1"
          >
            {(['INR', 'USDT'] as const).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-lg px-3 py-2 text-[12px] font-bold transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
                  mode === m
                    ? 'bg-white text-asm-navy shadow-[0_2px_8px_-3px_rgba(16,42,92,0.2)]'
                    : 'text-asm-muted hover:text-asm-navy'
                )}
              >
                {m === 'INR' ? 'Pay in INR' : 'Pay in USDT'}
              </button>
            ))}
          </motion.div>
        )}

        {/* ── INR quick-pay (small deposits, INR mode) ── */}
        {isSmall && inrQrAvailable && mode === 'INR' && (
          <motion.section
            variants={fadeUp}
            aria-labelledby="pay-inr-qr-heading"
            className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-asm-blue-tint">
                <IndianRupee className="size-5 text-asm-blue" strokeWidth={2.5} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h3 id="pay-inr-qr-heading" className="text-[15px] font-extrabold leading-tight text-asm-navy">
                  INR Payment
                </h3>
                <p className="text-[12px] leading-relaxed text-asm-body">
                  Scan a UPI QR and pay in Indian Rupee (INR)
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSelect('inr-qr')}
              disabled={!hasSelection || Boolean(pending)}
              className={cn(
                'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
                'bg-asm-blue text-base font-bold text-white',
                'shadow-[0_4px_20px_-4px_rgba(11,79,216,0.5)] transition-opacity hover:opacity-90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
                'disabled:pointer-events-none disabled:opacity-45'
              )}
            >
              {pending === 'inr-qr' ? (
                <Loader2 className="size-5 animate-spin" aria-hidden />
              ) : (
                <>
                  Continue with UPI
                  <ChevronRight className="size-4 opacity-80" aria-hidden />
                </>
              )}
            </button>
          </motion.section>
        )}

        {/* ── USDT (crypto) ── */}
        {(!isSmall || mode === 'USDT') && (
          <motion.section
            variants={fadeUp}
            aria-labelledby="pay-usdt-heading"
            className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-asm-green-tint">
                <TetherIcon className="size-6 text-asm-greenInk" />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <h3 id="pay-usdt-heading" className="text-[15px] font-extrabold leading-tight text-asm-navy">
                    USDT (Crypto)
                  </h3>
                  <span className="rounded-full border border-asm-greenInk/25 bg-asm-green-tint px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.06em] text-asm-greenInk">
                    Recommended
                  </span>
                </div>
                <p className="text-[12px] leading-relaxed text-asm-body">
                  Pay using USDT (TRC20 / BEP20)
                </p>
              </div>
            </div>

            <MethodButton
              method="usdt"
              title="USDT (TRC20 / BEP20)"
              subtitle="Scan the QR to pay"
              icon={<TetherIcon className="size-5 text-asm-greenInk" />}
              iconClassName="bg-asm-green-tint"
              settings={settings}
              pending={pending === 'usdt'}
              disabled={!hasSelection || Boolean(pending)}
              onSelect={handleSelect}
            />
          </motion.section>
        )}

        {/* ── INR (large deposits: WhatsApp / Telegram handoff) ── */}
        {!isSmall && (
          <motion.section
            variants={fadeUp}
            aria-labelledby="pay-inr-heading"
            className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-asm-blue-tint">
                <IndianRupee className="size-5 text-asm-blue" strokeWidth={2.5} aria-hidden />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <h3 id="pay-inr-heading" className="text-[15px] font-extrabold leading-tight text-asm-navy">
                  INR Payment
                </h3>
                <p className="text-[12px] leading-relaxed text-asm-body">Pay using Indian Rupee (INR)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MethodButton
                method="whatsapp"
                title="WhatsApp"
                subtitle="Chat with us"
                icon={<WhatsAppIcon className="size-5 text-[#1FA855]" />}
                iconClassName="bg-[#E7F8EE]"
                settings={settings}
                pending={pending === 'whatsapp'}
                disabled={!hasSelection || Boolean(pending)}
                onSelect={handleSelect}
              />
              <MethodButton
                method="telegram"
                title="Telegram"
                subtitle="Chat with us"
                icon={<TelegramIcon className="size-5 text-[#0088CC]" />}
                iconClassName="bg-[#E5F5FC]"
                settings={settings}
                pending={pending === 'telegram'}
                disabled={!hasSelection || Boolean(pending)}
                onSelect={handleSelect}
              />
            </div>
          </motion.section>
        )}

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
              Every deposit is verified by an admin before your plan activates. ASM Coins will never
              ask for your wallet seed phrase, OTP or card details.
            </p>
          </div>
        </motion.section>
      </motion.div>
    </AppShell>
  )
}

/* ── Method tile ── */
function MethodButton({
  method,
  title,
  subtitle,
  icon,
  iconClassName,
  settings,
  pending,
  disabled,
  onSelect,
}: {
  method: PaymentMethodId
  title: string
  subtitle: string
  icon: React.ReactNode
  iconClassName: string
  settings: PublicSettings
  pending: boolean
  disabled: boolean
  onSelect: (method: PaymentMethodId) => void
}) {
  const configured = isMethodConfigured(settings, method)

  return (
    <button
      type="button"
      onClick={() => onSelect(method)}
      disabled={disabled || !configured}
      aria-describedby={configured ? undefined : `${method}-unavailable`}
      className={cn(
        'group flex min-h-[92px] flex-col items-start gap-2 rounded-xl border border-asm-line bg-white p-3 text-left',
        'transition-[border-color,box-shadow,transform] duration-200',
        'hover:-translate-y-0.5 hover:border-asm-blue/40 hover:shadow-[0_6px_18px_-8px_rgba(11,79,216,0.35)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-45'
      )}
    >
      <span className={cn('flex size-9 items-center justify-center rounded-lg', iconClassName)}>
        {pending ? <Loader2 className="size-4 animate-spin text-asm-blue" aria-hidden /> : icon}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold leading-tight text-asm-navy">{title}</span>
        <span id={configured ? undefined : `${method}-unavailable`} className="text-[11px] leading-tight text-asm-muted">
          {configured ? subtitle : 'Temporarily unavailable'}
        </span>
      </span>
    </button>
  )
}

/* ── Package Summary ── */
export function PackageSummary({ planName, amountPaise }: { planName: string; amountPaise: number }) {
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
            Investment selected
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

/* ── Pay screen ───────────────────────────────────────────────────
 * Shown after the investment record exists, so every screen can quote a
 * reference code the admin can match the incoming payment against.
 */
function PayScreen({
  method,
  settings,
  investment,
  planName,
  amountPaise,
  telegramFallback,
  whatsappFallback,
  onBack,
}: {
  method: PaymentMethodId
  settings: PublicSettings
  investment: Investment
  planName: string
  amountPaise: number
  /** Server-configured support link, used when the client env has no username. */
  telegramFallback: string
  /** Server-configured WhatsApp support link, used when no number is set. */
  whatsappFallback: string
  onBack: () => void
}) {
  const { copied, copy } = useCopy()
  const telegramHref = deriveTelegram(settings).url || telegramFallback

  const message = [
    `ASM Coins deposit — ${METHOD_LABEL[method]}`,
    `Plan: ${planName}`,
    `Amount: ${inr(amountPaise)}`,
    `Reference: ${investment.referenceCode}`,
  ].join('\n')

  // Prefer the configured number (prefills the deposit message); fall back to
  // the support WhatsApp link so the button mirrors the Telegram one.
  const whatsappHref = whatsappUrl(settings, message) || whatsappFallback

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="flex flex-col gap-5">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex w-fit items-center gap-1.5 rounded-lg py-1 pr-2 text-[12px] font-bold text-asm-muted transition-colors hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Change payment method
        </button>
        <div className="flex flex-col items-center gap-1 text-center">
          <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-asm-blue">
            Step 3
          </span>
          <h1 className="text-[26px] font-extrabold uppercase leading-tight tracking-[-0.01em] text-asm-navy">
            Pay with {METHOD_LABEL[method]}
          </h1>
        </div>
      </motion.div>

      {/* Reference code — the one thing the user must not lose */}
      <motion.section
        variants={fadeUp}
        aria-label="Investment reference"
        className="flex flex-col gap-2 rounded-2xl border-2 border-asm-blue/20 bg-asm-blue-tint p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-asm-muted">
              Reference code
            </span>
            <span
              className="font-mono text-[26px] font-black leading-none tracking-[0.06em] text-asm-blue"
              aria-label={`Reference code: ${investment.referenceCode}`}
            >
              {investment.referenceCode}
            </span>
          </div>
          <CopyButton
            label="Copy reference code"
            copied={copied === 'ref'}
            onCopy={() => copy('ref', investment.referenceCode)}
          />
        </div>
        <p className="text-[11px] leading-relaxed text-asm-body">
          Include this code with your payment — it is how we match the transfer to your account.
        </p>
      </motion.section>

      {/* Amount reminder */}
      <motion.div variants={fadeUp}>
        <PackageSummary planName={planName} amountPaise={amountPaise} />
      </motion.div>

      {/* Method-specific body */}
      {method === 'usdt' && (
        <UsdtInstructions settings={settings} copied={copied} onCopy={copy} />
      )}
      {method === 'whatsapp' && (
        <ChatInstructions settings={settings} channel="whatsapp" message={message} />
      )}
      {method === 'telegram' && (
        <ChatInstructions
          settings={settings}
          channel="telegram"
          message={message}
          copied={copied === 'msg'}
          onCopy={() => copy('msg', message)}
        />
      )}

      {/* Crypto → proof of payment goes to WhatsApp or Telegram */}
      {method === 'usdt' && (
        <motion.section
          variants={fadeUp}
          className="flex flex-col gap-3 rounded-2xl border-2 border-[#0088CC]/25 bg-[#E5F5FC] p-4"
        >
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <TelegramIcon className="size-5 text-[#0088CC]" />
            </span>
            <div className="flex flex-col gap-1">
              <h3 className="text-[13px] font-extrabold leading-tight text-asm-navy">
                Now send the screenshot
              </h3>
              <p className="text-[12px] leading-relaxed text-asm-body">
                After you transfer, send a screenshot of the transaction on WhatsApp or Telegram
                along with your reference code. Your deposit stays pending until an admin verifies it.
              </p>
            </div>
          </div>
          {whatsappHref && (
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
                'bg-[#1FA855] text-base font-bold text-white',
                'shadow-[0_4px_20px_-4px_rgba(31,168,85,0.5)] transition-opacity hover:opacity-90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA855] focus-visible:ring-offset-2'
              )}
            >
              <WhatsAppIcon className="size-5" />
              Send screenshot on WhatsApp
              <ExternalLink className="size-4 opacity-70" aria-hidden />
            </a>
          )}
          <TelegramCta href={telegramHref} label="Send screenshot on Telegram" />
        </motion.section>
      )}

      {/* Status */}
      <motion.section
        variants={fadeUp}
        className="flex items-start gap-3 rounded-2xl border border-asm-line bg-white p-4"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-asm-blue" aria-hidden />
        <p className="text-[12px] leading-relaxed text-asm-body">
          <span className="font-bold text-asm-navy">Status: </span>
          <span className="font-bold uppercase tracking-[0.06em] text-amber-700">Pending</span>. Your
          plan activates only once an admin confirms the payment — you can track it from{' '}
          <Link to="/app/dashboard" className="font-bold text-asm-blue underline">
            your dashboard
          </Link>
          .
        </p>
      </motion.section>
    </motion.div>
  )
}

/* ── USDT wallet transfer (TRC20 / BEP20) ── */
function UsdtInstructions({
  settings,
  copied,
  onCopy,
}: {
  settings: PublicSettings
  copied: string | null
  onCopy: (key: string, value: string) => void
}) {
  const wallets = deriveUsdtWallets(settings)
  const [active, setActive] = useState<UsdtWallet | undefined>(wallets[0])
  /* Each chain has its own QR file, so a missing one is tracked per network. */
  const [hasQr, setHasQr] = useState(true)

  if (!active) return <UnavailableNotice method="USDT" />

  return (
    <motion.section
      variants={fadeUp}
      aria-label="USDT transfer details"
      className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
    >
      {/* Network picker — only when more than one chain is configured */}
      {wallets.length > 1 && (
        <div role="tablist" aria-label="USDT network" className="flex gap-2 rounded-xl bg-asm-tint p-1">
          {wallets.map((wallet) => (
            <button
              key={wallet.network}
              type="button"
              role="tab"
              aria-selected={wallet.network === active.network}
              onClick={() => {
                setActive(wallet)
                setHasQr(true)
              }}
              className={cn(
                'flex-1 rounded-lg px-3 py-2 text-[12px] font-bold transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
                wallet.network === active.network
                  ? 'bg-white text-asm-navy shadow-[0_2px_8px_-3px_rgba(16,42,92,0.2)]'
                  : 'text-asm-muted hover:text-asm-navy'
              )}
            >
              {wallet.network}
            </button>
          ))}
        </div>
      )}

      <QrCode
        key={active.network}
        src={active.qr}
        alt={`USDT ${active.network} deposit QR code`}
        onMissing={() => setHasQr(false)}
      />

      <AddressField
        label={`USDT · ${active.chain}`}
        value={active.address}
        copied={copied === `addr-${active.network}`}
        onCopy={() => onCopy(`addr-${active.network}`, active.address)}
      />

      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
        <p className="text-[11px] leading-relaxed text-amber-800">
          Send <span className="font-bold">USDT on {active.network} only</span>. Funds sent on any
          other network cannot be recovered.
        </p>
      </div>

      <Steps
        items={[
          `Open your wallet and choose USDT on ${active.network}.`,
          hasQr
            ? 'Scan the QR code above, or paste the address into the recipient field.'
            : 'Paste the address above into the recipient field.',
          'Send the USDT equivalent of your investment amount.',
          'Screenshot the completed transaction.',
        ]}
      />
    </motion.section>
  )
}

/* ── WhatsApp / Telegram chat handoff (INR) ── */
function ChatInstructions({
  settings,
  channel,
  message,
  copied,
  onCopy,
}: {
  settings: PublicSettings
  channel: 'whatsapp' | 'telegram'
  message: string
  copied?: boolean
  onCopy?: () => void
}) {
  const isWhatsApp = channel === 'whatsapp'
  const telegram = deriveTelegram(settings)
  const whatsapp = deriveWhatsapp(settings)
  const href = isWhatsApp ? whatsappUrl(settings, message) : telegram.url
  const handle = isWhatsApp ? whatsapp.display : telegram.display

  if (!href) return <UnavailableNotice method={isWhatsApp ? 'WhatsApp' : 'Telegram'} />

  return (
    <motion.section
      variants={fadeUp}
      aria-label={`${isWhatsApp ? 'WhatsApp' : 'Telegram'} payment details`}
      className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
    >
      <div className="flex items-center justify-between rounded-xl bg-asm-tint px-3 py-2.5">
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
          {isWhatsApp ? 'WhatsApp' : 'Telegram'}
        </span>
        <span className="text-[13px] font-bold text-asm-navy">{handle}</span>
      </div>

      <Steps
        items={
          isWhatsApp
            ? [
                'Tap the button below — your reference code is filled in for you.',
                'Our team sends you the UPI / bank details for the amount above.',
                'Pay in INR and send the payment screenshot in the same chat.',
              ]
            : [
                'Copy the payment details below, then open the chat.',
                'Our team sends you the UPI / bank details for the amount above.',
                'Pay in INR and send the payment screenshot in the same chat.',
              ]
        }
      />

      {/*
       * Telegram has no supported way to prefill the body of a chat with a
       * person (only bots take `?start=`), so that path copies the details to
       * the clipboard instead of silently dropping them.
       */}
      {!isWhatsApp && onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            'flex h-12 w-full items-center justify-center gap-2 rounded-xl',
            'border border-asm-line bg-white text-[14px] font-bold text-asm-navy',
            'transition-colors hover:bg-asm-tint',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2'
          )}
        >
          {copied ? (
            <>
              <Check className="size-4 text-asm-greenInk" aria-hidden />
              Details copied
            </>
          ) : (
            <>
              <Copy className="size-4" aria-hidden />
              Copy payment details
            </>
          )}
        </button>
      )}

      {isWhatsApp ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
            'bg-[#1FA855] text-base font-bold text-white',
            'shadow-[0_4px_20px_-4px_rgba(31,168,85,0.5)] transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA855] focus-visible:ring-offset-2'
          )}
        >
          <WhatsAppIcon className="size-5" />
          Chat on WhatsApp
          <ExternalLink className="size-4 opacity-70" aria-hidden />
        </a>
      ) : (
        <TelegramCta href={href} label="Chat on Telegram" />
      )}
    </motion.section>
  )
}

/* ── Shared bits ── */

export function TelegramCta({ href, label }: { href: string; label: string }) {
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
        'bg-[#0088cc] text-base font-bold text-white',
        'shadow-[0_4px_20px_-4px_rgba(0,136,204,0.5)] transition-opacity hover:opacity-90',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc] focus-visible:ring-offset-2'
      )}
    >
      <TelegramIcon className="size-5" />
      {label}
      <ExternalLink className="size-4 opacity-70" aria-hidden />
    </a>
  )
}

function AddressField({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string
  value: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-asm-line bg-asm-tint p-3">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">{label}</span>
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 break-all font-mono text-[12px] font-semibold leading-relaxed text-asm-navy">
          {value}
        </code>
        <CopyButton label={`Copy ${label}`} copied={copied} onCopy={onCopy} />
      </div>
    </div>
  )
}

export function CopyButton({
  label,
  copied,
  onCopy,
}: {
  label: string
  copied: boolean
  onCopy: () => void
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={cn(
        'flex size-11 shrink-0 items-center justify-center rounded-xl border transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
        copied
          ? 'border-asm-greenInk/30 bg-asm-green-tint text-asm-greenInk'
          : 'border-asm-line bg-white text-asm-blue hover:bg-asm-blue-tint'
      )}
    >
      {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? 'Copied' : ''}
      </span>
    </button>
  )
}

/**
 * QR images are dropped into `public/payment/` by hand, so a missing file is a
 * normal state rather than a bug — the block removes itself and the copyable
 * address carries the flow.
 */
export function QrCode({ src, alt, onMissing }: { src: string; alt: string; onMissing?: () => void }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null

  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-asm-line bg-white p-4">
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onError={() => {
          setFailed(true)
          onMissing?.()
        }}
        className="aspect-square w-full max-w-sm rounded-lg object-contain"
        width={384}
        height={384}
      />
      <span className="text-[11px] font-semibold text-asm-muted">Scan to pay</span>
    </div>
  )
}

export function Steps({ items }: { items: string[] }) {
  return (
    <ol className="flex flex-col gap-2">
      {items.map((text, i) => (
        <li key={text} className="flex items-start gap-3">
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-asm-blue-tint text-[11px] font-bold text-asm-blue">
            {i + 1}
          </span>
          <p className="text-[13px] leading-relaxed text-asm-body">{text}</p>
        </li>
      ))}
    </ol>
  )
}

function UnavailableNotice({ method }: { method: string }) {
  return (
    <motion.section
      variants={fadeUp}
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"
    >
      <Wallet className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
      <p className="text-[12px] leading-relaxed text-amber-800">
        {method} is not configured yet. Pick another payment method, or contact support with your
        reference code.
        <ChevronRight className="ml-0.5 inline size-3" aria-hidden />
      </p>
    </motion.section>
  )
}

/** Copy-to-clipboard with a 2s "copied" acknowledgement, keyed per field. */
export function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  const copy = useCallback(async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(key)
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(null), 2000)
    } catch {
      // Clipboard denied (insecure origin, or the user said no). The value is
      // on screen and selectable, so there is nothing to recover from.
    }
  }, [])

  return { copied, copy }
}
