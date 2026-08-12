import type { Coin } from '../types'

export const MOCK_COINS: Coin[] = [
  {
    id: 'c_btc',
    symbol: 'BTC / USDT',
    name: 'Bitcoin',
    price: 5836245.60,
    change24h: 2.35,
    spark: [45, 50, 48, 55, 60, 58, 65]
  },
  {
    id: 'c_gold',
    symbol: 'GOLD / XAU',
    name: 'Gold',
    price: 6795.35,
    change24h: 1.82,
    spark: [60, 62, 61, 65, 64, 68, 70]
  },
  {
    id: 'c_silver',
    symbol: 'SILVER / XAG',
    name: 'Silver',
    price: 89.42,
    change24h: 0.76,
    spark: [30, 32, 31, 35, 34, 38, 40]
  },
  {
    id: 'c_oil',
    symbol: 'CRUDE OIL / USOIL',
    name: 'Crude Oil',
    price: 6350.70,
    change24h: 1.21,
    spark: [50, 52, 51, 55, 54, 58, 60]
  },
  {
    id: 'c_usd',
    symbol: 'USD / INR',
    name: 'US Dollar',
    price: 83.32,
    change24h: 0.18,
    spark: [40, 42, 41, 45, 44, 48, 50]
  }
]
