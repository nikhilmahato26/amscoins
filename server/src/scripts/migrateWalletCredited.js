'use strict'

const Investment = require('../models/Investment')
const logger = require('../lib/logger').child({ service: 'migrate' })

// Existing 'active' investments already had their principal credited under the
// old approve-time logic. Flag them so the new mature/return path credits only
// the return, never re-crediting principal.
async function markActiveAsCredited() {
  const res = await Investment.updateMany(
    { status: 'active', walletCredited: { $ne: true } },
    { $set: { walletCredited: true } }
  )
  return res.modifiedCount
}

module.exports = { markActiveAsCredited }

if (require.main === module) {
  const { connectDb, disconnectDb } = require('../config/db')
  connectDb()
    .then(markActiveAsCredited)
    .then((n) => logger.info('Migration complete', { modified: n }))
    .then(disconnectDb)
    .catch((err) => {
      logger.error('Migration failed', { stack: err.stack })
      process.exit(1)
    })
}
