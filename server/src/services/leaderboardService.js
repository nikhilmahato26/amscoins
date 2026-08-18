'use strict'

const Investment = require('../models/Investment')
const logger = require('../lib/logger').child({ service: 'leaderboard' })
const { cacheGet, cacheSet } = require('../config/redis')

// IST day/week/month starts. IST is UTC+5:30 with no DST.
const IST_OFFSET_MS = 5.5 * 3600 * 1000

// How many ranked entries each period surfaces.
const PERIOD_LIMITS = { daily: 5, weekly: 10, monthly: 20 }

function periodStart(period, now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  const y = ist.getUTCFullYear(), m = ist.getUTCMonth()
  let d = ist.getUTCDate()
  // Week starts Monday; Date.UTC normalizes a non-positive day into the prior month.
  if (period === 'weekly') {
    const dow = ist.getUTCDay() // 0 = Sun … 6 = Sat
    d -= dow === 0 ? 6 : dow - 1
  }
  if (period === 'monthly') d = 1
  const istMidnight = Date.UTC(y, m, d, 0, 0, 0)
  return new Date(istMidnight - IST_OFFSET_MS)
}

async function topInvestors(period, limit = PERIOD_LIMITS[period] ?? 20) {
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
    { $project: { _id: 0, userId: '$_id', name: '$u.name', tier: '$u.tier', avatar: '$u.avatar', totalInvested: 1 } },
  ])

  logger.debug('Leaderboard queried', { period, resultCount: rows.length })
  const result = rows.map((r, i) => ({ rank: i + 1, ...r }))
  await cacheSet(cacheKey, JSON.stringify(result), 60)
  return result
}

module.exports = { periodStart, topInvestors, PERIOD_LIMITS }
