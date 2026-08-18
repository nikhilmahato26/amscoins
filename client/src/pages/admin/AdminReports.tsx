import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getReport } from '@/services/api/admin'
import type { ReportType } from '@/services/api/admin'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: 'monthly', label: 'Monthly Summary' },
  { key: 'conversion', label: 'Conversion Rate' },
  { key: 'roi', label: 'ROI' },
  { key: 'performance', label: 'Plan Performance' },
]

function DateRangePicker({ from, to, onFromChange, onToChange }: {
  from: string; to: string
  onFromChange: (v: string) => void
  onToChange: (v: string) => void
}) {
  const inputCls = cn(
    'rounded-lg border border-asm-line bg-white px-3 py-2 text-[13px] text-asm-navy',
    'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1',
  )
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="date" value={from} onChange={(e) => onFromChange(e.target.value)} className={inputCls} aria-label="From date" />
      <span className="text-asm-muted text-[12px]">to</span>
      <input type="date" value={to} onChange={(e) => onToChange(e.target.value)} className={inputCls} aria-label="To date" />
    </div>
  )
}

export function AdminReports() {
  const [activeType, setActiveType] = useState<ReportType>('monthly')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', activeType, from, to],
    queryFn: () => getReport(activeType, { from: from || undefined, to: to || undefined }),
  })

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-asm-navy">Reports</h1>
        <p className="mt-0.5 text-[13px] text-asm-muted">Investment analytics and exports.</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {REPORT_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveType(tab.key)}
            className={cn(
              'rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-colors',
              activeType === tab.key
                ? 'bg-asm-blue text-white'
                : 'border border-asm-line text-asm-body hover:bg-asm-tint',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} />

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-asm-blue border-t-transparent" role="status" aria-label="Loading report" />
        </div>
      )}

      {!isLoading && data && (
        <div className="overflow-x-auto rounded-xl border border-asm-line bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
          {activeType === 'monthly' && Array.isArray(data) && (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
                  <th className="px-3 py-2.5 text-left">Month</th>
                  <th className="px-3 py-2.5 text-right">Count</th>
                  <th className="px-3 py-2.5 text-right">Total Invested</th>
                  <th className="px-3 py-2.5 text-right">Total Returned</th>
                </tr>
              </thead>
              <tbody>
                {(data as { month: string; count: number; totalInvested: number; totalReturned: number }[]).map((row) => (
                  <tr key={row.month} className="border-b border-asm-line last:border-0">
                    <td className="px-3 py-2.5 font-mono text-asm-navy">{row.month}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-asm-body">{row.count}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-asm-navy">{inr(row.totalInvested)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-asm-navy">{inr(row.totalReturned)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeType === 'conversion' && data && !Array.isArray(data) && (() => {
            const d = data as { pending: number; active: number; returned: number; rejected: number; total: number; conversionRate: number }
            return (
              <dl className="divide-y divide-asm-line">
                {[
                  { label: 'Pending', value: d.pending },
                  { label: 'Active / Matured', value: d.active },
                  { label: 'Returned', value: d.returned },
                  { label: 'Rejected', value: d.rejected },
                  { label: 'Total', value: d.total },
                  { label: 'Conversion Rate', value: `${d.conversionRate}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between px-4 py-3">
                    <dt className="text-[13px] text-asm-muted">{label}</dt>
                    <dd className="text-[13px] font-semibold text-asm-navy">{value}</dd>
                  </div>
                ))}
              </dl>
            )
          })()}

          {activeType === 'roi' && data && !Array.isArray(data) && (() => {
            const d = data as { expectedReturn: number; actualReturn: number; roiPct: number }
            return (
              <dl className="divide-y divide-asm-line">
                {[
                  { label: 'Expected Return', value: inr(d.expectedReturn) },
                  { label: 'Actual Return Paid', value: inr(d.actualReturn) },
                  { label: 'ROI Fulfillment', value: `${d.roiPct}%` },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between px-4 py-3">
                    <dt className="text-[13px] text-asm-muted">{label}</dt>
                    <dd className="text-[13px] font-semibold text-asm-navy">{value}</dd>
                  </div>
                ))}
              </dl>
            )
          })()}

          {activeType === 'performance' && Array.isArray(data) && (
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
                  <th className="px-3 py-2.5 text-left">Plan</th>
                  <th className="px-3 py-2.5 text-right">Count</th>
                  <th className="px-3 py-2.5 text-right">Total Invested</th>
                  <th className="px-3 py-2.5 text-right">Avg Return %</th>
                </tr>
              </thead>
              <tbody>
                {(data as { planKey: string; count: number; totalInvested: number; avgReturn: number }[]).map((row) => (
                  <tr key={row.planKey} className="border-b border-asm-line last:border-0 capitalize">
                    <td className="px-3 py-2.5 font-medium text-asm-navy">{row.planKey}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-asm-body">{row.count}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-asm-navy">{inr(row.totalInvested)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-asm-navy">{row.avgReturn}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
