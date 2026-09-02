import type { Tier } from '@/types'

/**
 * Single client-side source of truth for tier economics. Mirrors the server:
 *  - unlock counts  → server/src/services/tierService.js (TIER_UNLOCK)
 *  - TDS %          → server/src/services/tierService.js (TDS_PCT_BY_TIER)
 *  - return %       → server/src/seed/seedPlans.js (returnPct)
 * Keep these in sync with the backend when the commercial terms change.
 */

/** Referral count required to unlock each tier (silver is the default). */
export const TIER_UNLOCK: Record<Tier, number> = {
  silver: 0,
  gold: 21,
  diamond: 52,
}

/** TDS (tax deducted at source) percentage applied to withdrawals, per tier. */
export const TIER_TDS_PCT: Record<Tier, number> = {
  silver: 5,
  gold: 3,
  diamond: 0,
}

/** Investment return percentage per tier (24h term). */
export const TIER_RETURN_PCT: Record<Tier, number> = {
  silver: 25,
  gold: 35,
  diamond: 40,
}

/** Ordered low→high so we can find the tiers above a user's current one. */
export const TIER_ORDER: Tier[] = ['silver', 'gold', 'diamond']

export const tierLabel = (tier: Tier) => tier.charAt(0).toUpperCase() + tier.slice(1)

/** English ordinal for a positive integer: 21 → "21st", 52 → "52nd", 11 → "11th". */
export function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`
}

/** TDS % for a tier, defaulting to silver for unknown values. */
export const tdsPctForTier = (tier: Tier | undefined) => TIER_TDS_PCT[tier ?? 'silver'] ?? TIER_TDS_PCT.silver

/**
 * Upgrade incentives shown on the Withdraw page: for every tier ranked above
 * the user's current tier, how many more referrals are needed and what the
 * TDS / return become there. Returns [] when the user is already at the top.
 */
export interface TierUpgradeHint {
  tier: Tier
  label: string
  remaining: number
  tdsPct: number
  returnPct: number
}

export function upgradeHints(currentTier: Tier, referralCount: number): TierUpgradeHint[] {
  const currentRank = TIER_ORDER.indexOf(currentTier)
  return TIER_ORDER.filter((_, rank) => rank > currentRank).map((tier) => ({
    tier,
    label: tierLabel(tier),
    remaining: Math.max(TIER_UNLOCK[tier] - referralCount, 0),
    tdsPct: TIER_TDS_PCT[tier],
    returnPct: TIER_RETURN_PCT[tier],
  }))
}
