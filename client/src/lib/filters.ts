import type { AdminInvestmentParams } from '@/services/api/admin'

export function rupeesToPaise(rupees: number): number {
  return Math.round((rupees + Number.EPSILON) * 100)
}

export function paisaToRupees(paise: number): number {
  return paise / 100
}

export function parseUrlFilters(search: string): AdminInvestmentParams {
  const params = new URLSearchParams(search)
  const result: AdminInvestmentParams = {}
  const q = params.get('q'); if (q) result.q = q
  const status = params.get('status'); if (status) result.status = status
  const tier = params.get('tier'); if (tier) result.tier = tier
  const sort = params.get('sort'); if (sort) result.sort = sort as AdminInvestmentParams['sort']
  const dateFrom = params.get('dateFrom'); if (dateFrom) result.dateFrom = dateFrom
  const dateTo = params.get('dateTo'); if (dateTo) result.dateTo = dateTo
  const amountMin = params.get('amountMin'); if (amountMin) result.amountMin = Number(amountMin)
  const amountMax = params.get('amountMax'); if (amountMax) result.amountMax = Number(amountMax)
  return result
}

export function filtersToSearch(params: AdminInvestmentParams): string {
  const qs = new URLSearchParams()
  if (params.q)            qs.set('q', params.q)
  if (params.status)       qs.set('status', params.status)
  if (params.tier)         qs.set('tier', params.tier)
  if (params.sort)         qs.set('sort', params.sort)
  if (params.dateFrom)     qs.set('dateFrom', params.dateFrom)
  if (params.dateTo)       qs.set('dateTo', params.dateTo)
  if (params.amountMin != null) qs.set('amountMin', String(params.amountMin))
  if (params.amountMax != null) qs.set('amountMax', String(params.amountMax))
  const s = qs.toString()
  return s ? `?${s}` : ''
}
