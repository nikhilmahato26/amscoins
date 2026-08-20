'use strict'

/**
 * End-to-end automation test — REAL Redis + REAL BullMQ + REAL Mongo.
 *
 * This is not a unit test that pokes the service handlers directly. It drives
 * the *production* code paths:
 *   - config/queue.js          scheduleAutoReject / scheduleMature / cancelAutoReject
 *   - jobs/investmentWorker.js startInvestmentWorker (the real BullMQ Worker)
 *   - services/investmentService.js  runAutoReject / runMature / approveInvestment
 *
 * and proves the delayed jobs FIRE AT THE CORRECT TIME:
 *   1. Auto-reject fires only AFTER the autoRejectHours window (not early).
 *   2. Approving a pending deposit CANCELS the pending auto-reject (never fires).
 *   3. Auto-return (maturity) fires at maturesAt and credits principal + return.
 *
 * Timing is compressed by back-dating createdAt / setting maturesAt a couple of
 * seconds out, so the same delay math the queue uses in production
 * (`createdAt + hours - now`, `maturesAt - now`) resolves to ~1.5s here.
 *
 * Requirements: a running Redis (uses DB 15, isolated + flushed). Mongo is an
 * in-memory replica set (transactions needed by approveReturn).
 *
 * Run:  node scripts/automation-e2e.js
 * Exit: 0 = all scenarios passed, 1 = a failure/assertion error.
 */

// Node 18 doesn't expose webcrypto as a global; the mongodb driver's session
// UUIDs need it. (Jest polyfills this, which is why the unit tests don't.)
if (typeof globalThis.crypto === 'undefined') {
  globalThis.crypto = require('node:crypto').webcrypto
}

const assert = require('assert')
const path = require('path')
const { MongoMemoryReplSet } = require('mongodb-memory-server')
const mongoose = require('mongoose')
const IORedis = require('ioredis')

const REDIS_URL = process.env.REDIS_URL_E2E || 'redis://127.0.0.1:6379/15'

// ---- tiny test harness -----------------------------------------------------
let passed = 0
let failed = 0
const results = []

function log(msg) {
  process.stdout.write(msg + '\n')
}
async function scenario(name, fn) {
  const started = Date.now()
  try {
    await fn()
    passed++
    results.push({ name, ok: true, ms: Date.now() - started })
    log(`  ✅ ${name}  (${Date.now() - started}ms)`)
  } catch (err) {
    failed++
    results.push({ name, ok: false, ms: Date.now() - started, err: err.message })
    log(`  ❌ ${name}  (${Date.now() - started}ms)\n     ${err.message}`)
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Poll the DB until `pred(doc)` is true or timeout. Returns { doc, ms }.
async function waitFor(Model, id, pred, { timeout = 15000, interval = 100 } = {}) {
  const start = Date.now()
  for (;;) {
    const doc = await Model.findById(id)
    if (doc && pred(doc)) return { doc, ms: Date.now() - start }
    if (Date.now() - start > timeout) {
      throw new Error(`timeout after ${timeout}ms; last status=${doc && doc.status}`)
    }
    await sleep(interval)
  }
}

// ---- main ------------------------------------------------------------------
async function main() {
  log('\n▶ Automation E2E (real Redis + real BullMQ + real Mongo)\n')

  // 1. Isolated Redis DB, flushed clean so no stale delayed jobs interfere.
  const flushClient = new IORedis(REDIS_URL, { maxRetriesPerRequest: null })
  try {
    await flushClient.flushdb()
  } catch (err) {
    log(`\n✖ Cannot reach Redis at ${REDIS_URL}: ${err.message}\n  Start Redis (e.g. \`redis-server\`) and retry.\n`)
    await flushClient.quit().catch(() => {})
    process.exit(1)
  }

  // 2. Real Mongo replica set for transactions.
  const mongod = await MongoMemoryReplSet.create({ replSet: { count: 1 } })
  const uri = mongod.getUri()

  // 3. Configure env BEFORE requiring any app module, so config/queue.js and the
  //    worker see REDIS_URL and a non-'test' NODE_ENV (otherwise both no-op).
  process.env.MONGO_URI = uri
  process.env.JWT_SECRET = 'e2e'
  process.env.REDIS_URL = REDIS_URL
  process.env.NODE_ENV = 'development'
  // Auto-credit on maturity is the default (true); pin it explicitly so this
  // script is deterministic regardless of a developer's local .env.
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'true'

  await mongoose.connect(uri)

  // Require the PRODUCTION modules (now that env is set).
  const srcDir = path.join(__dirname, '..', 'src')
  const queue = require(path.join(srcDir, 'config/queue'))
  const { startInvestmentWorker } = require(path.join(srcDir, 'jobs/investmentWorker'))
  const Investment = require(path.join(srcDir, 'models/Investment'))
  const Settings = require(path.join(srcDir, 'models/Settings'))
  const Wallet = require(path.join(srcDir, 'models/Wallet'))
  const svc = require(path.join(srcDir, 'services/investmentService'))
  const mongooseTypes = mongoose.Types

  assert(queue.investmentQueue, 'queue must be live (REDIS_URL set, NODE_ENV != test)')

  // Configure a short auto-reject window we can compress against.
  const settings = await Settings.getSingleton()
  settings.autoRejectHours = 8
  settings.cycleDurationHours = 24
  await settings.save()

  // Start the REAL worker (processes auto-reject / mature / sweep jobs).
  const worker = await startInvestmentWorker()
  assert(worker, 'investment worker must start')

  let refCounter = 0
  const ref = () => `ASM-E2E${Date.now().toString(36)}${refCounter++}`

  async function makePending({ windowMs }) {
    // Back-date createdAt so the auto-reject window (autoRejectHours) expires
    // `windowMs` from now → the production delay math yields ~windowMs.
    const createdAt = new Date(Date.now() - (settings.autoRejectHours * 3600e3 - windowMs))
    const inv = await Investment.create({
      user: new mongooseTypes.ObjectId(),
      planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000,
      referenceCode: ref(), status: 'pending',
    })
    // createdAt is immutable under timestamps; set via native driver.
    await Investment.collection.updateOne({ _id: inv._id }, { $set: { createdAt } })
    return Investment.findById(inv._id)
  }

  // --- Scenario 1: auto-reject fires AFTER the window, not before ------------
  await scenario('auto-reject fires only after the window elapses (not early)', async () => {
    const windowMs = 2500
    const inv = await makePending({ windowMs })
    await queue.scheduleAutoReject(inv) // real delayed BullMQ job

    // Halfway through the window it must still be pending (no premature fire).
    await sleep(Math.floor(windowMs / 2))
    const mid = await Investment.findById(inv._id)
    assert.strictEqual(mid.status, 'pending', `expected still pending mid-window, got ${mid.status}`)

    // After the window it must become auto-rejected.
    const { doc, ms } = await waitFor(Investment, inv._id, (d) => d.status === 'rejected')
    assert.strictEqual(doc.autoRejected, true, 'autoRejected flag must be set')
    assert.match(doc.rejectionReason, /approval timeout \(8h\)/, `reason: ${doc.rejectionReason}`)
    // Fired within a reasonable band around the window end.
    const totalFromScheduleApprox = Math.floor(windowMs / 2) + ms
    assert(
      totalFromScheduleApprox >= windowMs - 500,
      `fired too early: ~${totalFromScheduleApprox}ms < window ${windowMs}ms`
    )
    log(`      → rejected ~${totalFromScheduleApprox}ms after schedule (window ${windowMs}ms)`)
  })

  // --- Scenario 2: approving cancels the pending auto-reject -----------------
  await scenario('approving a deposit cancels the auto-reject (it never fires)', async () => {
    const windowMs = 2000
    const inv = await makePending({ windowMs })
    await queue.scheduleAutoReject(inv)

    // Approve before the window — approveInvestment cancels auto-reject and
    // schedules maturity (24h out, so it won't mature during this test).
    const adminId = new mongooseTypes.ObjectId()
    await svc.approveInvestment(inv._id, adminId)

    // Wait well past the original window; it must remain active (never auto-rejected).
    await sleep(windowMs + 1500)
    const after = await Investment.findById(inv._id)
    assert.strictEqual(after.status, 'active', `expected active, got ${after.status}`)
    assert.strictEqual(after.autoRejected, false, 'must NOT be auto-rejected after approval')
    log(`      → still active after window+buffer; auto-reject correctly canceled`)
  })

  // --- Scenario 3: auto-return fires at maturity with the correct amount -----
  await scenario('auto-return fires at maturity and credits principal + return', async () => {
    const maturesInMs = 2000
    const userId = new mongooseTypes.ObjectId()
    const inv = await Investment.create({
      user: userId, planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000,
      referenceCode: ref(), status: 'active',
      startAt: new Date(), approvedAt: new Date(),
      maturesAt: new Date(Date.now() + maturesInMs),
    })
    await queue.scheduleMature(inv) // real delayed BullMQ job

    // Before maturity: still active, wallet empty.
    await sleep(Math.floor(maturesInMs / 2))
    const mid = await Investment.findById(inv._id)
    assert.strictEqual(mid.status, 'active', `expected active pre-maturity, got ${mid.status}`)
    const midWallet = await Wallet.findOne({ user: userId })
    assert(midWallet == null || midWallet.balance === 0, 'wallet must be empty before maturity')

    // After maturity: auto-credited → status 'returned', wallet = principal + return.
    const { doc } = await waitFor(Investment, inv._id, (d) => d.status === 'returned')
    assert.strictEqual(doc.walletCredited, true, 'walletCredited must be true')
    assert.strictEqual(doc.creditedAmount, 250000, `creditedAmount expected 250000, got ${doc.creditedAmount}`)
    const wallet = await Wallet.findOne({ user: userId })
    assert.strictEqual(wallet.balance, 250000, `wallet expected 250000, got ${wallet.balance}`)
    log(`      → returned; wallet credited ₹${wallet.balance / 100} (principal ₹2000 + return ₹500)`)
  })

  // --- Scenario 4: maturity credit is idempotent (no double-credit) ----------
  await scenario('re-running maturity does not double-credit the wallet', async () => {
    const userId = new mongooseTypes.ObjectId()
    const inv = await Investment.create({
      user: userId, planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000,
      referenceCode: ref(), status: 'active',
      startAt: new Date(), approvedAt: new Date(),
      maturesAt: new Date(Date.now() - 1000), // already due
    })
    await svc.runMature(inv._id) // first run: credits
    await svc.runMature(inv._id) // second run: no-op (status no longer 'active')
    const wallet = await Wallet.findOne({ user: userId })
    assert.strictEqual(wallet.balance, 250000, `wallet must be 250000 once, got ${wallet.balance}`)
    log(`      → wallet stayed ₹${wallet.balance / 100} across duplicate maturity runs`)
  })

  // ---- teardown ------------------------------------------------------------
  await worker.close()
  if (queue.investmentQueue) await queue.investmentQueue.obliterate({ force: true }).catch(() => {})
  if (queue.queueConnection) await queue.queueConnection.quit().catch(() => {})
  await flushClient.flushdb().catch(() => {})
  await flushClient.quit().catch(() => {})
  await mongoose.disconnect()
  await mongod.stop()

  log(`\n${failed === 0 ? '✅ PASS' : '❌ FAIL'} — ${passed} passed, ${failed} failed\n`)
  process.exit(failed === 0 ? 0 : 1)
}

main().catch((err) => {
  log(`\n✖ Fatal: ${err && err.stack ? err.stack : err}\n`)
  process.exit(1)
})
