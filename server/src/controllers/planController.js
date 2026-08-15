const asyncHandler = require('../middleware/asyncHandler')
const Plan = require('../models/Plan')
const { canAccessPlan } = require('../services/tierService')

const list = asyncHandler(async (req, res) => {
  const plans = await Plan.find({ active: true }).sort('minInvest').lean()
  res.json(plans.map((p) => ({ ...p, unlocked: canAccessPlan(req.user.tier, p.key) })))
})

module.exports = { list }
