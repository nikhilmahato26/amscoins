import type { AdminInvestment } from '@/services/api/admin'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { Pagination } from '@/components/admin/Pagination'
import { useClientTable } from '@/hooks/useClientTable'
import { inr } from '@/lib/format'
import { formatInvestId, IdChip } from '@/lib/ids'
import { StatusBadge } from './StatusBadge'
import { fmtDuration } from './helpers'

interface TabDataProps {
  data: AdminInvestment[] | undefined
  isLoading: boolean
  isError: boolean
}

export function HistoryTab({ data, isLoading, isError }: TabDataProps) {
  const rows = data ?? []
  const table = useClientTable({ rows })

  const columns: Column<AdminInvestment>[] = [
    {
      key: 'user',
      header: 'User',
      render: (inv) => (
        <>
          <p className="font-medium text-asm-navy">{inv.user.name}</p>
          <p className="text-[11px] text-asm-muted">{inv.user.email}</p>
        </>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (inv) => (
        <span className="inline-flex items-center rounded-md bg-asm-blue-tint px-2 py-0.5 text-[11px] font-semibold capitalize text-asm-blue">
          {inv.planKey}
        </span>
      ),
    },
    { key: 'principal', header: 'Principal', align: 'right', className: 'font-mono tabular-nums text-asm-navy', render: (inv) => inr(inv.amount) },
    {
      key: 'credited',
      header: 'Credited',
      align: 'right',
      className: 'font-mono tabular-nums text-asm-navy',
      render: (inv) => (inv.creditedAmount != null ? inr(inv.creditedAmount) : inr(inv.amount + (inv.expectedReturn ?? 0))),
    },
    {
      key: 'reference',
      header: 'Reference',
      className: 'font-mono text-[11px] text-asm-body',
      render: (inv) => <IdChip label={formatInvestId(inv.referenceCode)} />,
    },
    {
      key: 'duration',
      header: 'Duration',
      className: 'text-[12px] text-asm-body',
      render: (inv) => fmtDuration(inv.startAt ?? inv.createdAt, inv.maturesAt ?? inv.createdAt),
    },
    { key: 'status', header: 'Final status', render: (inv) => <StatusBadge status={inv.status} /> },
  ]

  return (
    <>
      <DataTable
        columns={columns}
        rows={table.pageRows}
        getRowKey={(inv) => inv._id}
        isLoading={isLoading}
        isError={isError}
        errorMessage="Failed to load history. Please refresh."
        minWidth={820}
        empty={<EmptyState title="No completed investments" description="Returned and rejected investments will appear here." />}
      />

      <Pagination
        page={table.page}
        pageCount={table.pageCount}
        total={table.total}
        pageSize={table.pageSize}
        onPageChange={table.setPage}
        onPageSizeChange={table.setPageSize}
      />
    </>
  )
}
