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
  expect(silver.installmentPcts).toEqual([15, 15]) // 50-50 of 30% over 48h
  expect(silver.durationHours).toBe(48)
  const gold = await Plan.findOne({ key: 'gold' })
  expect(gold.returnPct).toBe(35)
  expect(gold.installmentPcts).toEqual([17.5, 17.5]) // 50-50 of 35% over 48h
  expect(gold.unlockReferrals).toBe(21)
  expect(gold.maxInvest).toBe(30000000)
  expect(gold.durationHours).toBe(48)
  const diamond = await Plan.findOne({ key: 'diamond' })
  expect(diamond.returnPct).toBe(40)
  expect(diamond.installmentPcts).toEqual([20, 20]) // 50-50 of 40% over 48h
  expect(diamond.unlockReferrals).toBe(52)
  expect(diamond.active).toBe(false)
})

test('seedPlans is idempotent', async () => {
  await seedPlans()
  await seedPlans()
  expect(await Plan.countDocuments()).toBe(3)
})
