'use strict'

const Investment = require('../models/Investment')
const logger = require('../lib/logger').child({ service: 'leaderboard' })
const { cacheGet, cacheSet } = require('../config/redis')

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
  const cacheKey = `cache:leaderboard:${period}`
  const cached = await cacheGet(cacheKey)
  if (cached) {
    try {
      const data = JSON.parse(cached)
      logger.debug('Leaderboard cache hit', { period, resultCount: data.length })
      return data
    } catch {
      // ignore parse error, fallback to aggregation
    }
  }

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

  logger.debug('Leaderboard queried', { period, resultCount: rows.length })
  const result = rows.map((r, i) => ({ rank: i + 1, ...r }))
  await cacheSet(cacheKey, JSON.stringify(result), 60)
  return result
}

module.exports = { periodStart, topInvestors }
