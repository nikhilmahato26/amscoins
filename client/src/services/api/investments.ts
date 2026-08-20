import { apiFetch } from '@/lib/api'
import type { Tier } from '@/types'

export interface Investment {
  _id: string
  planKey: Tier
  amount: number // paise
  returnPct: number
  expectedReturn: number // paise
  referenceCode: string
  status: 'pending' | 'active' | 'matured' | 'returned' | 'rejected' | 'deleted'
  returnedAt?: string
  creditedAmount?: number
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

// Called when the user taps "I've paid" on the pay screen — sends the deposit
// confirmation email and returns the support links for the confirmation page.
export const notifyPayment = (id: string) =>
  apiFetch<{ investment: Investment; telegramLink: string; whatsappLink: string }>(`/investments/${id}/notify`, { method: 'POST' })

export const getInvestments = () => apiFetch<Investment[]>('/investments')

export const getInvestment = (id: string) => apiFetch<Investment>(`/investments/${id}`)

// NOTE: the admin investment/return API lives in `./admin.ts` (the canonical
// admin API module the admin pages consume via `@/hooks/queries`). It is not
// duplicated here.
