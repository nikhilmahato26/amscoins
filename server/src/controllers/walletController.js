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
  // Users only see completed money movements. In-flight or voided withdrawal
  // activity (debit held while pending, or reversed on rejection) is kept out
  // of their history until the withdrawal is actually done — a product choice.
  // (Admins still see everything via the admin user view.)
  const transactions = await Transaction.find({ user: req.user._id, status: 'settled' })
    .sort('-createdAt')
    .limit(20)
  // tdsExemptPaise lets the withdraw screen preview the same TDS the server
  // will actually charge — ASM Coin money is withdrawn tax-free, so a preview
  // computed from the tier rate alone would over-state the deduction.
  const result = { balance: w.balance, tdsExemptPaise: w.tdsExemptPaise || 0, transactions }

  await cacheSet(cacheKey, JSON.stringify(result), 10)
  res.json(result)
})

module.exports = { summary }
