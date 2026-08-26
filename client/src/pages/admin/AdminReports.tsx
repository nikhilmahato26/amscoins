import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { getReport } from '@/services/api/admin'
import type { ReportType } from '@/services/api/admin'
import { inr } from '@/lib/format'
import { cn } from '@/lib/utils'

/* ── Types ── */
type MonthlyRow    = { month: string; count: number; totalInvested: number; totalReturned: number }
type ConversionData = { pending: number; active: number; returned: number; rejected: number; total: number; conversionRate: number }
type RoiData        = { expectedReturn: number; actualReturn: number; roiPct: number }
type PerfRow        = { planKey: string; count: number; totalInvested: number; avgReturn: number }

/* ── Design tokens ── */
const BLUE    = '#0B4FD8'
const GREEN   = '#1FA855'
const AMBER   = '#D97706'
const RED     = '#DC2626'
const NAVY    = '#102A5C'
const MUTED   = '#8B9BB4'

const PIE_COLORS: Record<string, string> = {
  returned:  GREEN,
  active:    BLUE,
  pending:   AMBER,
  rejected:  RED,
}

const PLAN_COLORS: Record<string, string> = {
  silver:  MUTED,
  gold:    AMBER,
  diamond: BLUE,
}

/* ── Report tabs ── */
const REPORT_TABS: { key: ReportType; label: string }[] = [
  { key: 'monthly',    label: 'Monthly Summary'  },
  { key: 'conversion', label: 'Conversion Rate'  },
  { key: 'roi',        label: 'ROI'              },
  { key: 'performance',label: 'Plan Performance' },
]

/* ── Tooltip ── */
const inputCls = cn(
  'rounded-lg border border-asm-line bg-white px-3 py-2 text-[13px] text-asm-navy',
  'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1',
)

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: {name:string;value:number;color:string}[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-xl border border-asm-line bg-white px-3 py-2.5 shadow-lg text-[12px]">
      {label && <p className="mb-1.5 font-bold text-asm-navy">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="flex items-center gap-1.5">
          <span className="inline-block size-2 rounded-full" style={{ background: p.color }} />
          <span className="text-asm-muted capitalize">{p.name}:</span>
          <span className="font-semibold text-asm-navy">
            {typeof p.value === 'number' && p.name.toLowerCase().includes('invest') || p.name.toLowerCase().includes('return')
              ? inr(p.value)
              : p.value}
          </span>
        </p>
      ))}
    </div>
  )
}

/* ── Skeleton ── */
function ChartSkeleton() {
  return (
    <div className="flex h-72 items-end gap-2 px-4 pb-4 animate-pulse">
      {[60, 85, 45, 90, 70, 55, 80].map((h, i) => (
        <div key={i} className="flex-1 rounded-t bg-asm-tint" style={{ height: `${h}%` }} />
      ))}
    </div>
  )
}

/* ── Stat card ── */
function StatCard({ label, value, sub, accent = 'blue' }: {
  label: string; value: string; sub?: string; accent?: 'blue' | 'green' | 'amber' | 'red'
}) {
  const colors = {
    blue:  'bg-asm-blue-tint text-asm-blue',
    green: 'bg-asm-green-tint text-asm-greenInk',
    amber: 'bg-amber-50 text-amber-700',
    red:   'bg-red-50 text-red-600',
  }
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
      <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-asm-muted">{label}</span>
      <span className={cn('mt-0.5 inline-flex w-fit rounded-lg px-2 py-0.5 font-mono text-[20px] font-extrabold tabular-nums', colors[accent])}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-asm-body">{sub}</span>}
    </div>
  )
}

/* ── Monthly chart ── */
function MonthlyChart({ data }: { data: MonthlyRow[] }) {
  const chartData = data.map((r) => ({
    month: r.month.replace(/^\d{4}-/, ''),
    'Invested':  r.totalInvested  / 100,
    'Returned':  r.totalReturned  / 100,
    'Deposits':  r.count,
  }))

  const totalInvested  = data.reduce((s, r) => s + r.totalInvested, 0)
  const totalReturned  = data.reduce((s, r) => s + r.totalReturned, 0)
  const totalDeposits  = data.reduce((s, r) => s + r.count, 0)

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Deposits"  value={String(totalDeposits)} accent="blue" />
        <StatCard label="Total Invested"  value={inr(totalInvested)}    accent="amber" />
        <StatCard label="Total Returned"  value={inr(totalReturned)}    accent="green" />
      </div>

      <div className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Volume (₹) by Month</p>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData} barGap={4} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F0F4FF' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Invested" fill={BLUE}  radius={[4,4,0,0]} />
            <Bar dataKey="Returned" fill={GREEN} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Deposit Count by Month</p>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#E8EDF5' }} />
            <Line dataKey="Deposits" stroke={NAVY} strokeWidth={2.5} dot={{ r: 4, fill: NAVY }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Conversion chart ── */
function ConversionChart({ data }: { data: ConversionData }) {
  const pieData = [
    { name: 'Returned',  value: data.returned },
    { name: 'Active',    value: data.active    },
    { name: 'Pending',   value: data.pending   },
    { name: 'Rejected',  value: data.rejected  },
  ].filter((d) => d.value > 0)

  const rate = data.conversionRate
  const rateAccent = rate >= 70 ? 'green' : rate >= 40 ? 'amber' : 'red'

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Pending"    value={String(data.pending)}  accent="amber" />
        <StatCard label="Active"     value={String(data.active)}   accent="blue"  />
        <StatCard label="Returned"   value={String(data.returned)} accent="green" />
        <StatCard label="Rejected"   value={String(data.rejected)} accent="red"   />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Status Breakdown</p>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95}
                paddingAngle={3} dataKey="value" nameKey="name"
              >
                {pieData.map((entry) => (
                  <Cell key={entry.name} fill={PIE_COLORS[entry.name.toLowerCase()] ?? MUTED} stroke="none" />
                ))}
              </Pie>
              <Tooltip formatter={(v, name) => [v, name]} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Conversion Rate</p>
          <StatCard label="Approved / Total" value={`${rate}%`} sub={`${data.returned + data.active} of ${data.total} investments reached active or returned`} accent={rateAccent} />

          {/* Progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="h-3 w-full overflow-hidden rounded-full bg-asm-tint">
              <motion.div
                className="h-full rounded-full bg-asm-green"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(rate, 100)}%` }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-asm-muted">
              <span>0%</span><span>100%</span>
            </div>
          </div>

          <div className="mt-auto rounded-xl bg-asm-tint px-3 py-2.5 text-[12px] text-asm-body">
            Total investments tracked: <span className="font-bold text-asm-navy">{data.total}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── ROI chart ── */
function RoiChart({ data }: { data: RoiData }) {
  const pct       = Math.min(data.roiPct, 100)
  const roiAccent = pct >= 80 ? 'green' : pct >= 50 ? 'amber' : 'red'
  const barData   = [
    { name: 'Expected', value: data.expectedReturn / 100 },
    { name: 'Paid Out', value: data.actualReturn   / 100 },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Expected Return"  value={inr(data.expectedReturn)} accent="blue"  />
        <StatCard label="Actual Paid Out"  value={inr(data.actualReturn)}   accent="green" />
        <StatCard label="ROI Fulfillment"  value={`${data.roiPct}%`}        accent={roiAccent} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
          <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Expected vs Paid (₹)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barCategoryGap="40%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F0F4FF' }} />
              <Bar dataKey="value" radius={[6,6,0,0]}>
                <Cell fill={BLUE}  />
                <Cell fill={GREEN} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-5 rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Fulfillment Gauge</p>
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <span className="font-mono text-[48px] font-extrabold tabular-nums text-asm-navy">{data.roiPct}<span className="text-[28px] text-asm-muted">%</span></span>
            <div className="w-full">
              <div className="h-4 w-full overflow-hidden rounded-full bg-asm-tint">
                <motion.div
                  className={cn('h-full rounded-full', pct >= 80 ? 'bg-asm-green' : pct >= 50 ? 'bg-amber-500' : 'bg-asm-red')}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[10px] text-asm-muted">
                <span>0%</span><span>100%</span>
              </div>
            </div>
            <p className="text-center text-[12px] leading-relaxed text-asm-body">
              {inr(data.actualReturn)} returned of {inr(data.expectedReturn)} expected
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Plan performance chart ── */
function PerformanceChart({ data }: { data: PerfRow[] }) {
  const chartData = data.map((r) => ({
    plan:      r.planKey,
    Invested:  r.totalInvested / 100,
    Count:     r.count,
    'Avg %':   r.avgReturn,
  }))

  return (
    <div className="flex flex-col gap-6">
      <div className={cn('grid gap-3', data.length === 1 ? 'grid-cols-1' : data.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {data.map((row) => (
          <StatCard
            key={row.planKey}
            label={`${row.planKey.charAt(0).toUpperCase() + row.planKey.slice(1)} Plan`}
            value={inr(row.totalInvested)}
            sub={`${row.count} deposits · avg ${row.avgReturn}% return`}
            accent={row.planKey === 'gold' ? 'amber' : row.planKey === 'diamond' ? 'blue' : 'blue'}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Total Invested by Plan (₹)</p>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} barCategoryGap="40%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" vertical={false} />
            <XAxis dataKey="plan" tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} className="capitalize" />
            <YAxis tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F0F4FF' }} />
            <Bar dataKey="Invested" radius={[6,6,0,0]}>
              {chartData.map((entry) => (
                <Cell key={entry.plan} fill={PLAN_COLORS[entry.plan] ?? BLUE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="rounded-2xl border border-asm-line bg-white p-5 shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.08em] text-asm-muted">Deposit Count &amp; Avg Return % by Plan</p>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} barGap={6} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#E8EDF5" vertical={false} />
            <XAxis dataKey="plan" tick={{ fontSize: 12, fill: MUTED }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: MUTED }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F0F4FF' }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            <Bar yAxisId="left"  dataKey="Count"  fill={NAVY}  radius={[4,4,0,0]} />
            <Bar yAxisId="right" dataKey="Avg %"  fill={AMBER} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

/* ── Main page ── */
export function AdminReports() {
  const [activeType, setActiveType] = useState<ReportType>('monthly')
  const [from, setFrom] = useState('')
  const [to,   setTo]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'reports', activeType, from, to],
    queryFn:  () => getReport(activeType, { from: from || undefined, to: to || undefined }),
  })

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <div>
        <h1 className="text-[22px] xl:text-[26px] font-bold tracking-tight text-asm-navy">Reports</h1>
        <p className="mt-0.5 text-[13px] xl:text-[14px] text-asm-muted">Investment analytics and visualisations.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {REPORT_TABS.map((tab) => (
          <button key={tab.key} type="button" onClick={() => setActiveType(tab.key)}
            className={cn('rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-colors',
              activeType === tab.key
                ? 'bg-asm-blue text-white shadow-[0_2px_8px_-2px_rgba(11,79,216,0.4)]'
                : 'border border-asm-line text-asm-body hover:bg-asm-tint')}
          >{tab.label}</button>
        ))}
      </div>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)}
          className={inputCls} aria-label="From date" />
        <span className="text-[12px] text-asm-muted">to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)}
          className={inputCls} aria-label="To date" />
        {(from || to) && (
          <button type="button" onClick={() => { setFrom(''); setTo('') }}
            className="text-[12px] text-asm-muted underline-offset-2 hover:underline"
          >Clear</button>
        )}
      </div>

      {/* Chart area */}
      {isLoading ? (
        <div className="rounded-2xl border border-asm-line bg-white shadow-[0_1px_6px_-2px_rgba(16,42,92,0.07)]">
          <ChartSkeleton />
        </div>
      ) : data ? (
        <motion.div key={activeType} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          {activeType === 'monthly'    && Array.isArray(data)    && <MonthlyChart    data={data as MonthlyRow[]} />}
          {activeType === 'conversion' && !Array.isArray(data)   && <ConversionChart data={data as ConversionData} />}
          {activeType === 'roi'        && !Array.isArray(data)   && <RoiChart        data={data as RoiData} />}
          {activeType === 'performance'&& Array.isArray(data)    && <PerformanceChart data={data as PerfRow[]} />}
        </motion.div>
      ) : null}
    </div>
  )
}
