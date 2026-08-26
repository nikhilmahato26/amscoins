import { useParams, useLocation, Link } from 'react-router'
import { ArrowRight, Clock, ExternalLink, CheckCircle2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { useInvestment } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AppShell } from '@/components/app/AppShell'
import { SuccessBurst } from '@/components/app/SuccessBurst'
import { WhatsAppIcon, TelegramIcon } from '@/components/app/icons'

const TIER_LABEL: Record<string, string> = {
  silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: typeof Clock }> = {
    pending:   { label: 'Awaiting Approval', cls: 'bg-amber-50 text-amber-700 border-amber-200',              icon: Clock        },
    active:    { label: 'Active',            cls: 'bg-asm-green-tint text-asm-greenInk border-[#1FA855]/25', icon: CheckCircle2 },
    completed: { label: 'Completed',         cls: 'bg-asm-green-tint text-asm-greenInk border-[#1FA855]/25', icon: CheckCircle2 },
    rejected:  { label: 'Rejected',          cls: 'bg-red-50 text-red-700 border-red-200',                   icon: Clock        },
  }
  const { label, cls, icon: Icon } = map[status] ?? { label: status, cls: 'bg-asm-tint text-asm-body border-asm-line', icon: Clock }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.06em]', cls)}>
      <Icon className="size-3" strokeWidth={2.5} aria-hidden />
      {label}
    </span>
  )
}

export function DepositConfirmationPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const state = location.state as { whatsappLink?: string; telegramLink?: string } | null

  const { data: investment, isLoading, isError } = useInvestment(id!)

  if (isLoading) {
    return (
      <AppShell backTo="/app" contentClassName="px-5">
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-asm-blue border-t-transparent" role="status" aria-label="Loading" />
        </div>
      </AppShell>
    )
  }

  if (isError || !investment) {
    return (
      <AppShell backTo="/app" contentClassName="px-5">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-[15px] font-semibold text-asm-red">Investment not found.</p>
          <Link to="/app" className="text-[13px] text-asm-blue underline-offset-2 hover:underline">
            Go home
          </Link>
        </div>
      </AppShell>
    )
  }

  const termDays = investment.maturesAt && investment.startAt
    ? Math.round((new Date(investment.maturesAt).getTime() - new Date(investment.startAt).getTime()) / 86_400_000)
    : null

  const whatsappLink = state?.whatsappLink
  const telegramLink = state?.telegramLink

  return (
    <AppShell backTo="/app" contentClassName="px-5">
      <div className="mx-auto max-w-lg py-6 sm:py-10">
        {/* Success header */}
        <motion.div
          className="text-center"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09 } } }}
        >
          <SuccessBurst className="size-16" />
          <motion.h1
            variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } }}
            className="mt-4 text-[22px] font-extrabold tracking-tight text-asm-navy"
          >
            Deposit Submitted!
          </motion.h1>
          <motion.p
            variants={{ hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 200, damping: 22 } } }}
            className="mt-1.5 text-[13px] text-asm-muted"
          >
            Your investment request is pending admin approval.
          </motion.p>
          <motion.div
            variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
            className="mt-3 flex justify-center"
          >
            <StatusPill status={investment.status} />
          </motion.div>
        </motion.div>

        {/* Reference code */}
        <div className="mt-6 rounded-2xl border-2 border-asm-blue/20 bg-asm-blue-tint px-4 py-5 text-center">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.12em] text-asm-muted">Reference Code</p>
          <p className="mt-1.5 font-mono text-[22px] font-black tracking-[0.06em] text-asm-blue">
            {investment.referenceCode}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-asm-body">
            Include this code with your payment — it is how we match the transfer to your account.
          </p>
        </div>

        {/* Investment summary */}
        <div className="mt-4 rounded-2xl border border-asm-line bg-white shadow-[0_4px_20px_-8px_rgba(16,42,92,0.12)]">
          <div className="border-b border-asm-line px-4 py-3">
            <p className="text-[11px] font-extrabold uppercase tracking-[0.07em] text-asm-muted">Investment Summary</p>
          </div>
          <dl className="divide-y divide-asm-line">
            {[
              { label: 'Plan', value: TIER_LABEL[investment.planKey] ?? investment.planKey },
              { label: 'Amount', value: inr(investment.amount) },
              { label: 'Expected Return', value: inr(investment.expectedReturn) },
              ...(termDays ? [{ label: 'Term', value: `${termDays} day${termDays !== 1 ? 's' : ''}` }] : []),
              { label: 'Return Rate', value: `${investment.returnPct}%` },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <dt className="text-[13px] text-asm-muted">{label}</dt>
                <dd className="text-[13px] font-semibold text-asm-navy">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Send proof section */}
        {(whatsappLink || telegramLink) && (
          <div className="mt-4 flex flex-col gap-3 rounded-2xl border-2 border-[#1FA855]/25 bg-[#E7F8EE] p-4">
            <h3 className="text-[13px] font-extrabold leading-tight text-asm-navy">Now send the screenshot</h3>
            <p className="text-[12px] leading-relaxed text-asm-body">
              Your deposit stays pending until an admin verifies the payment.
            </p>
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
                  'bg-[#1FA855] text-base font-bold text-white',
                  'shadow-[0_4px_20px_-4px_rgba(31,168,85,0.5)] transition-opacity hover:opacity-90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA855] focus-visible:ring-offset-2',
                )}
              >
                <WhatsAppIcon className="size-5" />
                Send screenshot on WhatsApp
                <ExternalLink className="size-4 opacity-70" aria-hidden />
              </a>
            )}
            {telegramLink && (
              <a
                href={telegramLink}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex h-14 w-full items-center justify-center gap-2 rounded-2xl',
                  'bg-[#0088cc] text-base font-bold text-white',
                  'shadow-[0_4px_20px_-4px_rgba(0,136,204,0.5)] transition-opacity hover:opacity-90',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0088cc] focus-visible:ring-offset-2',
                )}
              >
                <TelegramIcon className="size-5" />
                Send screenshot on Telegram
                <ExternalLink className="size-4 opacity-70" aria-hidden />
              </a>
            )}
          </div>
        )}

        {/* Track status CTA */}
        <Link
          to="/app/dashboard"
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[14px] font-bold',
            'bg-asm-navy text-white transition-opacity hover:opacity-90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-navy focus-visible:ring-offset-2',
          )}
        >
          Track Status
          <ArrowRight className="size-4" />
        </Link>

        <p className="mt-4 text-center text-[11px] text-asm-muted">
          This page auto-refreshes every 30 seconds while your investment is pending.
        </p>
      </div>
    </AppShell>
  )
}
