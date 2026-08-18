import { useParams, useLocation, Link } from 'react-router'
import { CheckCircle2, MessageCircle, Send, ArrowRight, Clock } from 'lucide-react'
import { useInvestment } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { formatInvestId } from '@/lib/ids'
import { cn } from '@/lib/utils'

const TIER_LABEL: Record<string, string> = {
  bronze: 'Bronze', silver: 'Silver', gold: 'Gold', platinum: 'Platinum',
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'Awaiting Approval', cls: 'bg-yellow-100 text-yellow-800' },
    active: { label: 'Active', cls: 'bg-green-100 text-asm-green' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-asm-red' },
  }
  const { label, cls } = map[status] ?? { label: status, cls: 'bg-asm-tint text-asm-body' }
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold', cls)}>
      <Clock className="size-3" />
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-asm-blue border-t-transparent" role="status" aria-label="Loading" />
      </div>
    )
  }

  if (isError || !investment) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-[15px] font-semibold text-asm-red">Investment not found.</p>
        <Link to="/app" className="text-[13px] text-asm-blue underline-offset-2 hover:underline">
          Go home
        </Link>
      </div>
    )
  }

  const refCode = formatInvestId(investment.referenceCode)
  const termDays = investment.maturesAt && investment.startAt
    ? Math.round((new Date(investment.maturesAt).getTime() - new Date(investment.startAt).getTime()) / 86_400_000)
    : null

  const whatsappLink = state?.whatsappLink
  const telegramLink = state?.telegramLink

  return (
    <div className="mx-auto max-w-lg px-4 py-8 sm:py-12">
      {/* Success header */}
      <div className="text-center">
        <CheckCircle2 className="mx-auto size-14 text-asm-green" strokeWidth={1.5} />
        <h1 className="mt-4 text-[22px] font-bold tracking-tight text-asm-navy">
          Deposit Submitted!
        </h1>
        <p className="mt-1.5 text-[13px] text-asm-muted">
          Your investment request is pending admin approval.
        </p>
        <div className="mt-3 flex justify-center">
          <StatusPill status={investment.status} />
        </div>
      </div>

      {/* Reference code */}
      <div className="mt-6 rounded-xl border border-asm-line bg-asm-tint px-4 py-4 text-center">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-asm-muted">Reference Code</p>
        <p className="mt-1 font-mono text-[20px] font-bold tracking-wider text-asm-blue">{refCode}</p>
        <p className="mt-1 text-[11px] text-asm-muted">Keep this for support queries</p>
      </div>

      {/* Investment summary */}
      <div className="mt-4 rounded-xl border border-asm-line bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <div className="border-b border-asm-line px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">Investment Summary</p>
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
      <div className="mt-5 rounded-xl border border-asm-line bg-white p-4 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
        <p className="text-[13px] font-semibold text-asm-navy">Send Payment Proof</p>
        <p className="mt-1 text-[12px] text-asm-muted">
          Please send your payment screenshot along with your reference code to the admin.
        </p>
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          {whatsappLink && (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold',
                'bg-[#25D366] text-white hover:bg-[#1ebe5d] transition-colors',
              )}
            >
              <MessageCircle className="size-4" />
              Send via WhatsApp
            </a>
          )}
          {telegramLink && (
            <a
              href={telegramLink}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-semibold',
                'bg-[#229ED9] text-white hover:bg-[#1a8fc2] transition-colors',
              )}
            >
              <Send className="size-4" />
              Send via Telegram
            </a>
          )}
        </div>
      </div>

      {/* Track status CTA */}
      <Link
        to="/app/dashboard"
        className={cn(
          'mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[14px] font-semibold',
          'bg-asm-navy text-white hover:bg-asm-blue-dark transition-colors',
        )}
      >
        Track Status
        <ArrowRight className="size-4" />
      </Link>

      <p className="mt-4 text-center text-[11px] text-asm-muted">
        This page auto-refreshes every 30 seconds while your investment is pending.
      </p>
    </div>
  )
}
