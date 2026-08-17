import { motion } from 'framer-motion'
import { AlertCircle, ExternalLink, IndianRupee, Info } from 'lucide-react'
import { Link } from 'react-router'

import { WhatsAppIcon } from '@/components/app/icons'
import {
  deriveTelegram,
  whatsappUrl,
} from '@/config/payment'
import type { PublicSettings } from '@/services/api/settings'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Investment } from '@/services/api/investments'
import {
  CopyButton,
  PackageSummary,
  QrCode,
  Steps,
  TelegramCta,
  container,
  fadeUp,
  useCopy,
} from './PaymentMethodPage'

export function InrQrScreen({
  settings,
  investment,
  planName,
  amountPaise,
  telegramFallback,
  whatsappFallback,
}: {
  settings: PublicSettings
  investment: Investment
  planName: string
  amountPaise: number
  telegramFallback: string
  whatsappFallback: string
}) {
  const { copied, copy } = useCopy()
  const tg = deriveTelegram(settings)
  const telegramHref = tg.url || telegramFallback

  const message = [
    `ASM Coins deposit — INR (UPI)`,
    `Plan: ${planName}`,
    `Amount: ${inr(amountPaise)}`,
    `Reference: ${investment.referenceCode}`,
  ].join('\n')

  // Prefer the configured number (prefills the deposit message); fall back to
  // the support WhatsApp link so the button mirrors the Telegram one.
  const whatsappHref = whatsappUrl(settings, message) || whatsappFallback

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="flex flex-col gap-5">
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
            <span className="font-mono text-[26px] font-black leading-none tracking-[0.06em] text-asm-blue">
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

      <motion.div variants={fadeUp}>
        <PackageSummary planName={planName} amountPaise={amountPaise} />
      </motion.div>

      <motion.section
        variants={fadeUp}
        aria-label="INR UPI QR"
        className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-asm-blue-tint">
            <IndianRupee className="size-5 text-asm-blue" strokeWidth={2.5} aria-hidden />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h3 className="text-[15px] font-extrabold leading-tight text-asm-navy">Scan &amp; pay in INR</h3>
            <p className="text-[12px] leading-relaxed text-asm-body">
              Open any UPI app, scan the code and pay {inr(amountPaise)}.
            </p>
          </div>
        </div>

        {settings.inrQrUrl ? (
          <QrCode src={settings.inrQrUrl} alt="INR UPI payment QR code" />
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-amber-600" aria-hidden />
            <p className="text-[11px] leading-relaxed text-amber-800">
              The payment QR is not set up yet — please contact support with your reference code.
            </p>
          </div>
        )}

        <Steps
          items={[
            'Scan the QR above in any UPI app (GPay, PhonePe, Paytm…).',
            `Pay exactly ${inr(amountPaise)}.`,
            'Screenshot the successful payment.',
            'Send the screenshot with your reference code below.',
          ]}
        />
      </motion.section>

      {/* Send proof of payment */}
      <motion.section
        variants={fadeUp}
        className="flex flex-col gap-3 rounded-2xl border-2 border-[#1FA855]/25 bg-[#E7F8EE] p-4"
      >
        <h3 className="text-[13px] font-extrabold leading-tight text-asm-navy">Now send the screenshot</h3>
        <p className="text-[12px] leading-relaxed text-asm-body">
          Your deposit stays pending until an admin verifies the payment.
        </p>
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
        {telegramHref && <TelegramCta href={telegramHref} label="Send screenshot on Telegram" />}
      </motion.section>

      <motion.section
        variants={fadeUp}
        className="flex items-start gap-3 rounded-2xl border border-asm-line bg-white p-4"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-asm-blue" aria-hidden />
        <p className="text-[12px] leading-relaxed text-asm-body">
          <span className="font-bold text-asm-navy">Status: </span>
          <span className="font-bold uppercase tracking-[0.06em] text-amber-700">Pending</span>. Track it
          from{' '}
          <Link to="/app/dashboard" className="font-bold text-asm-blue underline">
            your dashboard
          </Link>
          .
        </p>
      </motion.section>
    </motion.div>
  )
}
