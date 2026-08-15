const asyncHandler = require('../middleware/asyncHandler')
const { getOrCreateWallet } = require('../services/walletService')
const Transaction = require('../models/Transaction')
const { cacheGet, cacheSet } = require('../config/redis')

const summary = asyncHandler(async (req, res) => {
  const cacheKey = `cache:wallet:${req.user._id}`
  const cached = await cacheGet(cacheKey)
  if (cached) {
    try {
      return res.json(JSON.parse(cached))
    } catch {
      // fallback
    }
  }

  const w = await getOrCreateWallet(req.user._id)
  const transactions = await Transaction.find({ user: req.user._id }).sort('-createdAt').limit(20)
  const result = { balance: w.balance, transactions }

  await cacheSet(cacheKey, JSON.stringify(result), 10)
  res.json(result)
})

module.exports = { summary }
