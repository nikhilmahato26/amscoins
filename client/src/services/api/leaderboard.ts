import { apiFetch } from '@/lib/api'
import type { Tier } from '@/types'

export type LeaderboardPeriod = 'daily' | 'monthly' | 'yearly'

export interface LeaderboardEntry {
  rank: number
  userId: string
  name: string
  tier: Tier
  avatar?: string | null
  totalInvested: number // paise
}

export const getLeaderboard = (period: LeaderboardPeriod) =>
  apiFetch<{ period: LeaderboardPeriod; entries: LeaderboardEntry[] }>(`/leaderboard?period=${period}`)
