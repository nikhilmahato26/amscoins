import { describe, it, expect } from 'vitest'
import { rupeesToPaise, paisaToRupees, parseUrlFilters, filtersToSearch } from './filters'

describe('rupeesToPaise', () => {
  it('converts 100 rupees to 10000 paise', () => {
    expect(rupeesToPaise(100)).toBe(10000)
  })
  it('rounds fractional paise', () => {
    expect(rupeesToPaise(1.005)).toBe(101)
  })
})

describe('paisaToRupees', () => {
  it('converts 10000 paise to 100 rupees', () => {
    expect(paisaToRupees(10000)).toBe(100)
  })
})

describe('parseUrlFilters', () => {
  it('parses q and status from search string', () => {
    const result = parseUrlFilters('?q=invest-ABC&status=pending')
    expect(result.q).toBe('invest-ABC')
    expect(result.status).toBe('pending')
  })
  it('parses amountMin as number', () => {
    const result = parseUrlFilters('?amountMin=5000')
    expect(result.amountMin).toBe(5000)
  })
  it('returns empty object for empty string', () => {
    expect(parseUrlFilters('')).toEqual({})
  })
})

describe('filtersToSearch', () => {
  it('serializes params to query string', () => {
    const qs = filtersToSearch({ q: 'invest-ABC', status: 'active' })
    expect(qs).toContain('q=invest-ABC')
    expect(qs).toContain('status=active')
  })
  it('omits undefined values', () => {
    const qs = filtersToSearch({ q: undefined, status: 'active' })
    expect(qs).not.toContain('q=')
  })
})
