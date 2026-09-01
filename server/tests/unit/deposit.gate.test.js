'use strict'

/**
 * Deposit gate: a user may hold only one in-flight deposit, and after an
 * approval they must wait `depositCooldownHours` (default 6) before the next.
 * The cooldown is anchored on `startAt` (set only on approval), so a REJECTED
 * deposit never locks the user out. Server is the source of truth; these prove
 * both the enforcement in createInvestment and the read-only getDepositGate.
 */

process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const Investment = require('../../src/models/Investment')
const Settings = require('../../src/models/Settings')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { seedPlans } = require('../../src/seed/seedPlans')
const {
  createInvestment,
  approveInvestment,
  rejectInvestment,
  getDepositGate,
} = require('../../src/services/investmentService')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

const H = 3600e3

async function makeUser(overrides = {}) {
  const code = await generateUniqueCode()
  const u = await User.create({ name: 'A', email: `a${Math.random()}@b.com`, passwordHash: 'x', referralCode: code, ...overrides })
  await Wallet.create({ user: u._id, balance: 0 })
  return u
}

async function admin() {
  return makeUser({ role: 'admin' })
}

describe('getDepositGate status', () => {
  test('a fresh user is open to deposit', async () => {
    const u = await makeUser()
    expect(await getDepositGate(u._id)).toMatchObject({ status: 'open' })
  })

  test('a pending deposit reports status "pending"', async () => {
    const u = await makeUser()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await Investment.updateOne({ _id: investment._id }, { $set: { paymentNotified: true } })
    const gate = await getDepositGate(u._id)
    expect(gate.status).toBe('pending')
    expect(gate.pendingInvestmentId).toBe(String(investment._id))
  })

  test('within the window after approval reports "cooldown" with an ISO cooldownUntil', async () => {
    const u = await makeUser()
    const a = await admin()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await approveInvestment(investment._id, a._id)

    const gate = await getDepositGate(u._id)
    expect(gate.status).toBe('cooldown')
    expect(typeof gate.cooldownUntil).toBe('string')
    // ~6h ahead of the approval (startAt ≈ now).
    const msAhead = new Date(gate.cooldownUntil).getTime() - Date.now()
    expect(msAhead).toBeGreaterThan(6 * H - 60000)
    expect(msAhead).toBeLessThanOrEqual(6 * H)
  })

  test('once the cooldown has elapsed the user is open again', async () => {
    const u = await makeUser()
    const a = await admin()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await approveInvestment(investment._id, a._id)
    await Investment.collection.updateOne({ _id: investment._id }, { $set: { startAt: new Date(Date.now() - 7 * H) } })

    expect((await getDepositGate(u._id)).status).toBe('open')
  })

  test('a REJECTED deposit does NOT lock the user (open immediately)', async () => {
    const u = await makeUser()
    const a = await admin()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await rejectInvestment(investment._id, a._id, 'no payment')

    expect((await getDepositGate(u._id)).status).toBe('open')
  })

  test('depositCooldownHours = 0 disables the post-approval cooldown', async () => {
    const s = await Settings.getSingleton(); s.depositCooldownHours = 0; await s.save()
    const u = await makeUser()
    const a = await admin()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await approveInvestment(investment._id, a._id)

    expect((await getDepositGate(u._id)).status).toBe('open')
  })
})

describe('createInvestment enforces the gate', () => {
  test('a second deposit while one is pending is blocked (409)', async () => {
    const u = await makeUser()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await Investment.updateOne({ _id: investment._id }, { $set: { paymentNotified: true } })
    await expect(createInvestment(u, { planKey: 'silver', amount: 200000 })).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  test('a deposit during the post-approval cooldown is blocked (429)', async () => {
    const u = await makeUser()
    const a = await admin()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await approveInvestment(investment._id, a._id)
    await expect(createInvestment(u, { planKey: 'silver', amount: 200000 })).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  test('a deposit is allowed again after the cooldown elapses', async () => {
    const u = await makeUser()
    const a = await admin()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await approveInvestment(investment._id, a._id)
    await Investment.collection.updateOne({ _id: investment._id }, { $set: { startAt: new Date(Date.now() - 7 * H) } })

    const { investment: second } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    expect(second.status).toBe('pending')
  })

  test('a deposit is allowed immediately after a rejection', async () => {
    const u = await makeUser()
    const a = await admin()
    const { investment } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    await rejectInvestment(investment._id, a._id, 'no payment')

    const { investment: second } = await createInvestment(u, { planKey: 'silver', amount: 200000 })
    expect(second.status).toBe('pending')
  })
})
