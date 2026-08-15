import { apiFetch } from '@/lib/api'
import type { Role, Tier } from '@/types'
import type { Investment } from './investments'
import type { Withdrawal } from './withdrawals'

export interface AdminStats {
  users: number
  pendingDeposits: number
  pendingWithdrawals: number
  totals: { invested: number; walletLiability: number }
}

export interface PopulatedRef {
  _id: string
  name: string
  email: string
}

export type AdminInvestment = Omit<Investment, 'planKey'> & {
  planKey: Tier
  user: PopulatedRef
}

export type AdminWithdrawal = Withdrawal & { user: PopulatedRef }

export interface AdminUser {
  _id: string
  name: string
  email: string
  role: Role
  status: 'active' | 'frozen'
  tier: Tier
  referralCount: number
  createdAt: string
}

export const adminStats = () => apiFetch<AdminStats>('/admin/stats')

export const adminInvestments = (status = 'pending') =>
  apiFetch<AdminInvestment[]>(`/admin/investments?status=${status}`)
export const approveInvestment = (id: string) =>
  apiFetch<Investment>(`/admin/investments/${id}/approve`, { method: 'POST' })
export const rejectInvestment = (id: string, note?: string) =>
  apiFetch<Investment>(`/admin/investments/${id}/reject`, { method: 'POST', body: { note } })

export const adminWithdrawals = (status = 'pending') =>
  apiFetch<AdminWithdrawal[]>(`/admin/withdrawals?status=${status}`)
export const completeWithdrawal = (id: string, note?: string) =>
  apiFetch<Withdrawal>(`/admin/withdrawals/${id}/complete`, { method: 'POST', body: { note } })
export const rejectWithdrawal = (id: string, note?: string) =>
  apiFetch<Withdrawal>(`/admin/withdrawals/${id}/reject`, { method: 'POST', body: { note } })

export const adminUsers = () => apiFetch<AdminUser[]>('/admin/users')
export const freezeUser = (id: string) => apiFetch<AdminUser>(`/admin/users/${id}/freeze`, { method: 'POST' })
export const unfreezeUser = (id: string) => apiFetch<AdminUser>(`/admin/users/${id}/unfreeze`, { method: 'POST' })
export const adjustWallet = (userId: string, input: { amount: number; direction: 'credit' | 'debit'; note?: string }) =>
  apiFetch<{ balance: number }>(`/admin/wallets/${userId}/adjust`, { method: 'POST', body: input })
