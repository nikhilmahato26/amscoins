import { useMemo, useState } from 'react'

export interface SortOption<T> {
  label: string
  value: string
  compare: (a: T, b: T) => number
}

interface UseClientTableOptions<T> {
  rows: T[]
  /** Returns the searchable strings for a row; matched case-insensitively against the query. */
  searchable?: (row: T) => (string | null | undefined)[]
  sortOptions?: SortOption<T>[]
  /** `value` of the initial sort option (defaults to the first option). */
  initialSort?: string
  initialPageSize?: number
}

export interface UseClientTableResult<T> {
  q: string
  setQ: (q: string) => void
  sort: string
  setSort: (sort: string) => void
  page: number
  setPage: (page: number) => void
  pageSize: number
  setPageSize: (size: number) => void
  /** Rows for the current page after search + sort. */
  pageRows: T[]
  /** Count after search (before pagination). */
  total: number
  pageCount: number
}

/**
 * One implementation of client-side search + sort + pagination for admin list
 * pages. Operates over data already fetched in full — no backend paging.
 */
export function useClientTable<T>({
  rows,
  searchable,
  sortOptions,
  initialSort,
  initialPageSize = 25,
}: UseClientTableOptions<T>): UseClientTableResult<T> {
  const [q, setQState] = useState('')
  const [sort, setSortState] = useState(initialSort ?? sortOptions?.[0]?.value ?? '')
  const [pageSize, setPageSizeState] = useState(initialPageSize)
  const [page, setPage] = useState(1)

  /* Any change to the result set or its shape resets to the first page. */
  const setQ = (v: string) => {
    setQState(v)
    setPage(1)
  }
  const setSort = (v: string) => {
    setSortState(v)
    setPage(1)
  }
  const setPageSize = (v: number) => {
    setPageSizeState(v)
    setPage(1)
  }

  const processed = useMemo(() => {
    const query = q.trim().toLowerCase()
    let out = rows
    if (query && searchable) {
      out = out.filter((row) =>
        searchable(row).some((field) => field != null && field.toLowerCase().includes(query)),
      )
    }
    const option = sortOptions?.find((o) => o.value === sort)
    if (option) out = [...out].sort(option.compare)
    return out
  }, [rows, q, sort, searchable, sortOptions])

  const total = processed.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageRows = processed.slice((safePage - 1) * pageSize, safePage * pageSize)

  return {
    q,
    setQ,
    sort,
    setSort,
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    pageRows,
    total,
    pageCount,
  }
}
