import { apiFetch } from '@/lib/api'
import type { Tier } from '@/types'

export interface Dashboard {
  balance: number // paise
  tier: Tier
  referralCount: number
  totals: { invested: number; expectedReturn: number; activeCount: number }
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
