const TIER_ORDER = ['silver', 'gold', 'diamond']

// Referral counts that unlock each tier. Silver is the default (0 referrals).
const TIER_UNLOCK = { silver: 0, gold: 21, diamond: 52 }

function tierForCount(count) {
  if (count >= TIER_UNLOCK.diamond) return 'diamond'
  if (count >= TIER_UNLOCK.gold) return 'gold'
  return 'silver'
}

// TDS (tax deducted at source) percentage applied to withdrawals, per tier.
// Higher tiers are rewarded with a lower deduction; diamond pays none.
const TDS_PCT_BY_TIER = { silver: 5, gold: 3, diamond: 0 }

function tdsPctForTier(tier) {
  return TDS_PCT_BY_TIER[tier] ?? TDS_PCT_BY_TIER.silver
}

const planRank = (key) => TIER_ORDER.indexOf(key)
const tierRank = (tier) => TIER_ORDER.indexOf(tier)
const canAccessPlan = (userTier, planKey) => tierRank(userTier) >= planRank(planKey)

module.exports = {
  TIER_ORDER,
  TIER_UNLOCK,
  tierForCount,
  TDS_PCT_BY_TIER,
  tdsPctForTier,
  planRank,
  tierRank,
  canAccessPlan,
}
