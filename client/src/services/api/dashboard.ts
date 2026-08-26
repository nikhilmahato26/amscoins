import { apiFetch } from '@/lib/api'
import type { Tier } from '@/types'

export interface Dashboard {
  balance: number // paise
  tier: Tier
  referralCount: number
  totals: { invested: number; expectedReturn: number; activeCount: number }
  todayInvested: number // paise — approved investments from the last 2 days
  allTimeInvested: number // paise — all-time approved investments
  activeInvestments: {
    id: string
    planKey: Tier
    amount: number
    expectedReturn: number
    startAt?: string
    maturesAt?: string
  }[]
}

export const getDashboard = () => apiFetch<Dashboard>('/dashboard')
