process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const mongoose = require('mongoose')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { creditReferralIfFirst } = require('../../src/services/referralService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function makeUser(overrides = {}) {
  const code = await generateUniqueCode()
  return User.create({ name: 'A', email: `a${Math.random()}@b.com`, passwordHash: 'x', referralCode: code, ...overrides })
}

async function withTxn(fn) {
  const session = await mongoose.startSession()
  try {
    let out
    await session.withTransaction(async () => { out = await fn(session) })
    return out
  } finally {
    session.endSession()
  }
}

test('first deposit increments referrer count and upgrades to gold at 21', async () => {
  const ref = await makeUser({ referralCount: 20, tier: 'silver' })
  const u = await makeUser({ referredBy: ref._id })
  await withTxn((s) => creditReferralIfFirst(u, s))
  const fresh = await User.findById(ref._id)
  expect(fresh.referralCount).toBe(21)
  expect(fresh.tier).toBe('gold')
  expect((await User.findById(u._id)).firstDepositCredited).toBe(true)
})

test('is idempotent — second call does not double-count', async () => {
  const ref = await makeUser({ referralCount: 0 })
  const u = await makeUser({ referredBy: ref._id })
  await withTxn((s) => creditReferralIfFirst(u, s))
  const reloaded = await User.findById(u._id)
  await withTxn((s) => creditReferralIfFirst(reloaded, s))
  expect((await User.findById(ref._id)).referralCount).toBe(1)
})

test('user with no referrer still flips flag', async () => {
  const u = await makeUser()
  const out = await withTxn((s) => creditReferralIfFirst(u, s))
  expect(out.credited).toBe(true)
  expect(out.referrerId).toBeNull()
  expect((await User.findById(u._id)).firstDepositCredited).toBe(true)
})

test('upgrades to diamond at 52', async () => {
  const ref = await makeUser({ referralCount: 51, tier: 'gold' })
  const u = await makeUser({ referredBy: ref._id })
  await withTxn((s) => creditReferralIfFirst(u, s))
  expect((await User.findById(ref._id)).tier).toBe('diamond')
})
