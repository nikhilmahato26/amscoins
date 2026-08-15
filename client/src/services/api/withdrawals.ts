import { apiFetch } from '@/lib/api'

export interface Withdrawal {
  _id: string
  gross: number // paise
  tds: number // paise
  net: number // paise
  upiId: string
  status: 'pending' | 'completed' | 'rejected'
  createdAt: string
}

export const createWithdrawal = (input: { amount: number; upiId: string }) =>
  apiFetch<Withdrawal>('/withdrawals', { method: 'POST', body: input })

export const getWithdrawals = () => apiFetch<Withdrawal[]>('/withdrawals')
