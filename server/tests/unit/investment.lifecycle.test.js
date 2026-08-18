'use strict'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Wallet = require('../../src/models/Wallet')
const Settings = require('../../src/models/Settings')
const svc = require('../../src/services/investmentService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const adminId = new mongoose.Types.ObjectId()

async function pendingInv(extra = {}) {
  return Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver', amount: 100000, returnPct: 25, expectedReturn: 25000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'pending', ...extra,
  })
}

test('approveInvestment activates without crediting the wallet', async () => {
  const inv = await pendingInv()
  await svc.approveInvestment(inv._id, adminId)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('active')
  expect(fresh.maturesAt).toBeInstanceOf(Date)
  const w = await Wallet.findOne({ user: inv.user })
  expect(w == null || w.balance === 0).toBe(true) // no principal credit at approval
})

test('approveInvestment uses Settings.cycleDurationHours for maturesAt', async () => {
  const s = await Settings.getSingleton(); s.cycleDurationHours = 36; await s.save()
  const inv = await pendingInv()
  const before = Date.now()
  await svc.approveInvestment(inv._id, adminId)
  const fresh = await Investment.findById(inv._id)
  const diffH = (fresh.maturesAt.getTime() - before) / 3600e3
  expect(diffH).toBeGreaterThan(35.9)
  expect(diffH).toBeLessThan(36.1)
})

test('runAutoReject rejects a still-pending investment silently', async () => {
  const inv = await pendingInv()
  await svc.runAutoReject(inv._id)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('rejected')
  expect(fresh.autoRejected).toBe(true)
  expect(fresh.rejectionReason).toBe('auto-rejected: approval timeout (8h)')
})

test('runAutoReject is a no-op once active', async () => {
  const inv = await pendingInv({ status: 'active' })
  await svc.runAutoReject(inv._id)
  expect((await Investment.findById(inv._id)).status).toBe('active')
})

test('runMature moves active to matured (manual mode, no credit)', async () => {
  // Pin manual mode: auto-credit now defaults on, so force it off to exercise
  // the manual-maturation path this test is about.
  const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'false'
  try {
    const inv = await pendingInv({ status: 'active', maturesAt: new Date(Date.now() - 1000) })
    await svc.runMature(inv._id)
    const fresh = await Investment.findById(inv._id)
    expect(fresh.status).toBe('matured')
    expect(fresh.maturedAt).toBeInstanceOf(Date)
    const w = await Wallet.findOne({ user: inv.user })
    expect(w == null || w.balance === 0).toBe(true)
  } finally {
    process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
  }
})

test('runMature auto-credits when WALLET_AUTO_CREDIT_ON_MATURITY is on', async () => {
  const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'true'
  // Use the original connected models; svc reads process.env at call time.
  const inv = await Investment.create({
    user: new mongoose.Types.ObjectId(), planKey: 'silver', amount: 100000,
    returnPct: 25, expectedReturn: 25000, referenceCode: `ASM-${Math.random().toString(36).slice(2,10)}`,
    status: 'active', maturesAt: new Date(Date.now() - 1000),
  })
  await svc.runMature(inv._id)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(125000)
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
})

test('runSweep matures due and auto-rejects stale', async () => {
  // Pin manual maturation so the due investment lands on 'matured' rather than
  // being auto-credited to 'returned' (auto-credit now defaults on).
  const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'false'
  try {
    const { runSweep } = require('../../src/jobs/investmentWorker')
    const s = await Settings.getSingleton(); s.autoRejectHours = 8; await s.save()

    const stale = await pendingInv() // createdAt now; force it old.
    // createdAt is immutable under timestamps:true, so bypass Mongoose via the
    // native driver to backdate it past the auto-reject window.
    await Investment.collection.updateOne({ _id: stale._id }, { $set: { createdAt: new Date(Date.now() - 9 * 3600e3) } })
    const due = await pendingInv({ status: 'active', maturesAt: new Date(Date.now() - 1000) })

    await runSweep()

    expect((await Investment.findById(stale._id)).status).toBe('rejected')
    expect((await Investment.findById(due._id)).status).toBe('matured')
  } finally {
    process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
  }
})
