'use strict'

/**
 * #3 — admin acts on a RUNNING investment from the user's profile.
 * approvePayout pays deposit + profit now; rejectPayout credits a custom amount
 * (trace kept); deleteInvestment erases the whole cycle (soft-delete + reversal).
 */

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Wallet = require('../../src/models/Wallet')
const Transaction = require('../../src/models/Transaction')
const svc = require('../../src/services/investmentService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function running(extra = {}) {
  return Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'active', startAt: new Date(), approvedAt: new Date(),
    maturesAt: new Date(Date.now() + 24 * 3600e3), ...extra,
  })
}

describe('approvePayout', () => {
  test('pays deposit + profit and marks the investment returned', async () => {
    const inv = await running()
    const out = await svc.approvePayout(inv._id, new mongoose.Types.ObjectId())
    expect(out.status).toBe('returned')
    expect(out.walletCredited).toBe(true)
    expect(out.creditedAmount).toBe(250000)
    const w = await Wallet.findOne({ user: inv.user })
    expect(w.balance).toBe(250000)
  })

  test('is idempotent — a second call does not double-pay', async () => {
    const inv = await running()
    const adminId = new mongoose.Types.ObjectId()
    await svc.approvePayout(inv._id, adminId)
    await expect(svc.approvePayout(inv._id, adminId)).rejects.toThrow(/not running/i)
    const w = await Wallet.findOne({ user: inv.user })
    expect(w.balance).toBe(250000)
  })

  test('works on a timer-ended (matured) investment too', async () => {
    const inv = await running({ status: 'matured', maturedAt: new Date() })
    const out = await svc.approvePayout(inv._id, new mongoose.Types.ObjectId())
    expect(out.status).toBe('returned')
    const w = await Wallet.findOne({ user: inv.user })
    expect(w.balance).toBe(250000)
  })

  test('rejects a not-running investment', async () => {
    const inv = await running({ status: 'pending' })
    await expect(svc.approvePayout(inv._id, new mongoose.Types.ObjectId())).rejects.toThrow(/not running/i)
  })
})

describe('rejectPayout', () => {
  test('amount 0 cancels the investment and pays nothing back', async () => {
    const inv = await running()
    const out = await svc.rejectPayout(inv._id, new mongoose.Types.ObjectId(), { reason: 'test', amount: 0 })
    expect(out.status).toBe('rejected')
    const w = await Wallet.findOne({ user: inv.user })
    expect(w).toBeNull() // no wallet movement at all
  })

  test('credits a custom amount back and keeps the trace', async () => {
    const inv = await running()
    const out = await svc.rejectPayout(inv._id, new mongoose.Types.ObjectId(), { reason: 'partial', amount: 120000 })
    expect(out.status).toBe('rejected')
    expect(out.creditedAmount).toBe(120000)
    const w = await Wallet.findOne({ user: inv.user })
    expect(w.balance).toBe(120000)
    // The credit is a real transaction the user can see.
    const txns = await Transaction.find({ ref: inv._id })
    expect(txns).toHaveLength(1)
    expect(txns[0].direction).toBe('credit')
    expect(txns[0].amount).toBe(120000)
  })

  test('rejects an amount above deposit + profit', async () => {
    const inv = await running()
    await expect(
      svc.rejectPayout(inv._id, new mongoose.Types.ObjectId(), { reason: 'too much', amount: 999999 })
    ).rejects.toThrow(/out of range/i)
  })

  test('is idempotent — a second call throws, state unchanged', async () => {
    const inv = await running()
    const adminId = new mongoose.Types.ObjectId()
    await svc.rejectPayout(inv._id, adminId, { reason: 'x', amount: 0 })
    await expect(svc.rejectPayout(inv._id, adminId, { reason: 'x', amount: 0 })).rejects.toThrow(/not running/i)
    expect((await Investment.findById(inv._id)).status).toBe('rejected')
  })
})

describe('deleteInvestment', () => {
  test('soft-deletes an active investment with no wallet trace', async () => {
    const inv = await running()
    const out = await svc.deleteInvestment(inv._id, new mongoose.Types.ObjectId())
    expect(out.status).toBe('deleted')
    // Row is kept (for admin History) but excluded from the user's side.
    expect(await Investment.findById(inv._id)).not.toBeNull()
    const w = await Wallet.findOne({ user: inv.user })
    expect(w).toBeNull() // active never credited — nothing to reverse
  })

  test('reverses a prior credit and removes its transactions', async () => {
    const inv = await running()
    const adminId = new mongoose.Types.ObjectId()
    // Pay it out first so the wallet holds deposit + profit.
    await svc.approvePayout(inv._id, adminId)
    expect((await Wallet.findOne({ user: inv.user })).balance).toBe(250000)
    // Deleting erases the cycle: balance returns to 0 and the txns are gone.
    const out = await svc.deleteInvestment(inv._id, adminId)
    expect(out.status).toBe('deleted')
    expect((await Wallet.findOne({ user: inv.user })).balance).toBe(0)
    expect(await Transaction.find({ ref: inv._id })).toHaveLength(0)
  })

  test('is idempotent — deleting twice throws', async () => {
    const inv = await running()
    const adminId = new mongoose.Types.ObjectId()
    await svc.deleteInvestment(inv._id, adminId)
    await expect(svc.deleteInvestment(inv._id, adminId)).rejects.toThrow(/already deleted/i)
  })
})
