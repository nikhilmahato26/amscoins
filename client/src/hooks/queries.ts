import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlans } from '@/services/api/plans'
import { getWallet } from '@/services/api/wallet'
import { getReferral } from '@/services/api/referral'
import { getDashboard } from '@/services/api/dashboard'
import { getInvestment, getInvestments, getDepositGate, requestBreak } from '@/services/api/investments'
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
  approvePayout,
  rejectPayout,
  deleteInvestment,
  approveInstallment,
  rejectInstallment,
  approveBreak,
  rejectBreak,
  type RejectReturnBody,
  type PayoutRejectBody,
  type InstallmentRejectBody,
  type AdminInvestmentParams,
  type AdminUsersParams,
  adminWithdrawals,
  completeWithdrawal,
  rejectWithdrawal,
  retryWithdrawal,
  bulkApproveWithdrawals,
  bulkApproveInvestments,
  bulkRejectInvestments,
  bulkApproveReturns,
  bulkRejectReturns,
  adminUsers,
  adminUserDetail,
  freezeUser,
  unfreezeUser,
  adjustWallet,
  getInvestmentStats,
  adminActivity,
  type ActivityEvent,
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
// Poll the deposit gate while it is blocking, so the page unlocks on its own
// once the admin approves (pending → cooldown) or the cooldown elapses.
export const useDepositGate = () =>
  useQuery({
    queryKey: ['deposit-gate'],
    queryFn: getDepositGate,
    refetchInterval: (query) =>
      query.state.data && query.state.data.status !== 'open' ? 15_000 : false,
  })
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
// #3 — act on a running investment from the user's profile.
export const useApprovePayout = () =>
  useAdminMutation((id: string) => approvePayout(id), [['admin', 'user'], ['admin', 'users'], ['admin', 'investments'], ['admin', 'stats']])
export const useRejectPayout = () =>
  useAdminMutation((id: string, body: PayoutRejectBody) => rejectPayout(id, body), [['admin', 'user'], ['admin', 'users'], ['admin', 'investments'], ['admin', 'stats']])
export const useDeleteInvestment = () =>
  useAdminMutation((id: string) => deleteInvestment(id), [['admin', 'user'], ['admin', 'users'], ['admin', 'investments'], ['admin', 'stats']])
export const useCompleteWithdrawal = () =>
  useAdminMutation((id: string, note?: string) => completeWithdrawal(id, note), [['admin', 'withdrawals'], ['admin', 'stats']])
export const useRejectWithdrawal = () =>
  useAdminMutation((id: string, note?: string) => rejectWithdrawal(id, note), [['admin', 'withdrawals'], ['admin', 'stats']])
export function useRetryWithdrawal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => retryWithdrawal(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'withdrawals'] }),
  })
}
export const useFreezeUser = () => useAdminMutation((id: string) => freezeUser(id), [['admin', 'users']])
export const useUnfreezeUser = () => useAdminMutation((id: string) => unfreezeUser(id), [['admin', 'users']])
export const useAdjustWallet = () =>
  useAdminMutation(
    (userId: string, input: { amount: number; direction: 'credit' | 'debit'; note?: string }) => adjustWallet(userId, input),
    [['admin', 'users'], ['admin', 'stats']],
  )
export const useResolveSupport = () =>
  useAdminMutation((id: string, adminNote?: string) => resolveSupport(id, adminNote), [['admin', 'support']])

export const useApproveInstallment = () =>
  useAdminMutation(
    (id: string, day: number) => approveInstallment(id, day),
    [['admin', 'investments'], ['admin', 'stats']]
  )

export const useRejectInstallment = () =>
  useAdminMutation(
    (id: string, day: number, body: InstallmentRejectBody) => rejectInstallment(id, day, body),
    [['admin', 'investments'], ['admin', 'stats']]
  )

export const useApproveBreak = () =>
  useAdminMutation((id: string) => approveBreak(id), [['admin', 'investments'], ['admin', 'stats']])

export const useRejectBreak = () =>
  useAdminMutation((id: string) => rejectBreak(id), [['admin', 'investments'], ['admin', 'stats']])

export function useRequestBreak() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestBreak(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  })
}

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

export function useBulkApproveInvestments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkApproveInvestments(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'investments'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useBulkRejectInvestments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, note }: { ids: string[]; note?: string }) => bulkRejectInvestments(ids, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'investments'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useBulkApproveReturns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => bulkApproveReturns(ids),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'investments'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useBulkRejectReturns() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, reason }: { ids: string[]; reason?: string }) => bulkRejectReturns(ids, reason, 0),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'investments'] })
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

export type { ActivityEvent }

export function useAdminActivity() {
  return useQuery({
    queryKey: ['admin', 'activity'],
    queryFn: adminActivity,
    staleTime: 30_000,       // treat as fresh for 30 s
    refetchInterval: 60_000, // auto-refresh every minute
  })
}
