const asyncHandler = require('../middleware/asyncHandler')
const { getOrCreateWallet } = require('../services/walletService')
const Transaction = require('../models/Transaction')

const summary = asyncHandler(async (req, res) => {
  const w = await getOrCreateWallet(req.user._id)
  const transactions = await Transaction.find({ user: req.user._id }).sort('-createdAt').limit(20)
  res.json({ balance: w.balance, transactions })
})

module.exports = { summary }
