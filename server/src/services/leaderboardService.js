const Investment = require('../models/Investment')

// IST day/month/year starts. IST is UTC+5:30 with no DST.
const IST_OFFSET_MS = 5.5 * 3600 * 1000
function periodStart(period, now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  let y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate()
  if (period === 'monthly') d = 1
  if (period === 'yearly') { d = 1; m = 0 }
  const istMidnight = Date.UTC(y, m, d, 0, 0, 0)
  return new Date(istMidnight - IST_OFFSET_MS)
}

async function topInvestors(period, limit = 20) {
  const start = periodStart(period)
  const rows = await Investment.aggregate([
    { $match: { status: 'active', approvedAt: { $gte: start } } },
    { $group: { _id: '$user', totalInvested: { $sum: '$amount' }, firstAt: { $min: '$approvedAt' } } },
    { $sort: { totalInvested: -1, firstAt: 1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $project: { _id: 0, userId: '$_id', name: '$u.name', tier: '$u.tier', totalInvested: 1 } },
  ])
  return rows.map((r, i) => ({ rank: i + 1, ...r }))
}

module.exports = { periodStart, topInvestors }
