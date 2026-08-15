import { Users, ArrowDownToLine, ArrowUpFromLine, TrendingUp, Wallet } from 'lucide-react'
import { useAdminStats } from '@/hooks/queries'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  icon: React.ElementType
  iconClass: string
  iconBgClass: string
}

function StatCard({ label, value, icon: Icon, iconClass, iconBgClass }: StatCardProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
      <span className={cn('flex size-9 items-center justify-center rounded-lg', iconBgClass)}>
        <Icon className={cn('size-4.5 size-[18px]', iconClass)} strokeWidth={1.75} aria-hidden />
      </span>
      <div>
        <p className="font-mono text-[22px] font-bold tabular-nums leading-none text-asm-navy">
          {value}
        </p>
        <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
          {label}
        </p>
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
    <div className="flex flex-col gap-6 p-8">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-asm-navy">Dashboard</h1>
        <p className="mt-0.5 text-[13px] text-asm-muted">Platform overview at a glance.</p>
      </div>

      {/* Stat cards */}
      <section aria-label="Platform statistics" aria-live="polite">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : isError || !data ? (
          <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-5 py-4 text-[13px] text-asm-red">
            Failed to load statistics. Please refresh.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
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
          </div>
        )}
      </section>

      {/* Wallet liability */}
      {data && !isLoading && (
        <section aria-label="Wallet liability">
          <div className="flex items-center gap-4 rounded-xl border border-asm-line bg-white p-5 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
            <span className="flex size-9 items-center justify-center rounded-lg bg-asm-tint">
              <Wallet className="size-[18px] text-asm-navy" strokeWidth={1.75} aria-hidden />
            </span>
            <div>
              <p className="font-mono text-[18px] font-bold tabular-nums text-asm-navy">
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
