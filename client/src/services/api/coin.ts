import { apiFetch } from '@/lib/api'

export type CoinRange = '1h' | '24h' | '7d'

/**
 * One OHLC candle — a bucket of several underlying price ticks, not a single
 * point. See server coinIndexService#bucketOHLC: open/high/low/close across
 * the whole bucket, so the wick reflects real intra-bucket movement.
 */
export interface CoinCandle {
  /** ISO timestamp of the candle's closing tick */
  t: string
  /** open, in paise */
  o: number
  /** high, in paise */
  h: number
  /** low, in paise */
  l: number
  /** close, in paise */
  c: number
}

export interface CoinIndex {
  range: CoinRange
  /** current price in paise */
  current: number
  changePct: number
  high24h: number
  low24h: number
  investorCount: number
  series: CoinCandle[]
}

export const getCoinIndex = (range: CoinRange) =>
  apiFetch<CoinIndex>(`/coin/index?range=${range}`)
