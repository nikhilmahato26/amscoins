import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Wallet, CalendarDays } from 'lucide-react'
import { useAdminStats } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PendingActionsStrip } from '@/components/admin/PendingActionsStrip'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconClass: string
  iconBgClass: string
  delta?: string
  deltaPositive?: boolean
}

function StatCard({ label, value, icon: Icon, iconClass, iconBgClass, delta, deltaPositive }: StatCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <span className={cn('flex size-10 items-center justify-center rounded-xl', iconBgClass)}>
          <Icon className={cn('size-5', iconClass)} strokeWidth={1.75} aria-hidden />
        </span>
        {delta !== undefined && (
          <span className={cn(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            deltaPositive === true  && 'bg-green-50 text-green-700',
            deltaPositive === false && 'bg-red-50 text-asm-red',
            deltaPositive === undefined && 'bg-asm-tint text-asm-muted',
          )}>
            {delta}
          </span>
        )}
      </div>
      <div>
        <div className="font-jakarta text-[30px] font-extrabold leading-none tracking-tight text-asm-navy xl:text-[34px]">
          {value}
        </div>
        <div className="mt-1 text-[12px] font-semibold text-asm-muted">{label}</div>
      </div>
    </div>
  )
}

function SkeletonCard() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-xl border border-asm-line bg-white p-5">
      <span className="size-9 rounded-lg bg-asm-tint" />
      <div className="flex flex-col gap-2">
        <span className="h-6 w-2/3 rounded bg-asm-tint" />
        <span className="h-3 w-1/2 rounded bg-asm-tint" />
      </div>
    </div>
  )
}

export function AdminDashboard() {
  const { data, isLoading, isError } = useAdminStats()

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] xl:text-[26px] font-bold tracking-tight text-asm-navy">Dashboard</h1>
        <p className="mt-0.5 text-[13px] xl:text-[14px] text-asm-muted">Platform overview at a glance.</p>
      </div>

      {/* Stat cards */}
      <section aria-label="Platform statistics" aria-live="polite">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError || !data ? (
          <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-[13px] text-asm-red">
            Failed to load statistics. Please refresh.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            <StatCard
              label="Total users"
              value={data.users.toLocaleString('en-IN')}
              icon={Users}
              iconClass="text-asm-blue"
              iconBgClass="bg-asm-blue-tint"
            />
            <StatCard
              label="Pending deposits"
              value={data.pendingDeposits.toLocaleString('en-IN')}
              icon={ArrowDownToLine}
              iconClass="text-amber-600"
              iconBgClass="bg-amber-50"
            />
            <StatCard
              label="Pending withdrawals"
              value={data.pendingWithdrawals.toLocaleString('en-IN')}
              icon={ArrowUpFromLine}
              iconClass="text-violet-600"
              iconBgClass="bg-violet-50"
            />
            <StatCard
              label="Total invested"
              value={inr(data.totals.invested)}
              icon={TrendingUp}
              iconClass="text-asm-green"
              iconBgClass="bg-green-50"
            />
            <StatCard
              label="Today invested"
              value={inr(data.totals.todayInvested)}
              icon={CalendarDays}
              iconClass="text-sky-600"
              iconBgClass="bg-sky-50"
            />
          </div>
        )}
      </section>

      {/* Pending actions strip */}
      {data && !isLoading && (
        <PendingActionsStrip
          pendingInvestments={data.pendingDeposits}
          pendingWithdrawals={data.pendingWithdrawals}
        />
      )}

      {/* Wallet liability */}
      {data && !isLoading && (
        <section aria-label="Wallet liability">
          <div className="flex items-center gap-4 rounded-xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
            <span className="flex size-9 items-center justify-center rounded-lg bg-asm-tint">
              <Wallet className="size-[18px] text-asm-navy" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="font-mono text-[18px] xl:text-[22px] font-bold tabular-nums text-asm-navy">
                {inr(data.totals.walletLiability)}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
                Wallet liability
              </p>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
