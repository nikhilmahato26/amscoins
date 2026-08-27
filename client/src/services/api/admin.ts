import { apiFetch } from '@/lib/api'
import type { PayoutMethod, Role, Tier, Transaction } from '@/types'
import type { Investment } from './investments'
import type { Withdrawal } from './withdrawals'

export interface AdminStats {
  users: number
  pendingDeposits: number
  pendingWithdrawals: number
  totals: { invested: number; walletLiability: number; todayInvested: number }
}

export interface PopulatedRef {
  _id: string
  name: string
  email: string
}

export type AdminInvestment = Omit<Investment, 'planKey' | 'status'> & {
  planKey: Tier
  status: 'pending' | 'active' | 'matured' | 'returned' | 'rejected' | 'deleted'
  creditedAmount?: number // paise — set when returned with partial/custom amount
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
  totalInvested: number
  activeInvested: number
  activeCount: number
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
  /** The user's login password, readable for wallet cross-checks. Null when not
   *  yet captured (older accounts fill in on next login) or encryption is off. */
  password: string | null
  balance: number
  investments: Investment[]
  withdrawals: Withdrawal[]
  transactions: Transaction[]
}

export type InvestmentSortKey =
  | 'createdAt' | '-createdAt'
  | 'amount' | '-amount'
  | 'maturesAt' | '-maturesAt'
  | 'tier' | '-tier'

export interface AdminInvestmentParams {
  status?: string
  tier?: string
  amountMin?: number
  amountMax?: number
  dateFrom?: string
  dateTo?: string
  q?: string
  sort?: InvestmentSortKey
}

export interface AdminUsersParams {
  q?: string
  investor?: 'true' | 'false'
  sort?: 'invested' | '-invested'
}

export const adminStats = () => apiFetch<AdminStats>('/admin/stats')

export const adminInvestments = (params: AdminInvestmentParams | string = 'pending') => {
  if (typeof params === 'string') {
    return apiFetch<AdminInvestment[]>(`/admin/investments?status=${params}`)
  }
  const qs = new URLSearchParams()
  if (params.status)       qs.set('status', params.status)
  if (params.tier)         qs.set('tier', params.tier)
  if (params.sort)         qs.set('sort', params.sort)
  if (params.q)            qs.set('q', params.q)
  if (params.dateFrom)     qs.set('dateFrom', params.dateFrom)
  if (params.dateTo)       qs.set('dateTo', params.dateTo)
  if (params.amountMin != null) qs.set('amountMin', String(params.amountMin))
  if (params.amountMax != null) qs.set('amountMax', String(params.amountMax))
  const s = qs.toString()
  return apiFetch<AdminInvestment[]>(`/admin/investments${s ? `?${s}` : ''}`)
}
export const approveInvestment = (id: string) =>
  apiFetch<Investment>(`/admin/investments/${id}/approve`, { method: 'POST' })
export const rejectInvestment = (id: string, note?: string) =>
  apiFetch<Investment>(`/admin/investments/${id}/reject`, { method: 'POST', body: { note } })
export const approveReturn = (id: string) =>
  apiFetch<AdminInvestment>(`/admin/investments/${id}/return/approve`, { method: 'POST' })
export interface RejectReturnBody {
  reason: string
  amount: number // paise
}
export const rejectReturn = (id: string, body: RejectReturnBody) =>
  apiFetch<AdminInvestment>(`/admin/investments/${id}/return/reject`, { method: 'POST', body })

// Act on a running investment straight from a user's profile (#3).
// approve = pay now; reject = credit a custom amount (trace kept); delete = erase
// the whole cycle from the user's side (kept in admin History as 'deleted').
export interface PayoutRejectBody {
  reason?: string
  amount: number // paise credited back to the user (0 = nothing)
}
export const approvePayout = (id: string) =>
  apiFetch<AdminInvestment>(`/admin/investments/${id}/approve-payout`, { method: 'POST' })
export const rejectPayout = (id: string, body: PayoutRejectBody) =>
  apiFetch<AdminInvestment>(`/admin/investments/${id}/reject-payout`, { method: 'POST', body })
export const deleteInvestment = (id: string) =>
  apiFetch<AdminInvestment>(`/admin/investments/${id}`, { method: 'DELETE' })

export const adminWithdrawals = (status = 'pending') =>
  apiFetch<AdminWithdrawal[]>(`/admin/withdrawals?status=${status}`)
export const completeWithdrawal = (id: string, note?: string) =>
  apiFetch<Withdrawal>(`/admin/withdrawals/${id}/complete`, { method: 'POST', body: { note } })
export const rejectWithdrawal = (id: string, note?: string) =>
  apiFetch<Withdrawal>(`/admin/withdrawals/${id}/reject`, { method: 'POST', body: { note } })
export const retryWithdrawal = (id: string) =>
  apiFetch<AdminWithdrawal>(`/admin/withdrawals/${id}/retry`, { method: 'POST' })

export interface BulkApproveResult {
  approved: number
}

export const bulkApproveWithdrawals = (ids: string[]) =>
  apiFetch<BulkApproveResult>('/admin/withdrawals/bulk-approve', { method: 'POST', body: { ids } })

export interface BulkApproveInvestmentsResult {
  approved: number
  failed: number
}

export interface BulkRejectInvestmentsResult {
  rejected: number
  failed: number
}

export const bulkApproveInvestments = (ids: string[]) =>
  apiFetch<BulkApproveInvestmentsResult>('/admin/investments/bulk-approve', { method: 'POST', body: { ids } })

export const bulkRejectInvestments = (ids: string[], note?: string) =>
  apiFetch<BulkRejectInvestmentsResult>('/admin/investments/bulk-reject', { method: 'POST', body: { ids, note } })

export interface BulkApproveReturnsResult {
  approved: number
  failed: number
}

export interface BulkRejectReturnsResult {
  rejected: number
  failed: number
}

export const bulkApproveReturns = (ids: string[]) =>
  apiFetch<BulkApproveReturnsResult>('/admin/investments/bulk-approve-returns', { method: 'POST', body: { ids } })

export const bulkRejectReturns = (ids: string[], reason?: string, amount?: number) =>
  apiFetch<BulkRejectReturnsResult>('/admin/investments/bulk-reject-returns', {
    method: 'POST',
    body: { ids, reason, amount: amount ?? 0 },
  })

export const adminUsers = (params: AdminUsersParams | string = '') => {
  if (typeof params === 'string') {
    return apiFetch<AdminUser[]>(`/admin/users${params ? `?q=${encodeURIComponent(params)}` : ''}`)
  }
  const qs = new URLSearchParams()
  if (params.q)        qs.set('q', params.q)
  if (params.investor) qs.set('investor', params.investor)
  if (params.sort)     qs.set('sort', params.sort)
  const s = qs.toString()
  return apiFetch<AdminUser[]>(`/admin/users${s ? `?${s}` : ''}`)
}
export const adminUserDetail = (id: string) => apiFetch<AdminUserDetail>(`/admin/users/${id}`)
export const freezeUser = (id: string) => apiFetch<AdminUser>(`/admin/users/${id}/freeze`, { method: 'POST' })
export const unfreezeUser = (id: string) => apiFetch<AdminUser>(`/admin/users/${id}/unfreeze`, { method: 'POST' })
export const adjustWallet = (userId: string, input: { amount: number; direction: 'credit' | 'debit'; note?: string }) =>
  apiFetch<{ balance: number }>(`/admin/wallets/${userId}/adjust`, { method: 'POST', body: input })

export interface InvestmentStats {
  pendingApprovals: number
  returnsAwaiting: number
  aboutToComplete: number
  capitalUnderManagement: number
  approvalRate: number | null
  revenueThisMonth: number
}

export const getInvestmentStats = () => apiFetch<InvestmentStats>('/admin/investments/stats')

export type ReportType = 'monthly' | 'conversion' | 'roi' | 'performance'

export interface ReportParams {
  from?: string
  to?: string
}

export const getReport = (type: ReportType, params: ReportParams = {}) => {
  const qs = new URLSearchParams()
  if (params.from) qs.set('from', params.from)
  if (params.to)   qs.set('to', params.to)
  const s = qs.toString()
  return apiFetch<unknown>(`/admin/reports/${type}${s ? `?${s}` : ''}`)
}
