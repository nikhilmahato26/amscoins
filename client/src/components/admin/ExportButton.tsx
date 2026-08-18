import { Download } from 'lucide-react'
import type { AdminInvestment } from '@/services/api/admin'
import { formatInvestId } from '@/lib/ids'
import { cn } from '@/lib/utils'

function toCsvRow(cells: string[]): string {
  return cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map(toCsvRow).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

interface ExportButtonProps {
  investments: AdminInvestment[]
  filename?: string
  className?: string
}

export function ExportButton({ investments, filename = 'investments.csv', className }: ExportButtonProps) {
  function handleExport() {
    const header = ['Reference', 'User', 'Email', 'Plan', 'Amount', 'Expected Return', 'Status', 'Created At']
    const rows = investments.map((inv) => [
      formatInvestId(inv.referenceCode),
      inv.user.name,
      inv.user.email,
      inv.planKey,
      String(inv.amount / 100),
      String(inv.expectedReturn / 100),
      inv.status,
      new Date(inv.createdAt).toISOString().split('T')[0],
    ])
    downloadCsv(filename, [header, ...rows])
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={investments.length === 0}
      className={cn(
        'flex items-center gap-2 rounded-lg border border-asm-line px-3.5 py-2',
        'text-[12px] font-semibold text-asm-body hover:bg-asm-tint transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      <Download className="size-4" strokeWidth={1.5} />
      Export CSV
    </button>
  )
}
