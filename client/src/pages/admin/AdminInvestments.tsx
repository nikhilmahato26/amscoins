import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAdminInvestments, useInvestmentStats } from '@/hooks/queries'
import type { AdminInvestmentParams } from '@/services/api/admin'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { InvestmentStatsBar } from '@/components/admin/InvestmentStatsBar'
import { InvestmentFilters } from '@/components/admin/InvestmentFilters'
import { ExportButton } from '@/components/admin/ExportButton'
import { InvestmentTab } from '@/components/admin/investments/InvestmentTab'
import { ReturnTab } from '@/components/admin/investments/ReturnTab'
import { HistoryTab } from '@/components/admin/investments/HistoryTab'
import { InstallmentsTab } from '@/components/admin/investments/InstallmentsTab'
import { parseUrlFilters, filtersToSearch } from '@/lib/filters'
import { cn } from '@/lib/utils'

type Tab = 'investments' | 'returns' | 'installments' | 'history'

const TABS: { id: Tab; label: string }[] = [
  { id: 'investments', label: 'Investments' },
  { id: 'returns', label: 'Returns' },
  { id: 'installments', label: 'Installments' },
  { id: 'history', label: 'History' },
]

function tabFromSearch(search: string): Tab | null {
  const t = new URLSearchParams(search).get('tab')
  return TABS.some((x) => x.id === t) ? (t as Tab) : null
}

interface PillProps {
  label: string
  count: number
  colorClass: string
}

function StatusPill({ label, count, colorClass }: PillProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold', colorClass)}>
      <span className="tabular-nums">{count}</span>
      <span className="font-normal opacity-80">{label}</span>
    </span>
  )
}

export function AdminInvestments() {
  const location = useLocation()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<Tab>(() => tabFromSearch(location.search) ?? 'investments')
  const [filterParams, setFilterParams] = useState<AdminInvestmentParams>(() => parseUrlFilters(location.search))
  const { data: stats } = useInvestmentStats()

  // Honour ?tab= deep links (e.g. from the notification bell) even when already
  // mounted on this page. Filter edits that drop the param leave the tab as-is.
  useEffect(() => {
    const t = tabFromSearch(location.search)
    if (t) setActiveTab(t)
  }, [location.search])

  function handleFiltersChange(params: AdminInvestmentParams) {
    setFilterParams(params)
    navigate({ search: filtersToSearch(params) }, { replace: true })
  }

  // Pipeline: Investments (pending) → Returns (active + matured) → History
  // (returned/rejected/deleted). An investment leaves the Investments tab the
  // moment it's approved (active). Installments tab fetches active + break_requested
  // and filters client-side.
  const activeStatus =
    activeTab === 'investments' ? 'pending' :
    activeTab === 'returns' ? 'active,matured' :
    activeTab === 'installments' ? 'active,break_requested' :
    'returned,rejected,deleted'

  const { data, isLoading, isError } = useAdminInvestments({
    ...filterParams,
    status: activeStatus,
  })

  // Pipeline summary counts — derived from already-loaded data, no extra API call.
  const pendingCount = activeTab === 'investments' ? (data?.length ?? 0) : (stats?.pendingApprovals ?? 0)
  const activeCount = activeTab === 'returns' ? (data?.filter((d) => d.status === 'active').length ?? 0) : 0
  const maturedCount = activeTab === 'returns' ? (data?.filter((d) => d.status === 'matured').length ?? 0) : 0

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <AdminPageHeader
        title="Investments"
        subtitle="Review pending investments, process matured returns, and view history."
      />

      <InvestmentStatsBar />

      <InvestmentFilters params={filterParams} onChange={handleFiltersChange} />

      <div className="flex items-center justify-between gap-3">
        <div role="tablist" aria-label="Investment sections" className="flex flex-1 gap-1 rounded-xl border border-asm-line bg-asm-tint p-1">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls={`tabpanel-${id}`}
              id={`tab-${id}`}
              type="button"
              onClick={() => setActiveTab(id)}
              className={cn(
                'flex flex-1 items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
                activeTab === id
                  ? 'bg-white text-asm-navy shadow-[0_1px_3px_rgba(16,42,92,0.08)]'
                  : 'text-asm-muted hover:text-asm-body',
              )}
            >
              {label}
              {id === 'investments' && stats && stats.pendingApprovals > 0 && (
                <span className="ml-auto rounded-full bg-asm-red px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {stats.pendingApprovals}
                </span>
              )}
              {id === 'returns' && stats && (stats.returnsAwaiting > 0 || stats.aboutToComplete > 0) && (
                <span
                  className={cn(
                    'ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-bold text-white',
                    stats.aboutToComplete > 0 ? 'bg-asm-red' : 'bg-asm-muted',
                  )}
                >
                  {stats.returnsAwaiting + stats.aboutToComplete}
                </span>
              )}
            </button>
          ))}
        </div>
        <ExportButton investments={data ?? []} filename={`investments-${activeTab}.csv`} />
      </div>

      {/* Pipeline summary strip */}
      {activeTab === 'investments' && (
        <div className="flex flex-wrap gap-2">
          <StatusPill label="pending" count={pendingCount} colorClass="bg-amber-50 text-amber-800" />
        </div>
      )}
      {activeTab === 'returns' && (
        <div className="flex flex-wrap gap-2">
          <StatusPill label="active" count={activeCount} colorClass="bg-asm-blue-tint text-asm-blue" />
          <StatusPill label="matured" count={maturedCount} colorClass="bg-asm-green-tint text-asm-greenInk" />
        </div>
      )}

      <div role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="flex flex-col gap-4">
        {activeTab === 'investments' && <InvestmentTab data={data} isLoading={isLoading} isError={isError} />}
        {activeTab === 'returns' && <ReturnTab data={data} isLoading={isLoading} isError={isError} />}
        {activeTab === 'installments' && <InstallmentsTab data={data} isLoading={isLoading} isError={isError} />}
        {activeTab === 'history' && <HistoryTab data={data} isLoading={isLoading} isError={isError} />}
      </div>
    </div>
  )
}
