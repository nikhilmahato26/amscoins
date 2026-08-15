const asyncHandler = require('../middleware/asyncHandler')
const Plan = require('../models/Plan')
const { canAccessPlan } = require('../services/tierService')
const { cacheGet, cacheSet } = require('../config/redis')

const list = asyncHandler(async (req, res) => {
  let plans
  const cached = await cacheGet('cache:plans')
  if (cached) {
    try {
      plans = JSON.parse(cached)
    } catch {
      plans = null
    }
  }

  if (!plans) {
    plans = await Plan.find({ active: true }).sort('minInvest').lean()
    await cacheSet('cache:plans', JSON.stringify(plans), 300)
  }

  res.json(plans.map((p) => ({ ...p, unlocked: canAccessPlan(req.user.tier, p.key) })))
})

module.exports = { list }
