import { apiFetch } from '@/lib/api'

export interface LedgerTxn {
  _id: string
  user: string
  type: 'deposit' | 'withdrawal' | 'refund' | 'adjustment'
  direction: 'credit' | 'debit'
  amount: number // paise
  status: 'pending' | 'settled' | 'rejected'
  note: string
  actor: 'user' | 'admin' | 'system'
  createdAt: string
}

export interface WalletSummary {
  balance: number // paise
  /** The slice of `balance` that came from ASM Coin and withdraws TDS-free. */
  tdsExemptPaise: number // paise
  transactions: LedgerTxn[]
}

export const getWallet = () => apiFetch<WalletSummary>('/wallet')
