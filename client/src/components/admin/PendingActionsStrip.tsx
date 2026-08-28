import { Link } from 'react-router'
import { ArrowRight, TrendingUp, ArrowUpFromLine, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PendingItem {
  count: number
  label: string
  sublabel: string
  to: string
  icon: React.ElementType
  tone: 'amber' | 'violet' | 'blue'
}

const TONE_CLASSES = {
  amber:  'border-l-amber-400  bg-amber-50  text-amber-700',
  violet: 'border-l-violet-400 bg-violet-50 text-violet-700',
  blue:   'border-l-asm-blue   bg-asm-blue-tint text-asm-blue',
} as const

function PendingChip({ count, label, sublabel, to, icon: Icon, tone }: PendingItem) {
  if (count === 0) return null
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-1 items-center gap-3 rounded-xl border border-asm-line border-l-4 p-4',
        'transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
        TONE_CLASSES[tone]
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={1.75} aria-hidden />
      <div className="min-w-0 flex-1">
        <div className="text-[22px] font-extrabold leading-none">{count}</div>
        <div className="mt-0.5 text-[12px] font-semibold">{label}</div>
        <div className="text-[11px] opacity-70">{sublabel}</div>
      </div>
      <ArrowRight className="size-4 shrink-0 opacity-60" strokeWidth={2} aria-hidden />
    </Link>
  )
}

export function PendingActionsStrip({
  pendingInvestments,
  pendingWithdrawals,
  openTickets = 0,
}: {
  pendingInvestments: number
  pendingWithdrawals: number
  openTickets?: number
}) {
  const hasAny = pendingInvestments > 0 || pendingWithdrawals > 0 || openTickets > 0
  if (!hasAny) return null

  return (
    <section aria-label="Pending actions" className="flex flex-col gap-3 sm:flex-row">
      <PendingChip
        count={pendingInvestments}
        label="Pending Investments"
        sublabel="Awaiting approval"
        to="/admin/investments?status=pending"
        icon={TrendingUp}
        tone="amber"
      />
      <PendingChip
        count={pendingWithdrawals}
        label="Pending Withdrawals"
        sublabel="Awaiting payout"
        to="/admin/withdrawals?status=pending"
        icon={ArrowUpFromLine}
        tone="violet"
      />
      {openTickets > 0 && (
        <PendingChip
          count={openTickets}
          label="Open Tickets"
          sublabel="Support requests"
          to="/admin/support"
          icon={LifeBuoy}
          tone="blue"
        />
      )}
    </section>
  )
}
