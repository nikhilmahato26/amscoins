import { apiFetch } from '@/lib/api'
import type { Tier } from '@/types'

export interface ReferralOverview {
  referralCode: string
  link: string
  count: number
  tier: Tier
  nextTier: Tier | null
  nextTierAt: number | null
  referrals: { name: string; joinedAt: string; credited: boolean }[]
}

export const getReferral = () => apiFetch<ReferralOverview>('/referral')
