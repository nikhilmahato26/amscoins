const Plan = require('../models/Plan')

// Amounts in paise. Defaults are placeholders pending commercial sign-off
// (see PRODUCT.md). Tier thresholds match the client spec: gold@11, diamond@21.
const DEFAULTS = [
  { key: 'silver', name: 'Silver', returnPct: 25, minInvest: 100000, maxInvest: 1000000, unlockReferrals: 0 },
  { key: 'gold', name: 'Gold', returnPct: 30, minInvest: 300000, maxInvest: 5000000, unlockReferrals: 11 },
  { key: 'diamond', name: 'Diamond', returnPct: 40, minInvest: 500000, maxInvest: 10000000, unlockReferrals: 21 },
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
    .then(() => console.log('Plans seeded'))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
