import { useInvestmentStats } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: React.ReactNode
  urgency?: 'red' | 'yellow' | 'green' | 'neutral'
}

function StatCard({ label, value, urgency = 'neutral' }: StatCardProps) {
  const accent = {
    red:     'border-l-4 border-l-asm-red bg-asm-tint',
    yellow:  'border-l-4 border-l-asm-muted bg-asm-tint',
    green:   'border-l-4 border-l-asm-green bg-asm-tint',
    neutral: 'bg-white',
  }[urgency]

  return (
    <div
      className={cn(
        'rounded-xl border border-asm-line px-4 py-3.5',
        'shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]',
        accent,
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-asm-muted">{label}</p>
      <p className="mt-1.5 text-[22px] font-bold tabular-nums leading-none text-asm-navy">{value}</p>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="rounded-xl border border-asm-line bg-white px-4 py-3.5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
      <div className="h-2.5 w-24 animate-pulse rounded bg-asm-line" />
      <div className="mt-3 h-7 w-12 animate-pulse rounded bg-asm-line" />
    </div>
  )
}

export function InvestmentStatsBar() {
  const { data, isLoading } = useInvestmentStats()

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    )
  }

  if (!data) return null

  const pendingUrgency = data.pendingApprovals > 5 ? 'red' : data.pendingApprovals > 0 ? 'yellow' : 'green'
  const aboutUrgency: StatCardProps['urgency'] = data.aboutToComplete > 0 ? 'red' : 'neutral'

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" role="region" aria-label="Investment statistics">
      <StatCard
        label="Pending Approvals"
        value={data.pendingApprovals}
        urgency={pendingUrgency}
      />
      <StatCard
        label="Returns Awaiting"
        value={data.returnsAwaiting}
        urgency={data.returnsAwaiting > 0 ? 'yellow' : 'neutral'}
      />
      <StatCard
        label="About to Complete"
        value={data.aboutToComplete}
        urgency={aboutUrgency}
      />
      <StatCard
        label="Capital Under Mgmt"
        value={inr(data.capitalUnderManagement)}
        urgency="neutral"
      />
      <StatCard
        label="Approval Rate"
        value={data.approvalRate != null ? `${data.approvalRate.toFixed(1)}%` : '—'}
        urgency={
          data.approvalRate == null
            ? 'neutral'
            : data.approvalRate >= 80
              ? 'green'
              : 'yellow'
        }
      />
      <StatCard
        label="Revenue This Month"
        value={inr(data.revenueThisMonth)}
        urgency="neutral"
      />
    </div>
  )
}
