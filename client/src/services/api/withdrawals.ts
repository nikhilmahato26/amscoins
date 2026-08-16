import { apiFetch } from '@/lib/api'

export interface Withdrawal {
  _id: string
  gross: number // paise
  tds: number // paise
  net: number // paise
  method?: 'upi' | 'bank'
  upiId?: string
  accountName?: string
  accountNumber?: string
  ifsc?: string
  status: 'pending' | 'completed' | 'rejected'
  createdAt: string
}

/**
 * A withdrawal destination: a saved payout method id, an inline UPI id, or
 * inline bank details. The server infers the method from which fields are set.
 */
export interface WithdrawalInput {
  amount: number
  payoutMethodId?: string
  upiId?: string
  accountName?: string
  accountNumber?: string
  ifsc?: string
}

export const createWithdrawal = (input: WithdrawalInput) =>
  apiFetch<Withdrawal>('/withdrawals', { method: 'POST', body: input })

export const getWithdrawals = () => apiFetch<Withdrawal[]>('/withdrawals')
