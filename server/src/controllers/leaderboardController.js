const asyncHandler = require('../middleware/asyncHandler')
const { topInvestors } = require('../services/leaderboardService')
const { ApiError } = require('../middleware/errorHandler')
const VALID = ['daily', 'weekly', 'monthly']
const list = asyncHandler(async (req, res) => {
  const period = req.query.period || 'daily'
  if (!VALID.includes(period)) throw new ApiError(400, 'Invalid period')
  res.json({ period, entries: await topInvestors(period) })
})
module.exports = { list }
