'use strict'

// Task 4: installment-plan snapshot + approval population + runMature guard
process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Wallet = require('../../src/models/Wallet')
const User = require('../../src/models/User')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { seedPlans } = require('../../src/seed/seedPlans')
const svc = require('../../src/services/investmentService')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function makeUser(overrides = {}) {
  const code = await generateUniqueCode()
  const u = await User.create({
    name: 'A',
    email: `a${Math.random()}@b.com`,
    passwordHash: 'x',
    referralCode: code,
    ...overrides,
  })
  await Wallet.create({ user: u._id, balance: 0 })
  return u
}

// ── Step 1: createInvestment snapshots installmentPcts ────────────────────────

test('createInvestment snapshots installmentPcts=[15,15] for silver plan', async () => {
  const u = await makeUser()
  const { investment } = await svc.createInvestment(u, { planKey: 'silver', amount: 200000 })
  expect(investment.installmentPcts).toEqual([15, 15])
})

test('createInvestment snapshots installmentPcts=[17.5,17.5] for gold plan', async () => {
  const u = await makeUser({ tier: 'gold' })
  const { investment } = await svc.createInvestment(u, { planKey: 'gold', amount: 300000 })
  expect(investment.installmentPcts).toEqual([17.5, 17.5])
})

// ── Step 2: approveInvestment populates installments[] ───────────────────────

test('approveInvestment populates 2 installments for silver (15/15) at 200 000 paise', async () => {
  const u = await makeUser()
  const { investment } = await svc.createInvestment(u, { planKey: 'silver', amount: 200000 })
  const admin = await makeUser({ role: 'admin' })
  const before = Date.now()

  await svc.approveInvestment(investment._id, admin._id)

  const inv = await Investment.findById(investment._id)
  expect(inv.installments).toHaveLength(2)
  // day field
  expect(inv.installments[0].day).toBe(1)
  expect(inv.installments[1].day).toBe(2)
  // pct snapshot
  expect(inv.installments[0].pct).toBe(15)
  expect(inv.installments[1].pct).toBe(15)
  // amounts: 15% of 200000=30000 each, expectedReturn=60000, last=60000-30000=30000
  expect(inv.installments[0].amount).toBe(30000)
  expect(inv.installments[1].amount).toBe(30000)
  // amounts sum to expectedReturn
  const total = inv.installments.reduce((s, i) => s + i.amount, 0)
  expect(total).toBe(inv.expectedReturn)
  // all scheduled
  expect(inv.installments.every((i) => i.status === 'scheduled')).toBe(true)
  // maturesAt timing: day 1 → +24h, day 2 → +48h (full 48h term, 50-50)
  const d1 = inv.installments[0].maturesAt.getTime()
  const d2 = inv.installments[1].maturesAt.getTime()
  expect(d1 - before).toBeGreaterThan(23.9 * 3600e3)
  expect(d1 - before).toBeLessThan(24.1 * 3600e3)
  expect(d2 - before).toBeGreaterThan(47.9 * 3600e3)
  expect(d2 - before).toBeLessThan(48.1 * 3600e3)
})

test('approveInvestment sets investment.maturesAt to last installment maturesAt for silver', async () => {
  const u = await makeUser()
  const { investment } = await svc.createInvestment(u, { planKey: 'silver', amount: 200000 })
  const admin = await makeUser({ role: 'admin' })

  await svc.approveInvestment(investment._id, admin._id)

  const inv = await Investment.findById(investment._id)
  expect(inv.maturesAt.getTime()).toBe(inv.installments[1].maturesAt.getTime())
})

test('approveInvestment populates 2 installments for gold (17.5/17.5) with sum-exact guard', async () => {
  const u = await makeUser({ tier: 'gold' })
  // gold: returnPct=35 → expectedReturn = 105 000 for 300 000 paise
  // 17.5% of 300000 = 52500, last = 105000 - 52500 = 52500 (sum-exact guard)
  const { investment } = await svc.createInvestment(u, { planKey: 'gold', amount: 300000 })
  const admin = await makeUser({ role: 'admin' })

  await svc.approveInvestment(investment._id, admin._id)

  const inv = await Investment.findById(investment._id)
  expect(inv.installments).toHaveLength(2)
  expect(inv.installments[0].amount).toBe(52500)
  expect(inv.installments[1].amount).toBe(52500)
  const total = inv.installments.reduce((s, i) => s + i.amount, 0)
  expect(total).toBe(inv.expectedReturn) // 105 000
})

test('approveInvestment with non-installment plan (legacy empty installmentPcts) still uses cycleDurationHours', async () => {
  // Create an investment with empty installmentPcts (simulates old Diamond / legacy)
  const adminId = new mongoose.Types.ObjectId()
  const inv = await Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver',
    amount: 100000,
    returnPct: 25,
    installmentPcts: [], // explicitly empty — non-installment path
    expectedReturn: 25000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'pending',
    paymentNotified: true,
  })

  const before = Date.now()
  await svc.approveInvestment(inv._id, adminId)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.installments).toHaveLength(0)
  // maturesAt is set from cycleDurationHours (default 8h)
  expect(fresh.maturesAt).toBeInstanceOf(Date)
  expect(fresh.maturesAt.getTime()).toBeGreaterThan(before)
})

// ── Step 4: runMature guard ──────────────────────────────────────────────────

test('runMature skips installment-plan investments (returns null)', async () => {
  const inv = await Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver',
    amount: 200000,
    returnPct: 30,
    installmentPcts: [10, 10, 10], // installment plan
    expectedReturn: 60000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'active',
    maturesAt: new Date(Date.now() - 1000),
  })

  const result = await svc.runMature(inv._id)
  expect(result).toBeNull()

  // Status must remain 'active' — not matured
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('active')
})

test('runMature still works for non-installment investments (empty installmentPcts)', async () => {
  const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'false'
  try {
    const inv = await Investment.create({
      user: new mongoose.Types.ObjectId(),
      planKey: 'silver',
      amount: 100000,
      returnPct: 25,
      installmentPcts: [], // non-installment
      expectedReturn: 25000,
      referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
      status: 'active',
      maturesAt: new Date(Date.now() - 1000),
    })

    const result = await svc.runMature(inv._id)
    const fresh = await Investment.findById(inv._id)
    expect(fresh.status).toBe('matured')
    expect(fresh.maturedAt).toBeInstanceOf(Date)
    expect(result).not.toBeNull()
  } finally {
    process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
  }
})

test('runMature is a no-op for a missing installmentPcts field (legacy doc)', async () => {
  // Simulate a legacy document that predates the installmentPcts field
  const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'false'
  try {
    const inv = await Investment.create({
      user: new mongoose.Types.ObjectId(),
      planKey: 'silver',
      amount: 100000,
      returnPct: 25,
      expectedReturn: 25000,
      referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
      status: 'active',
      maturesAt: new Date(Date.now() - 1000),
    })
    // Strip installmentPcts from DB to simulate legacy doc
    await Investment.collection.updateOne({ _id: inv._id }, { $unset: { installmentPcts: '' } })

    const result = await svc.runMature(inv._id)
    const fresh = await Investment.findById(inv._id)
    expect(fresh.status).toBe('matured')
    expect(result).not.toBeNull()
  } finally {
    process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
  }
})
