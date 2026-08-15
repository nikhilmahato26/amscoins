const asyncHandler = require('../middleware/asyncHandler')
const Investment = require('../models/Investment')
const { getOrCreateWallet } = require('../services/walletService')
const { cacheGet, cacheSet } = require('../config/redis')

const summary = asyncHandler(async (req, res) => {
  const u = req.user
  const cacheKey = `cache:dashboard:${u._id}`
  const cached = await cacheGet(cacheKey)
  if (cached) {
    try {
      return res.json(JSON.parse(cached))
    } catch {
      // fallback
    }
  }

  const wallet = await getOrCreateWallet(u._id)
  const active = await Investment.find({ user: u._id, status: 'active' }).sort('-startAt')
  const totals = active.reduce((a, i) => ({
    invested: a.invested + i.amount, expectedReturn: a.expectedReturn + i.expectedReturn, activeCount: a.activeCount + 1,
  }), { invested: 0, expectedReturn: 0, activeCount: 0 })
  const result = {
    balance: wallet.balance, tier: u.tier, referralCount: u.referralCount, totals,
    activeInvestments: active.map((i) => ({ id: i._id, planKey: i.planKey, amount: i.amount,
      expectedReturn: i.expectedReturn, startAt: i.startAt, maturesAt: i.maturesAt })),
  }

  await cacheSet(cacheKey, JSON.stringify(result), 10)
  res.json(result)
})

module.exports = { summary }
