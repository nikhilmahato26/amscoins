process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const Plan = require('../../src/models/Plan')
const { seedPlans } = require('../../src/seed/seedPlans')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('seedPlans upserts the three tiers with correct terms', async () => {
  await seedPlans()
  const plans = await Plan.find().sort('returnPct')
  expect(plans).toHaveLength(3)
  const silver = await Plan.findOne({ key: 'silver' })
  expect(silver.returnPct).toBe(30)
  expect(silver.installmentPcts).toEqual([10, 10, 10])
  expect(silver.durationHours).toBe(72)
  const gold = await Plan.findOne({ key: 'gold' })
  expect(gold.returnPct).toBe(40)
  expect(gold.installmentPcts).toEqual([13, 13, 14])
  expect(gold.unlockReferrals).toBe(21)
  expect(gold.maxInvest).toBe(30000000)
  expect(gold.durationHours).toBe(72)
  const diamond = await Plan.findOne({ key: 'diamond' })
  expect(diamond.returnPct).toBe(40)
  expect(diamond.installmentPcts).toEqual([])
  expect(diamond.unlockReferrals).toBe(52)
  expect(diamond.active).toBe(false)
})

test('seedPlans is idempotent', async () => {
  await seedPlans()
  await seedPlans()
  expect(await Plan.countDocuments()).toBe(3)
})
