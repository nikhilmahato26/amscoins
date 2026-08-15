const TIER_ORDER = ['silver', 'gold', 'diamond']

function tierForCount(count) {
  if (count >= 21) return 'diamond'
  if (count >= 11) return 'gold'
  return 'silver'
}

const planRank = (key) => TIER_ORDER.indexOf(key)
const tierRank = (tier) => TIER_ORDER.indexOf(tier)
const canAccessPlan = (userTier, planKey) => tierRank(userTier) >= planRank(planKey)

module.exports = { TIER_ORDER, tierForCount, planRank, tierRank, canAccessPlan }
