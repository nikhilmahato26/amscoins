process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { seedPlans } = require('../../src/seed/seedPlans')
const { createInvestment } = require('../../src/services/investmentService')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function makeUser(overrides = {}) {
  const code = await generateUniqueCode()
  return User.create({ name: 'A', email: `a${Math.random()}@b.com`, passwordHash: 'x', referralCode: code, ...overrides })
}

test('silver deposit creates a pending first-deposit investment', async () => {
  const u = await makeUser()
  const { investment, telegramLink } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
  expect(investment.status).toBe('pending')
  expect(investment.isFirstDeposit).toBe(true)
  expect(investment.expectedReturn).toBe(60000) // 30% of 200000
  expect(investment.referenceCode).toMatch(/^ASM-/)
  expect(telegramLink).toBeTruthy()
})

test('locked plan throws Plan locked', async () => {
  const u = await makeUser() // silver tier
  await expect(createInvestment(u, { planKey: 'gold', amount: 300000 })).rejects.toThrow('Plan locked')
})

test('amount below plan minimum throws', async () => {
  const u = await makeUser()
  await expect(createInvestment(u, { planKey: 'silver', amount: 50000 })).rejects.toThrow('outside plan limits')
})

test('referral code only attached on first deposit', async () => {
  const u = await makeUser({ firstDepositCredited: true })
  const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000, referralCode: 'ABCDEF' })
  expect(investment.isFirstDeposit).toBe(false)
  expect(investment.referralCodeUsed).toBeNull()
})
