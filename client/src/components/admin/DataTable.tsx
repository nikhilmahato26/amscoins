import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  /** Stable key for the column. */
  key: string
  header: ReactNode
  align?: 'left' | 'right' | 'center'
  /** Extra classes for the body cell. */
  className?: string
  /** Extra classes for the header cell. */
  headerClassName?: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  getRowKey: (row: T) => string
  isLoading?: boolean
  loadingRows?: number
  isError?: boolean
  errorMessage?: string
  /** Shown when there are no rows and not loading/error. */
  empty?: ReactNode
  /** Min table width before horizontal scroll kicks in. */
  minWidth?: number
  /** Called when a row is clicked. Adds cursor-pointer and hover highlight. */
  onRowClick?: (row: T) => void
}

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' } as const

/** Empty-state block for use as DataTable's `empty` prop. */
export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="px-4 py-16 text-center">
      <span className="mx-auto flex size-10 items-center justify-center rounded-full bg-asm-tint">
        <Inbox className="size-5 text-asm-muted" strokeWidth={1.5} aria-hidden />
      </span>
      <p className="mt-3 text-[13px] font-semibold text-asm-navy">{title}</p>
      {description && <p className="mt-1 text-[12px] text-asm-muted">{description}</p>}
    </div>
  )
}

/**
 * Shared column-driven admin table. Renders the standard bordered shell, header
 * from column defs, alternating rows, and consistent loading / error / empty states.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  isLoading = false,
  loadingRows = 5,
  isError = false,
  errorMessage = 'Failed to load. Please refresh.',
  empty,
  minWidth = 700,
  onRowClick,
}: DataTableProps<T>) {
  const colCount = columns.length

  return (
    <div className="overflow-x-auto rounded-xl border border-asm-line bg-white shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
      <table className="w-full border-collapse text-[13px]" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-asm-line bg-asm-tint text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn('px-3 py-2.5', alignClass[col.align ?? 'left'], col.headerClassName)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: loadingRows }).map((_, i) => (
              <tr key={i} className="animate-pulse border-b border-asm-line">
                {columns.map((col) => (
                  <td key={col.key} className="px-3 py-3">
                    <span className="block h-3.5 rounded bg-asm-tint" />
                  </td>
                ))}
              </tr>
            ))
          ) : isError ? (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center text-[13px] text-asm-red" role="alert">
                {errorMessage}
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colCount}>{empty ?? <EmptyState title="No results" />}</td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr
                key={getRowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-b border-asm-line last:border-0',
                  idx % 2 === 0 ? 'bg-white' : 'bg-asm-tint/40',
                  onRowClick && 'cursor-pointer hover:bg-asm-tint/40',
                )}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-3 py-2.5', alignClass[col.align ?? 'left'], col.className)}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
