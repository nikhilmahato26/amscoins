'use strict'

/**
 * One-shot migration: re-classify users whose tier no longer matches the current
 * thresholds (gold@21, diamond@52).
 *
 * Catches two stale patterns:
 *   - tier='diamond' with referralCount < 52  (old diamond threshold was 21)
 *   - tier='gold'    with referralCount < 21  (old gold threshold was lower)
 *
 * Ongoing investments are NOT affected — returnPct and expectedReturn are
 * frozen at creation time. The tier only gates future plan access.
 *
 * Run:  node src/migrations/fixDiamondTiers.js
 * Safe to run multiple times — only touches users still misclassified.
 */

const { connectDb, disconnectDb } = require('../config/db')
const User = require('../models/User')
const { tierForCount } = require('../services/tierService')
const logger = require('../lib/logger').child({ service: 'migration:fixTiers' })

async function run() {
  const stale = await User.find(
    {
      $or: [
        { tier: 'diamond', referralCount: { $lt: 52 } },
        { tier: 'gold',    referralCount: { $lt: 21 } },
      ],
    },
    'name email referralCount tier'
  ).lean()

  if (stale.length === 0) {
    logger.info('No stale tier users found — nothing to do.')
    return
  }

  logger.info(`Found ${stale.length} stale user(s). Recalculating…`)

  const ops = stale.map((u) => {
    const correctTier = tierForCount(u.referralCount)
    logger.info(`  ${u.email}  referralCount=${u.referralCount}  ${u.tier} → ${correctTier}`)
    return {
      updateOne: {
        filter: { _id: u._id },
        update: { $set: { tier: correctTier } },
      },
    }
  })

  const result = await User.bulkWrite(ops)
  logger.info(`Done. Modified: ${result.modifiedCount}`)
}

connectDb()
  .then(run)
  .then(disconnectDb)
  .catch((err) => {
    logger.error('Migration failed', { stack: err.stack })
    process.exit(1)
  })
