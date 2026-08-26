import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminButton } from './AdminButton'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

interface PaginationProps {
  /** Current page, 1-based. */
  page: number
  pageCount: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

/** Client-side pager: range summary, prev/next, and an optional page-size control. */
export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  if (total === 0) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-[12px] text-asm-muted">
      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          <strong className="font-semibold text-asm-navy">
            {from}–{to}
          </strong>{' '}
          of <strong className="font-semibold text-asm-navy">{total}</strong>
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            <span className="sr-only">Rows per page</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className={cn(
                'cursor-pointer rounded-lg border border-asm-line bg-white px-2 py-1 text-[12px] text-asm-navy',
                'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue',
              )}
              aria-label="Rows per page"
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} / page
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="tabular-nums">
          Page {page} / {pageCount}
        </span>
        <AdminButton
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </AdminButton>
        <AdminButton
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
        >
          <ChevronRight className="size-4" aria-hidden />
        </AdminButton>
      </div>
    </div>
  )
}
