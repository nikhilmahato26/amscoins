import { apiFetch } from '@/lib/api'
import type { PlanKey } from '@/types'

export interface Plan {
  key: PlanKey
  name: string
  returnPct: number
  minInvest: number // paise
  maxInvest: number // paise
  unlockReferrals: number
  durationHours: number
  unlocked: boolean
}

export const getPlans = () => apiFetch<Plan[]>('/plans')
