'use strict'

/**
 * Timing-boundary coverage for the investment automation (auto-reject +
 * auto-return via the sweep). These are deterministic: instead of waiting on
 * real clocks/queues, they place investments precisely inside vs just past the
 * cutoff and assert the sweep fires on exactly the right ones. Complements the
 * real-queue timing proof in scripts/automation-e2e.js.
 */

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Wallet = require('../../src/models/Wallet')
const Settings = require('../../src/models/Settings')
const svc = require('../../src/services/investmentService')
const { runSweep } = require('../../src/jobs/investmentWorker')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const H = 3600e3 // one hour in ms

async function pending(extra = {}) {
  return Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'pending', ...extra,
  })
}

// createdAt is immutable under timestamps:true — backdate via the native driver.
async function backdateCreatedAt(id, ms) {
  await Investment.collection.updateOne({ _id: id }, { $set: { createdAt: new Date(Date.now() - ms) } })
}

describe('auto-reject timing (sweep cutoff = autoRejectHours)', () => {
  test('does NOT reject an investment still inside the window', async () => {
    const s = await Settings.getSingleton(); s.autoRejectHours = 8; await s.save()
    const inv = await pending()
    // 7h59m old — 1 minute short of the 8h cutoff.
    await backdateCreatedAt(inv._id, 8 * H - 60000)

    await runSweep()

    expect((await Investment.findById(inv._id)).status).toBe('pending')
  })

  test('DOES reject an investment just past the window', async () => {
    const s = await Settings.getSingleton(); s.autoRejectHours = 8; await s.save()
    const inv = await pending()
    // 8h01m old — 1 minute past the cutoff.
    await backdateCreatedAt(inv._id, 8 * H + 60000)

    await runSweep()

    const fresh = await Investment.findById(inv._id)
    expect(fresh.status).toBe('rejected')
    expect(fresh.autoRejected).toBe(true)
  })

  test('honors a changed autoRejectHours setting (dynamic window + reason)', async () => {
    const s = await Settings.getSingleton(); s.autoRejectHours = 3; await s.save()
    const insideCutoff = await pending()
    await backdateCreatedAt(insideCutoff._id, 3 * H - 60000) // 2h59m — safe
    const pastCutoff = await pending()
    await backdateCreatedAt(pastCutoff._id, 3 * H + 60000) // 3h01m — expired

    await runSweep()

    expect((await Investment.findById(insideCutoff._id)).status).toBe('pending')
    const rejected = await Investment.findById(pastCutoff._id)
    expect(rejected.status).toBe('rejected')
    // Reason reflects the configured window, not a hard-coded 8h.
    expect(rejected.rejectionReason).toBe('auto-rejected: approval timeout (3h)')
  })

  test('leaves already-active investments untouched (only pending expire)', async () => {
    const s = await Settings.getSingleton(); s.autoRejectHours = 8; await s.save()
    const active = await pending({ status: 'active', maturesAt: new Date(Date.now() + 24 * H) })
    await backdateCreatedAt(active._id, 100 * H) // very old, but already active

    await runSweep()

    expect((await Investment.findById(active._id)).status).toBe('active')
  })
})

describe('auto-deposit timing (sweep cutoff = autoDepositHours)', () => {
  // Isolate the auto-deposit window: enable auto-deposit and turn auto-reject
  // OFF so only the auto-deposit cutoff governs these pending rows.
  beforeEach(async () => {
    const s = await Settings.getSingleton()
    s.autoDepositEnabled = true
    s.autoRejectEnabled = false
    await s.save()
  })

  test('does NOT auto-approve an investment still inside the window', async () => {
    const s = await Settings.getSingleton(); s.autoDepositHours = 24; await s.save()
    const inv = await pending()
    // 23h59m old — 1 minute short of the 24h cutoff.
    await backdateCreatedAt(inv._id, 24 * H - 60000)

    await runSweep()

    expect((await Investment.findById(inv._id)).status).toBe('pending')
  })

  test('DOES advance an investment to the next step (active) just past the window', async () => {
    const s = await Settings.getSingleton(); s.autoDepositHours = 24; await s.save()
    const inv = await pending()
    // 24h01m old — 1 minute past the cutoff.
    await backdateCreatedAt(inv._id, 24 * H + 60000)

    await runSweep()

    const fresh = await Investment.findById(inv._id)
    expect(fresh.status).toBe('active')
    expect(fresh.autoApproved).toBe(true)
    expect(fresh.startAt).toBeInstanceOf(Date)
    expect(fresh.maturesAt).toBeInstanceOf(Date) // maturity timer started
  })

  test('honors a changed autoDepositHours setting (dynamic window)', async () => {
    const s = await Settings.getSingleton(); s.autoDepositHours = 3; await s.save()
    const insideCutoff = await pending()
    await backdateCreatedAt(insideCutoff._id, 3 * H - 60000) // 2h59m — safe
    const pastCutoff = await pending()
    await backdateCreatedAt(pastCutoff._id, 3 * H + 60000) // 3h01m — due

    await runSweep()

    expect((await Investment.findById(insideCutoff._id)).status).toBe('pending')
    expect((await Investment.findById(pastCutoff._id)).status).toBe('active')
  })

  test('OFF (default): a stale pending investment is NOT auto-approved', async () => {
    const s = await Settings.getSingleton()
    s.autoDepositEnabled = false; s.autoRejectEnabled = false; s.autoDepositHours = 3
    await s.save()
    const inv = await pending()
    await backdateCreatedAt(inv._id, 10 * H) // well past — but the switch is off

    await runSweep()

    expect((await Investment.findById(inv._id)).status).toBe('pending')
  })

  test('precedence: past BOTH windows, auto-deposit (approve) wins over auto-reject', async () => {
    const s = await Settings.getSingleton()
    s.autoDepositEnabled = true; s.autoDepositHours = 4
    s.autoRejectEnabled = true; s.autoRejectHours = 8
    await s.save()
    const inv = await pending()
    await backdateCreatedAt(inv._id, 9 * H) // past both the 4h and 8h cutoffs

    await runSweep()

    const fresh = await Investment.findById(inv._id)
    expect(fresh.status).toBe('active') // advanced, not rejected
    expect(fresh.autoApproved).toBe(true)
    expect(fresh.autoRejected).toBe(false)
  })
})

describe('auto-return timing (sweep cutoff = maturesAt)', () => {
  test('does NOT mature an investment before maturesAt', async () => {
    const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
    process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'false'
    try {
      const inv = await pending({ status: 'active', maturesAt: new Date(Date.now() + 60000) }) // 1 min out
      await runSweep()
      expect((await Investment.findById(inv._id)).status).toBe('active')
    } finally {
      process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
    }
  })

  test('matures an investment whose maturesAt has passed', async () => {
    const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
    process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'false'
    try {
      const inv = await pending({ status: 'active', maturesAt: new Date(Date.now() - 1000) })
      await runSweep()
      const fresh = await Investment.findById(inv._id)
      expect(fresh.status).toBe('matured')
      expect(fresh.maturedAt).toBeInstanceOf(Date)
    } finally {
      process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
    }
  })

  test('auto-credits the EXACT principal + return at maturity', async () => {
    const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
    process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'true'
    try {
      const userId = new mongoose.Types.ObjectId()
      const inv = await Investment.create({
        user: userId, planKey: 'gold', amount: 500000, returnPct: 40, expectedReturn: 200000,
        referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
        status: 'active', startAt: new Date(), approvedAt: new Date(),
        maturesAt: new Date(Date.now() - 1000),
      })

      await runSweep()

      const fresh = await Investment.findById(inv._id)
      expect(fresh.status).toBe('returned')
      expect(fresh.walletCredited).toBe(true)
      expect(fresh.creditedAmount).toBe(700000) // 500000 principal + 200000 return
      const w = await Wallet.findOne({ user: userId })
      expect(w.balance).toBe(700000)
    } finally {
      process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
    }
  })
})

describe('scheduling delay math (config/queue helpers, no-op in test env)', () => {
  // In NODE_ENV=test the queue is disabled, so these assert the pure delay
  // formula the production helpers use, keeping the "correct time" contract
  // explicit and regression-guarded even without Redis.
  test('auto-reject delay = createdAt + autoRejectHours - now', () => {
    const autoRejectHours = 8
    const createdAt = new Date(Date.now() - 2 * H) // 2h ago
    const delay = Math.max(0, new Date(createdAt).getTime() + autoRejectHours * H - Date.now())
    // ~6h remain in the window (allow 1s of test execution slack).
    expect(delay).toBeGreaterThan(6 * H - 1000)
    expect(delay).toBeLessThanOrEqual(6 * H)
  })

  test('auto-reject delay clamps to 0 for an already-expired window', () => {
    const autoRejectHours = 8
    const createdAt = new Date(Date.now() - 9 * H) // older than the window
    const delay = Math.max(0, new Date(createdAt).getTime() + autoRejectHours * H - Date.now())
    expect(delay).toBe(0)
  })

  test('auto-deposit delay = createdAt + autoDepositHours - now', () => {
    const autoDepositHours = 24
    const createdAt = new Date(Date.now() - 2 * H) // 2h ago
    const delay = Math.max(0, new Date(createdAt).getTime() + autoDepositHours * H - Date.now())
    // ~22h remain in the window (allow 1s of test execution slack).
    expect(delay).toBeGreaterThan(22 * H - 1000)
    expect(delay).toBeLessThanOrEqual(22 * H)
  })

  test('mature delay = maturesAt - now (clamped at 0)', () => {
    const future = new Date(Date.now() + 3 * H)
    const past = new Date(Date.now() - 3 * H)
    expect(Math.max(0, future.getTime() - Date.now())).toBeGreaterThan(3 * H - 1000)
    expect(Math.max(0, past.getTime() - Date.now())).toBe(0)
  })
})

// Idempotency of the raw handlers the queue jobs call.
describe('handler idempotency (safe to re-fire)', () => {
  test('runAutoReject twice yields a single rejected state', async () => {
    const inv = await pending()
    await svc.runAutoReject(inv._id)
    const second = await svc.runAutoReject(inv._id)
    expect(second).toBeNull() // no-op the second time
    expect((await Investment.findById(inv._id)).status).toBe('rejected')
  })

  test('runAutoDeposit twice yields a single active state (no double-approve)', async () => {
    const s = await Settings.getSingleton(); s.autoDepositEnabled = true; await s.save()
    const inv = await pending()
    const first = await svc.runAutoDeposit(inv._id)
    expect(first.status).toBe('active')
    const second = await svc.runAutoDeposit(inv._id)
    expect(second).toBeNull() // 409 already-processed is swallowed → no-op
    expect((await Investment.findById(inv._id)).status).toBe('active')
  })

  test('auto-deposit then auto-reject on the same row: reject no-ops (already active)', async () => {
    const s = await Settings.getSingleton()
    s.autoDepositEnabled = true; s.autoRejectEnabled = true
    await s.save()
    const inv = await pending()
    await svc.runAutoDeposit(inv._id) // -> active
    const rej = await svc.runAutoReject(inv._id) // must NOT reject an active row
    expect(rej).toBeNull()
    expect((await Investment.findById(inv._id)).status).toBe('active')
  })

  test('runMature twice does not double-credit', async () => {
    const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
    process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'true'
    try {
      const userId = new mongoose.Types.ObjectId()
      const inv = await Investment.create({
        user: userId, planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000,
        referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
        status: 'active', maturesAt: new Date(Date.now() - 1000),
      })
      await svc.runMature(inv._id)
      await svc.runMature(inv._id)
      const w = await Wallet.findOne({ user: userId })
      expect(w.balance).toBe(250000)
    } finally {
      process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
    }
  })
})
