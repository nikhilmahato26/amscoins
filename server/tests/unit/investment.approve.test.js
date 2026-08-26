process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const Investment = require('../../src/models/Investment')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { seedPlans } = require('../../src/seed/seedPlans')
const { createInvestment, approveInvestment, rejectInvestment } = require('../../src/services/investmentService')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function makeUser(overrides = {}) {
  const code = await generateUniqueCode()
  const u = await User.create({ name: 'A', email: `a${Math.random()}@b.com`, passwordHash: 'x', referralCode: code, ...overrides })
  await Wallet.create({ user: u._id, balance: 0 })
  return u
}

test('approve locks funds (no credit), activates, and credits referrer on first deposit', async () => {
  const ref = await makeUser({ referralCount: 0 })
  const u = await makeUser({ referredBy: ref._id })
  const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
  const admin = await makeUser({ role: 'admin' })

  await approveInvestment(investment._id, admin._id)

  expect((await Wallet.findOne({ user: u._id })).balance).toBe(0) // no principal credit at approval
  const inv = await Investment.findById(investment._id)
  expect(inv.status).toBe('active')
  expect(inv.maturesAt).toBeTruthy()
  expect((await User.findById(ref._id)).referralCount).toBe(1)
})

test('approving an already-processed investment throws 409', async () => {
  const u = await makeUser()
  const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
  const admin = await makeUser({ role: 'admin' })
  await approveInvestment(investment._id, admin._id)
  await expect(approveInvestment(investment._id, admin._id)).rejects.toMatchObject({ statusCode: 409 })
})

test('reject marks rejected without touching wallet', async () => {
  const u = await makeUser()
  const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
  const admin = await makeUser({ role: 'admin' })
  await rejectInvestment(investment._id, admin._id, 'no payment received')
  expect((await Investment.findById(investment._id)).status).toBe('rejected')
  expect((await Wallet.findOne({ user: u._id })).balance).toBe(0)
})

test('second deposit does not re-credit referrer', async () => {
  const ref = await makeUser({ referralCount: 0 })
  const u = await makeUser({ referredBy: ref._id })
  const admin = await makeUser({ role: 'admin' })
  const first = await createInvestment(u, { planKey: 'silver', amount: 200000 })
  await approveInvestment(first.investment._id, admin._id)
  // The deposit cooldown blocks a same-user re-deposit for 6h after approval —
  // fast-forward past it (backdate startAt) so we can exercise the second deposit.
  await Investment.collection.updateOne(
    { _id: first.investment._id },
    { $set: { startAt: new Date(Date.now() - 7 * 3600e3) } },
  )
  const reloaded = await User.findById(u._id)
  const second = await createInvestment(reloaded, { planKey: 'silver', amount: 200000 })
  await approveInvestment(second.investment._id, admin._id)
  expect((await User.findById(ref._id)).referralCount).toBe(1)
  expect((await Wallet.findOne({ user: u._id })).balance).toBe(0) // funds locked until maturity
})
