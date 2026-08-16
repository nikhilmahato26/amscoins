'use strict'

const User = require('../models/User')
const { generateUniquePublicId } = require('../services/referralCode')
const logger = require('../lib/logger').child({ service: 'backfill' })

// Assign a human-readable publicId (ASM-XXXXXX) to every user that lacks one.
// Idempotent: re-running only touches users still missing a publicId.
async function backfillPublicIds() {
  const cursor = User.find({ $or: [{ publicId: { $exists: false } }, { publicId: null }] }).cursor()
  let count = 0
  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    user.publicId = await generateUniquePublicId()
    await user.save()
    count += 1
  }
  return count
}

module.exports = { backfillPublicIds }

if (require.main === module) {
  const { connectDb, disconnectDb } = require('../config/db')
  connectDb()
    .then(backfillPublicIds)
    .then((count) => {
      logger.info('Public IDs backfilled', { count })
      return disconnectDb()
    })
    .catch((err) => {
      logger.error('Public ID backfill failed', { stack: err.stack })
      process.exit(1)
    })
}
