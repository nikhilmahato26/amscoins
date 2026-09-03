const Plan = require('../models/Plan')
const logger = require('../lib/logger').child({ service: 'seed' })

// Amounts in paise. Defaults are placeholders pending commercial sign-off
// (see PRODUCT.md). Tier thresholds match the client spec: gold@21, diamond@52.
const DEFAULTS = [
  // 48-hour term, paid 50-50: half the return matures at 24h, the other half
  // at 48h. Ending early at 24h keeps only the first half (see approveBreak).
  {
    key: 'silver',
    name: 'Silver',
    returnPct: 30,
    installmentPcts: [15, 15], // 50-50 of 30% → 15% @24h, 15% @48h
    minInvest: 100000,   // ₹1,000
    maxInvest: 1000000,  // ₹10,000
    unlockReferrals: 0,
    durationHours: 48,
  },
  {
    key: 'gold',
    name: 'Gold',
    returnPct: 35,
    installmentPcts: [17.5, 17.5], // 50-50 of 35% → 17.5% @24h, 17.5% @48h
    minInvest: 300000,    // ₹3,000
    maxInvest: 30000000,  // ₹3,00,000
    unlockReferrals: 21,
    durationHours: 48,
  },
  {
    key: 'diamond',
    name: 'Diamond',
    returnPct: 40,
    installmentPcts: [20, 20], // 50-50 of 40% → 20% @24h, 20% @48h
    minInvest: 500000,    // ₹5,000
    maxInvest: 50000000,  // ₹5,00,000
    unlockReferrals: 52,
    durationHours: 48,
    active: false,        // disabled — no new investments allowed
  },
]

async function seedPlans() {
  for (const p of DEFAULTS) {
    await Plan.updateOne({ key: p.key }, { $set: p }, { upsert: true })
  }
}

module.exports = { seedPlans, DEFAULTS }

if (require.main === module) {
  const { connectDb, disconnectDb } = require('../config/db')
  connectDb()
    .then(seedPlans)
    .then(disconnectDb)
    .then(() => logger.info('Plans seeded'))
    .catch((err) => {
      logger.error('Plan seeding failed', { stack: err.stack })
      process.exit(1)
    })
}
