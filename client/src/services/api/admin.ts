import { apiFetch } from '@/lib/api'
import type { PayoutMethod, Role, Tier, Transaction } from '@/types'
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
  publicId: string | null
  name: string
  email: string
  role: Role
  status: 'active' | 'frozen'
  tier: Tier
  referralCount: number
  createdAt: string
}

/** Full user document (minus passwordHash) returned by the detail endpoint. */
export interface AdminUserFull extends AdminUser {
  phone: string | null
  avatar: string | null
  referralCode: string
  payoutMethods: Array<PayoutMethod & { _id: string }>
}

export interface AdminUserDetail {
  user: AdminUserFull
  balance: number
  investments: Investment[]
  withdrawals: Withdrawal[]
  transactions: Transaction[]
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

export const adminUsers = (q = '') =>
  apiFetch<AdminUser[]>(`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ''}`)
export const adminUserDetail = (id: string) => apiFetch<AdminUserDetail>(`/admin/users/${id}`)
export const freezeUser = (id: string) => apiFetch<AdminUser>(`/admin/users/${id}/freeze`, { method: 'POST' })
export const unfreezeUser = (id: string) => apiFetch<AdminUser>(`/admin/users/${id}/unfreeze`, { method: 'POST' })
export const adjustWallet = (userId: string, input: { amount: number; direction: 'credit' | 'debit'; note?: string }) =>
  apiFetch<{ balance: number }>(`/admin/wallets/${userId}/adjust`, { method: 'POST', body: input })
