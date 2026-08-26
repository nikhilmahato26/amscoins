'use strict'

/**
 * #5 — the two admin on/off switches actually gate the automations (they gate
 * the action, so already-scheduled jobs also respect a flip). Both default on.
 */

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Wallet = require('../../src/models/Wallet')
const Settings = require('../../src/models/Settings')
const svc = require('../../src/services/investmentService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function invDoc(extra = {}) {
  return Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'pending', ...extra,
  })
}

describe('auto-reject switch', () => {
  test('OFF: a stale pending investment is NOT auto-rejected', async () => {
    const s = await Settings.getSingleton(); s.autoRejectEnabled = false; await s.save()
    const inv = await invDoc()
    const out = await svc.runAutoReject(inv._id)
    expect(out).toBeNull()
    expect((await Investment.findById(inv._id)).status).toBe('pending')
  })

  test('ON (default): auto-reject proceeds', async () => {
    const inv = await invDoc()
    await svc.runAutoReject(inv._id)
    expect((await Investment.findById(inv._id)).status).toBe('rejected')
  })
})

describe('auto-deposit switch', () => {
  test('OFF (default): a stale pending investment is NOT auto-approved', async () => {
    // autoDepositEnabled defaults false — the handler must no-op.
    const inv = await invDoc()
    const out = await svc.runAutoDeposit(inv._id)
    expect(out).toBeNull()
    expect((await Investment.findById(inv._id)).status).toBe('pending')
  })

  test('ON: auto-deposit advances the deposit to the next step (approve)', async () => {
    const s = await Settings.getSingleton(); s.autoDepositEnabled = true; await s.save()
    const inv = await invDoc()
    const out = await svc.runAutoDeposit(inv._id)
    expect(out.status).toBe('active')
    expect(out.autoApproved).toBe(true)
    expect(out.startAt).toBeInstanceOf(Date)
    expect(out.maturesAt).toBeInstanceOf(Date)
  })
})

describe('auto-pay switch', () => {
  const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
  beforeEach(() => { process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'true' }) // master flag on
  afterEach(() => {
    if (prev === undefined) delete process.env.WALLET_AUTO_CREDIT_ON_MATURITY
    else process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
  })

  test('OFF: a due investment matures but is NOT paid (waits for an admin)', async () => {
    const s = await Settings.getSingleton(); s.autoPayEnabled = false; await s.save()
    const inv = await invDoc({ status: 'active', maturesAt: new Date(Date.now() - 1000) })
    const out = await svc.runMature(inv._id)
    expect(out.status).toBe('matured')
    expect(await Wallet.findOne({ user: inv.user })).toBeNull()
  })

  test('ON (default): a due investment is paid automatically', async () => {
    const inv = await invDoc({ status: 'active', maturesAt: new Date(Date.now() - 1000) })
    const out = await svc.runMature(inv._id)
    expect(out.status).toBe('returned')
    expect((await Wallet.findOne({ user: inv.user })).balance).toBe(250000)
  })
})
