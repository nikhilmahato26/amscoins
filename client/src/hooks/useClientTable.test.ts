import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useClientTable, type SortOption } from './useClientTable'

interface Row {
  id: string
  name: string
  amount: number
}

const rows: Row[] = [
  { id: 'a', name: 'Alice', amount: 300 },
  { id: 'b', name: 'Bob', amount: 100 },
  { id: 'c', name: 'Carol', amount: 500 },
  { id: 'd', name: 'Dave', amount: 200 },
  { id: 'e', name: 'Eve', amount: 400 },
]

const sortOptions: SortOption<Row>[] = [
  { label: 'Amount ↑', value: 'amount', compare: (a, b) => a.amount - b.amount },
  { label: 'Amount ↓', value: '-amount', compare: (a, b) => b.amount - a.amount },
]

describe('useClientTable', () => {
  it('filters rows by the searchable fields, case-insensitively', () => {
    const { result } = renderHook(() => useClientTable({ rows, searchable: (r) => [r.name] }))
    act(() => result.current.setQ('bo'))
    expect(result.current.total).toBe(1)
    expect(result.current.pageRows.map((r) => r.id)).toEqual(['b'])
  })

  it('sorts rows by the selected sort option', () => {
    const { result } = renderHook(() => useClientTable({ rows, sortOptions, initialSort: '-amount' }))
    expect(result.current.pageRows.map((r) => r.amount)).toEqual([500, 400, 300, 200, 100])
    act(() => result.current.setSort('amount'))
    expect(result.current.pageRows.map((r) => r.amount)).toEqual([100, 200, 300, 400, 500])
  })

  it('slices rows into pages and reports page count', () => {
    const { result } = renderHook(() => useClientTable({ rows, initialPageSize: 2 }))
    expect(result.current.pageCount).toBe(3)
    expect(result.current.pageRows.map((r) => r.id)).toEqual(['a', 'b'])
    act(() => result.current.setPage(2))
    expect(result.current.pageRows.map((r) => r.id)).toEqual(['c', 'd'])
    act(() => result.current.setPage(3))
    expect(result.current.pageRows.map((r) => r.id)).toEqual(['e'])
  })

  it('resets to the first page when the query changes', () => {
    const { result } = renderHook(() => useClientTable({ rows, searchable: (r) => [r.name], initialPageSize: 2 }))
    act(() => result.current.setPage(3))
    expect(result.current.page).toBe(3)
    act(() => result.current.setQ('a'))
    expect(result.current.page).toBe(1)
  })

  it('clamps the page when the filtered set shrinks', () => {
    const { result } = renderHook(() => useClientTable({ rows, searchable: (r) => [r.name], initialPageSize: 2 }))
    act(() => result.current.setPage(3))
    // Narrow to a single match — only one page remains, page should clamp.
    act(() => result.current.setQ('alice'))
    expect(result.current.page).toBe(1)
    expect(result.current.pageRows.map((r) => r.id)).toEqual(['a'])
  })
})
