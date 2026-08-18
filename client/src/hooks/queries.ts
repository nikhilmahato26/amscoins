import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlans } from '@/services/api/plans'
import { getWallet } from '@/services/api/wallet'
import { getReferral } from '@/services/api/referral'
import { getDashboard } from '@/services/api/dashboard'
import { getInvestment, getInvestments } from '@/services/api/investments'
import { getWithdrawals, createWithdrawal, type WithdrawalInput } from '@/services/api/withdrawals'
import { getLeaderboard, type LeaderboardPeriod } from '@/services/api/leaderboard'
import {
  createSupportTicket,
  getMySupportTickets,
  adminSupport,
  resolveSupport,
} from '@/services/api/support'
import { getSettings, updateSettings, type SettingsUpdate } from '@/services/api/settings'
import {
  adminStats,
  adminInvestments,
  approveInvestment,
  rejectInvestment,
  approveReturn,
  rejectReturn,
  type RejectReturnBody,
  type AdminInvestmentParams,
  type AdminUsersParams,
  adminWithdrawals,
  completeWithdrawal,
  rejectWithdrawal,
  bulkApproveWithdrawals,
  adminUsers,
  adminUserDetail,
  freezeUser,
  unfreezeUser,
  adjustWallet,
  getInvestmentStats,
} from '@/services/api/admin'

// ── User queries ──
export const usePlans = () => useQuery({ queryKey: ['plans'], queryFn: getPlans })
export const useWallet = () => useQuery({ queryKey: ['wallet'], queryFn: getWallet })
export const useReferral = () => useQuery({ queryKey: ['referral'], queryFn: getReferral })
export const useDashboard = () => useQuery({ queryKey: ['dashboard'], queryFn: getDashboard })
export const useInvestments = () => useQuery({ queryKey: ['investments'], queryFn: getInvestments })
export function useInvestment(id: string) {
  return useQuery({
    queryKey: ['investment', id],
    queryFn: () => getInvestment(id),
    refetchInterval: (query) =>
      query.state.data?.status === 'pending' ? 30_000 : false,
    enabled: !!id,
  })
}
export const useWithdrawals = () => useQuery({ queryKey: ['withdrawals'], queryFn: getWithdrawals })
export const useCreateWithdrawal = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: WithdrawalInput) => createWithdrawal(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['withdrawals'] })
      void qc.invalidateQueries({ queryKey: ['wallet'] })
    },
  })
}
export const useLeaderboard = (period: LeaderboardPeriod) =>
  useQuery({ queryKey: ['leaderboard', period], queryFn: () => getLeaderboard(period) })

export const useMySupportTickets = () =>
  useQuery({ queryKey: ['support', 'mine'], queryFn: getMySupportTickets })
export const useCreateSupportTicket = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { subject: string; message: string }) => createSupportTicket(input),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['support', 'mine'] }) },
  })
}

export const useSettings = () =>
  useQuery({ queryKey: ['settings'], queryFn: getSettings })

export const useUpdateSettings = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: SettingsUpdate) => updateSettings(input),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['settings'] }) },
  })
}

// ── Admin queries ──
export const useAdminStats = () => useQuery({ queryKey: ['admin', 'stats'], queryFn: adminStats })
export const useAdminInvestments = (params: AdminInvestmentParams | string = 'pending') =>
  useQuery({
    queryKey: ['admin', 'investments', typeof params === 'string' ? { status: params } : params],
    queryFn: () => adminInvestments(params),
  })
export const useAdminWithdrawals = (status = 'pending') =>
  useQuery({ queryKey: ['admin', 'withdrawals', status], queryFn: () => adminWithdrawals(status) })
export function useAdminUsers(params: AdminUsersParams | string = '') {
  return useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: () => adminUsers(params),
  })
}
export const useAdminUserDetail = (id: string) =>
  useQuery({ queryKey: ['admin', 'user', id], queryFn: () => adminUserDetail(id), enabled: !!id })
export const useAdminSupport = (status = 'open') =>
  useQuery({ queryKey: ['admin', 'support', status], queryFn: () => adminSupport(status) })

// ── Admin mutations (invalidate the lists + stats they affect) ──
function useAdminMutation<TArgs extends unknown[], TData>(
  fn: (...args: TArgs) => Promise<TData>,
  keys: string[][],
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: TArgs) => fn(...args),
    onSuccess: () => keys.forEach((key) => qc.invalidateQueries({ queryKey: key })),
  })
}

export const useApproveInvestment = () =>
  useAdminMutation((id: string) => approveInvestment(id), [['admin', 'investments'], ['admin', 'stats']])
export const useRejectInvestment = () =>
  useAdminMutation((id: string, note?: string) => rejectInvestment(id, note), [['admin', 'investments'], ['admin', 'stats']])
export const useApproveReturn = () =>
  useAdminMutation((id: string) => approveReturn(id), [['admin', 'investments'], ['admin', 'stats']])
export const useRejectReturn = () =>
  useAdminMutation((id: string, body: RejectReturnBody) => rejectReturn(id, body), [['admin', 'investments'], ['admin', 'stats']])
export const useCompleteWithdrawal = () =>
  useAdminMutation((id: string, note?: string) => completeWithdrawal(id, note), [['admin', 'withdrawals'], ['admin', 'stats']])
export const useRejectWithdrawal = () =>
  useAdminMutation((id: string, note?: string) => rejectWithdrawal(id, note), [['admin', 'withdrawals'], ['admin', 'stats']])
export const useFreezeUser = () => useAdminMutation((id: string) => freezeUser(id), [['admin', 'users']])
export const useUnfreezeUser = () => useAdminMutation((id: string) => unfreezeUser(id), [['admin', 'users']])
export const useAdjustWallet = () =>
  useAdminMutation(
    (userId: string, input: { amount: number; direction: 'credit' | 'debit'; note?: string }) => adjustWallet(userId, input),
    [['admin', 'users'], ['admin', 'stats']],
  )
export const useResolveSupport = () =>
  useAdminMutation((id: string, adminNote?: string) => resolveSupport(id, adminNote), [['admin', 'support']])

export function useBulkApproveWithdrawals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkApproveWithdrawals(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useInvestmentStats() {
  return useQuery({
    queryKey: ['admin', 'investment-stats'],
    queryFn: getInvestmentStats,
    refetchInterval: 30_000,
  })
}
