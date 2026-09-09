import { apiFetch } from '@/lib/api'

export type CoinRange = '1h' | '24h' | '7d'

export interface CoinPoint {
  /** ISO timestamp */
  t: string
  /** price in paise */
  p: number
}

export interface CoinIndex {
  range: CoinRange
  /** current price in paise */
  current: number
  changePct: number
  high24h: number
  low24h: number
  investorCount: number
  series: CoinPoint[]
}

export const getCoinIndex = (range: CoinRange) =>
  apiFetch<CoinIndex>(`/coin/index?range=${range}`)
