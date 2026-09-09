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

// Plans that anyone can invest in regardless of tier or referral count.
// ASM Coin is deliberately ungated — that is its entire pitch. Without this,
// an unknown plan key would fall through planRank's indexOf (-1) and become
// accessible by accident; this makes the exemption explicit instead.
const UNGATED_PLANS = new Set(['asmcoin'])

const canAccessPlan = (userTier, planKey) => {
  if (UNGATED_PLANS.has(planKey)) return true
  const rank = planRank(planKey)
  // An unrecognised key ranks -1, which every tier would out-rank. Deny it
  // outright rather than granting access to a plan nobody has vetted.
  if (rank === -1) return false
  return tierRank(userTier) >= rank
}

module.exports = {
  TIER_ORDER,
  TIER_UNLOCK,
  tierForCount,
  TDS_PCT_BY_TIER,
  tdsPctForTier,
  planRank,
  tierRank,
  UNGATED_PLANS,
  canAccessPlan,
}
