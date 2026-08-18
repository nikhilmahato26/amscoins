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

// ── Admin API ──────────────────────────────────────────────────────────────

export interface AdminInvestment extends Investment {
  user: { _id: string; name: string; email: string }
}

export const listAdminInvestments = (status: string) =>
  apiFetch<AdminInvestment[]>(`/admin/investments?status=${encodeURIComponent(status)}`)

export const approveInvestment = (id: string) =>
  apiFetch<{ investment: AdminInvestment }>(`/admin/investments/${id}/approve`, { method: 'POST' })

export const rejectInvestment = (id: string) =>
  apiFetch<{ investment: AdminInvestment }>(`/admin/investments/${id}/reject`, { method: 'POST' })

export const approveReturn = (id: string) =>
  apiFetch<{ investment: AdminInvestment }>(`/admin/investments/${id}/return/approve`, { method: 'POST' })

export interface RejectReturnBody {
  reason: string
  amount: number // paise
}

export const rejectReturn = (id: string, body: RejectReturnBody) =>
  apiFetch<{ investment: AdminInvestment }>(`/admin/investments/${id}/return/reject`, { method: 'POST', body })
