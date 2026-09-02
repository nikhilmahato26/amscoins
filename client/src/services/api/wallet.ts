import { apiFetch } from '@/lib/api'

export interface LedgerTxn {
  _id: string
  user: string
  type: 'deposit' | 'withdrawal' | 'refund' | 'adjustment' | 'return' | 'referral_bonus'
  direction: 'credit' | 'debit'
  amount: number // paise
  status: 'pending' | 'settled' | 'rejected'
  note: string
  actor: 'user' | 'admin' | 'system'
  createdAt: string
}

export const getWallet = () =>
  apiFetch<{ balance: number; transactions: LedgerTxn[] }>('/wallet')
