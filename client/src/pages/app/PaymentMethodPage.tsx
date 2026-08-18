import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  ExternalLink,
  IndianRupee,
  Info,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router'

import { AppShell } from '@/components/app/AppShell'
import { TelegramIcon, TetherIcon, WhatsAppIcon } from '@/components/app/icons'
import {
  deriveTelegram,
  deriveUsdtWallets,
  isMethodConfigured,
  whatsappUrl,
} from '@/config/payment'
import type { PaymentMethodId, UsdtNetwork } from '@/config/payment'
import { usePlans, useSettings } from '@/hooks/queries'
import { ApiError } from '@/lib/api'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { createInvestment, notifyPayment } from '@/services/api/investments'
import type { Investment } from '@/services/api/investments'

import type { PublicSettings } from '@/services/api/settings'
import type { Tier } from '@/types'

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

// `'inr-qr'` is a pseudo-method: it reuses the single createInvestment call but
// routes straight to the dedicated INR QR pay screen instead of PayScreen.
type ChooserMethod = PaymentMethodId | 'inr-qr'

export function PaymentMethodPage() {
  const location = useLocation()
  const navigate = useNavigate()
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

  const [pending, setPending] = useState<ChooserMethod | null>(null)
  // Which USDT chain is mid-request, so only the tapped tile shows its spinner.
  const [pendingNetwork, setPendingNetwork] = useState<UsdtNetwork | undefined>()
  const [error, setError] = useState<string | null>(null)
  // Once the investment record exists, we move to an in-page pay screen (QR /
  // wallet / chat details) instead of jumping straight to the confirmation
  // page. The deposit is only "submitted" — email sent, confirm page shown —
  // once the user taps "I've paid".
  const [payStep, setPayStep] = useState<{
    investment: Investment
    method: ChooserMethod
    network?: UsdtNetwork
    telegramLink: string
    whatsappLink: string
  } | null>(null)
  const [confirming, setConfirming] = useState(false)

  const handleSelect = useCallback(
    async (next: ChooserMethod, network?: UsdtNetwork) => {
      if (!planKey || !hasSelection || pending) return
      setError(null)

      setPending(next)
      setPendingNetwork(next === 'usdt' ? network : undefined)
      try {
        const result = await createInvestment({ planKey, amount: amountPaise })
        setPayStep({
          investment: result.investment,
          method: next,
          network: next === 'usdt' ? network : undefined,
          telegramLink: result.telegramLink,
          whatsappLink: result.whatsappLink,
        })
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      } finally {
        setPending(null)
        setPendingNetwork(undefined)
      }
    },
    [amountPaise, hasSelection, pending, planKey]
  )

  const handleSelectUsdt = useCallback(
    (network: UsdtNetwork) => {
      void handleSelect('usdt', network)
    },
    [handleSelect]
  )

  // "I've paid" — mark the deposit as submitted (fires the email server-side),
  // then move to the confirmation page. Even if the notify call fails, the
  // deposit record already exists, so we still forward to the confirm page.
  const handlePaid = useCallback(async () => {
    if (!payStep || confirming) return
    setConfirming(true)
    try {
      const res = await notifyPayment(payStep.investment._id)
      navigate(`/app/invest/confirm/${payStep.investment._id}`, {
        state: { whatsappLink: res.whatsappLink, telegramLink: res.telegramLink },
      })
    } catch {
      navigate(`/app/invest/confirm/${payStep.investment._id}`, {
        state: { whatsappLink: payStep.whatsappLink, telegramLink: payStep.telegramLink },
      })
    } finally {
      setConfirming(false)
    }
  }, [confirming, navigate, payStep])

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

  /* ── Pay screen (shown after the deposit record is created) ── */
  if (payStep) {
    return (
      <PayStep
        payStep={payStep}
        planName={planName}
        amountPaise={amountPaise}
        settings={settings}
        confirming={confirming}
        onBack={() => setPayStep(null)}
        onPaid={handlePaid}
      />
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

            <div className="grid grid-cols-2 gap-3">
              <UsdtNetworkButton
                network="TRC20"
                subtitle="Tron network"
                settings={settings}
                pending={Boolean(pending) && pendingNetwork === 'TRC20'}
                disabled={!hasSelection || Boolean(pending)}
                onSelect={handleSelectUsdt}
              />
              <UsdtNetworkButton
                network="BEP20"
                subtitle="BNB Smart Chain"
                settings={settings}
                pending={Boolean(pending) && pendingNetwork === 'BEP20'}
                disabled={!hasSelection || Boolean(pending)}
                onSelect={handleSelectUsdt}
              />
            </div>
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

/* ── Pay screen ── */
function PayStep({
  payStep,
  planName,
  amountPaise,
  settings,
  confirming,
  onBack,
  onPaid,
}: {
  payStep: {
    investment: Investment
    method: ChooserMethod
    network?: UsdtNetwork
    telegramLink: string
    whatsappLink: string
  }
  planName: string
  amountPaise: number
  settings: PublicSettings
  confirming: boolean
  onBack: () => void
  onPaid: () => void
}) {
  const { investment, method, network } = payStep
  const { copied, copy } = useCopy()

  // For USDT, resolve the wallet for the tapped chain (fall back to the first
  // configured wallet so the screen is never empty).
  const wallets = deriveUsdtWallets(settings)
  const wallet = wallets.find((w) => w.network === network) ?? wallets[0]

  const telegram = deriveTelegram(settings)
  const chatMessage = `Hi, I've paid for my ASM Coins deposit. Reference: ${investment.referenceCode} (${inr(amountPaise)}).`
  const whatsapp = whatsappUrl(settings, chatMessage)

  return (
    <AppShell backTo="/app" contentClassName="px-5">
      <motion.div variants={container} initial="hidden" animate="visible" className="flex flex-col gap-5">
        {/* ── Header + back ── */}
        <motion.div variants={fadeUp} className="flex flex-col gap-3">
          <button
            type="button"
            onClick={onBack}
            className="flex w-fit items-center gap-1.5 text-[13px] font-bold text-asm-muted transition-colors hover:text-asm-navy"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Change method
          </button>
          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-asm-blue">
              Complete payment
            </span>
            <h1 className="text-[24px] font-extrabold uppercase leading-tight tracking-[-0.01em] text-asm-navy">
              {method === 'usdt' ? 'Pay with USDT' : method === 'inr-qr' ? 'Pay via UPI' : 'Complete on chat'}
            </h1>
          </div>
        </motion.div>

        {/* ── Summary ── */}
        <motion.div variants={fadeUp}>
          <PackageSummary planName={planName} amountPaise={amountPaise} />
        </motion.div>

        {/* ── Reference code ── */}
        <motion.div
          variants={fadeUp}
          className="flex items-center justify-between gap-3 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">
              Reference code
            </span>
            <span className="truncate text-[16px] font-extrabold tabular-nums text-asm-navy">
              {investment.referenceCode}
            </span>
          </div>
          <CopyButton
            label="Copy reference code"
            copied={copied === 'ref'}
            onCopy={() => copy('ref', investment.referenceCode)}
          />
        </motion.div>

        {/* ── Method-specific body ── */}
        {method === 'inr-qr' && (
          <motion.section
            variants={fadeUp}
            className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
          >
            {settings.inrQrUrl && <QrCode src={settings.inrQrUrl} alt="UPI QR code" />}
            <Steps
              items={[
                `Scan the QR with any UPI app and pay exactly ${inr(amountPaise)}.`,
                `Add your reference code ${investment.referenceCode} in the payment note.`,
                'Take a screenshot of the successful payment.',
                'Tap "I’ve paid" below, then share the screenshot for faster approval.',
              ]}
            />
          </motion.section>
        )}

        {method === 'usdt' && wallet && (
          <motion.section
            variants={fadeUp}
            className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
          >
            <div className="flex items-center gap-2">
              <TetherIcon className="size-5 text-asm-greenInk" />
              <span className="text-[14px] font-extrabold text-asm-navy">{wallet.chain}</span>
            </div>
            {wallet.qr && <QrCode src={wallet.qr} alt={`${wallet.chain} wallet QR`} />}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-asm-line bg-asm-tint p-3">
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-asm-muted">
                  Wallet address
                </span>
                <span className="break-all text-[12px] font-semibold text-asm-navy">
                  {wallet.address}
                </span>
              </div>
              <CopyButton
                label="Copy wallet address"
                copied={copied === 'addr'}
                onCopy={() => copy('addr', wallet.address)}
              />
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
              <p className="text-[12px] leading-relaxed text-amber-800">
                Send USDT only on the <strong>{wallet.network}</strong> network. Funds sent on any
                other chain cannot be recovered.
              </p>
            </div>
          </motion.section>
        )}

        {(method === 'whatsapp' || method === 'telegram') && (
          <motion.section
            variants={fadeUp}
            className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
          >
            <p className="text-[13px] leading-relaxed text-asm-body">
              Message us on {method === 'whatsapp' ? 'WhatsApp' : 'Telegram'} with your reference code{' '}
              <strong>{investment.referenceCode}</strong> to complete this deposit. Our team will
              share the payment details and confirm your plan.
            </p>
            {method === 'whatsapp' && whatsapp && (
              <a
                href={whatsapp}
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
                Open WhatsApp
                <ExternalLink className="size-4 opacity-70" aria-hidden />
              </a>
            )}
            {method === 'telegram' && telegram.url && (
              <TelegramCta href={telegram.url} label="Open Telegram" />
            )}
          </motion.section>
        )}

        {/* ── I've paid ── */}
        <motion.button
          variants={fadeUp}
          type="button"
          onClick={onPaid}
          disabled={confirming}
          className={cn(
            'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
            'bg-asm-green text-base font-bold text-white',
            'shadow-[0_4px_20px_-4px_rgba(16,150,84,0.5)] transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-green focus-visible:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-45'
          )}
        >
          {confirming ? (
            <Loader2 className="size-5 animate-spin" aria-hidden />
          ) : (
            <>
              <CheckCircle2 className="size-5" aria-hidden />
              I&rsquo;ve paid
            </>
          )}
        </motion.button>

        <motion.p variants={fadeUp} className="text-center text-[12px] leading-relaxed text-asm-muted">
          Only tap this after you&rsquo;ve completed the payment. We&rsquo;ll email your deposit
          summary and take you to the confirmation screen to share your screenshot.
        </motion.p>
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

/* ── USDT network tile (TRC20 / BEP20) ── */
function UsdtNetworkButton({
  network,
  subtitle,
  settings,
  pending,
  disabled,
  onSelect,
}: {
  network: UsdtNetwork
  subtitle: string
  settings: PublicSettings
  pending: boolean
  disabled: boolean
  onSelect: (network: UsdtNetwork) => void
}) {
  // Offer a chain only when USDT is enabled AND that specific network has an
  // address configured — sending to a chain we can't receive on is unrecoverable.
  const configured =
    settings.methods.usdtCrypto && deriveUsdtWallets(settings).some((w) => w.network === network)

  return (
    <button
      type="button"
      onClick={() => onSelect(network)}
      disabled={disabled || !configured}
      aria-describedby={configured ? undefined : `usdt-${network}-unavailable`}
      className={cn(
        'group flex min-h-[92px] flex-col items-start gap-2 rounded-xl border border-asm-line bg-white p-3 text-left',
        'transition-[border-color,box-shadow,transform] duration-200',
        'hover:-translate-y-0.5 hover:border-asm-blue/40 hover:shadow-[0_6px_18px_-8px_rgba(11,79,216,0.35)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-45'
      )}
    >
      <span className="flex size-9 items-center justify-center rounded-lg bg-asm-green-tint">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-asm-blue" aria-hidden />
        ) : (
          <TetherIcon className="size-5 text-asm-greenInk" />
        )}
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-[13px] font-bold leading-tight text-asm-navy">USDT · {network}</span>
        <span
          id={configured ? undefined : `usdt-${network}-unavailable`}
          className="text-[11px] leading-tight text-asm-muted"
        >
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
