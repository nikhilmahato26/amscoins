import { apiFetch } from '@/lib/api'
import type { Tier } from '@/types'

export interface Investment {
  _id: string
  planKey: Tier
  amount: number // paise
  returnPct: number
  expectedReturn: number // paise
  referenceCode: string
  status: 'pending' | 'active' | 'rejected'
  startAt?: string
  maturesAt?: string
  createdAt: string
}

export interface CreateInvestmentInput {
  planKey: Tier
  amount: number
  referralCode?: string
}

export const createInvestment = (input: CreateInvestmentInput) =>
  apiFetch<{ investment: Investment; telegramLink: string; whatsappLink: string }>('/investments', { method: 'POST', body: input })

export const getInvestments = () => apiFetch<Investment[]>('/investments')

// NOTE: the admin investment/return API lives in `./admin.ts` (the canonical
// admin API module the admin pages consume via `@/hooks/queries`). It is not
// duplicated here.
