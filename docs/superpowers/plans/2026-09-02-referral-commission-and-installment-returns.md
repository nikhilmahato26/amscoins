# Referral Commission + 3-Day Installment Returns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3% wallet commission to the referrer when their referred user's first deposit is approved, and replace Silver/Gold single-payout returns with a 3-day daily-installment model (Silver: 10/10/10%, Gold: 13/13/14%) plus a user-triggered early-break flow with admin approval.

**Architecture:** Feature 1 adds a `walletService.credit` call inside the existing `creditReferralIfFirst` transaction — zero new model fields, purely additive. Feature 2 adds an `installments` sub-document array on `Investment` (Approach A), schedules three BullMQ daily jobs per installment-plan investment instead of one, and adds a `requestBreak` → `approveBreak` / `rejectBreak` cycle. Backward compatibility is maintained: old Diamond investments (single-payout, no installmentPcts) continue through the existing `runMature` / `approveReturn` path.

**Tech Stack:** Node.js/Express, Mongoose/MongoDB (transactions via replica-set), BullMQ + ioredis, React 19 + TypeScript 6, Tailwind 3, shadcn/ui, react-query (TanStack)

## Global Constraints

- Node ≥ 20 (use `nvm use 22` before dev/build/lint)
- All money amounts are in **paise** (₹ × 100); never divide/multiply rupees in service code
- Backend tests: `cd server && npm test` — uses in-memory MongoDB replica set; no Redis
- Frontend dev: `cd client && npm run dev`
- TypeScript strict: `import type` for type-only imports; `noUnusedLocals` is on
- Frontend path alias: `@/*` → `client/src/*`
- Commits: **no** Co-Authored-By or Claude attribution lines

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `server/src/models/Transaction.js` | add `referral_bonus` to type enum |
| Modify | `server/src/models/Plan.js` | add `installmentPcts: [Number]` |
| Modify | `server/src/models/Investment.js` | add `installments` subdoc, `installmentPcts`, `breakRequestedAt`, extend status enum |
| Modify | `server/src/seed/seedPlans.js` | Silver 30% / Gold 40% / Diamond disabled |
| Modify | `server/src/services/referralService.js` | credit 3% bonus to referrer wallet |
| Modify | `server/src/services/investmentService.js` | createInvestment snapshots installmentPcts; approveInvestment populates installments; new functions runInstallment, approveInstallment, requestBreak, approveBreak, rejectBreak; runMature guarded |
| Modify | `server/src/config/queue.js` | add `scheduleInstallment`, `cancelInstallments`, `installmentJobId` |
| Modify | `server/src/jobs/investmentWorker.js` | handle `installment` job; sweep for due installments |
| Modify | `server/src/controllers/adminController.js` | `approveInstallment`, `approveBreak`, `rejectBreak` |
| Modify | `server/src/routes/adminRoutes.js` | wire the three new admin endpoints |
| Modify | `server/src/controllers/investmentController.js` | `requestBreak` |
| Modify | `server/src/routes/investmentRoutes.js` | `POST /:id/break` |
| Modify | `server/tests/unit/referral.service.test.js` | assert wallet credit |
| Modify | `server/tests/unit/investment.return.test.js` | installment approval tests |
| Modify | `client/src/services/api/investments.ts` | `Installment` type, extended `Investment` type, `requestBreak` API fn |
| Modify | `client/src/services/api/admin.ts` | extend `AdminInvestment`; add installment + break API fns |
| Modify | `client/src/hooks/queries.ts` | add `useRequestBreak`, `useApproveInstallment`, `useApproveBreak`, `useRejectBreak` |
| Modify | `client/src/pages/app/InvestmentsPage.tsx` | 3-day timeline on cards, break button, `break_requested` status pill |
| Create | `client/src/components/admin/investments/InstallmentsTab.tsx` | admin installment-approval UI |
| Modify | `client/src/pages/admin/AdminInvestments.tsx` | add Installments + Break Requests tabs |

---

## Task 1: Referral Commission — wallet credit on first deposit

**Files:**
- Modify: `server/src/models/Transaction.js`
- Modify: `server/src/services/referralService.js`
- Modify: `server/tests/unit/referral.service.test.js`

**Interfaces:**
- Produces: `creditReferralIfFirst(depositUser, session, investmentAmount)` — same external shape, adds optional third arg; returns `{ credited, referrerId, referralBonus? }`

- [ ] **Step 1: Write the failing tests** (add to `server/tests/unit/referral.service.test.js`)

Add imports at the top of the test file alongside existing imports:
```js
const Wallet = require('../../src/models/Wallet')
const Transaction = require('../../src/models/Transaction')
```

Append these tests after the existing ones:
```js
test('credits 3% of investment amount to referrer wallet on first deposit', async () => {
  const ref = await makeUser()
  const u = await makeUser({ referredBy: ref._id })
  await withTxn((s) => creditReferralIfFirst(u, s, 100000)) // ₹1000
  const wallet = await Wallet.findOne({ user: ref._id })
  expect(wallet.balance).toBe(3000)
  const txn = await Transaction.findOne({ user: ref._id, type: 'referral_bonus' })
  expect(txn).not.toBeNull()
  expect(txn.amount).toBe(3000)
  expect(txn.actor).toBe('system')
})

test('referral bonus is idempotent — second call never double-credits', async () => {
  const ref = await makeUser()
  const u = await makeUser({ referredBy: ref._id })
  await withTxn((s) => creditReferralIfFirst(u, s, 100000))
  const reloaded = await User.findById(u._id)
  await withTxn((s) => creditReferralIfFirst(reloaded, s, 200000))
  const wallet = await Wallet.findOne({ user: ref._id })
  expect(wallet.balance).toBe(3000) // only first call credited
})

test('no referrer — no wallet credit created', async () => {
  const u = await makeUser()
  await withTxn((s) => creditReferralIfFirst(u, s, 100000))
  const count = await Transaction.countDocuments({ type: 'referral_bonus' })
  expect(count).toBe(0)
})

test('zero investmentAmount — no wallet credit', async () => {
  const ref = await makeUser()
  const u = await makeUser({ referredBy: ref._id })
  await withTxn((s) => creditReferralIfFirst(u, s, 0))
  const wallet = await Wallet.findOne({ user: ref._id })
  expect(wallet).toBeNull()
})
```

- [ ] **Step 2: Run to confirm failure**

```bash
cd server && npm test -- --testPathPattern=referral.service
```
Expected: 4 new tests FAIL with "referral_bonus is not a valid enum value" or "received null".

- [ ] **Step 3: Add `referral_bonus` to Transaction type enum**

In `server/src/models/Transaction.js`, change line 4:
```js
// Before:
type: { type: String, enum: ['deposit', 'withdrawal', 'refund', 'adjustment', 'return'], required: true },
// After:
type: { type: String, enum: ['deposit', 'withdrawal', 'refund', 'adjustment', 'return', 'referral_bonus'], required: true },
```

- [ ] **Step 4: Update `creditReferralIfFirst` signature and add wallet credit**

Replace the entire `server/src/services/referralService.js` with:
```js
'use strict'

const User = require('../models/User')
const walletService = require('./walletService')
const { tierForCount } = require('./tierService')
const logger = require('../lib/logger').child({ service: 'referral' })

/**
 * Credit the referrer when `depositUser` completes their FIRST deposit.
 * Idempotent: guarded by the `firstDepositCredited` flag so a re-approval
 * can never double-count. Runs inside the caller's transaction `session`.
 *
 * @param {number} investmentAmount - paise amount of the deposit being approved.
 *   Used to compute the 3% referral commission. Pass 0 when amount is unknown.
 */
async function creditReferralIfFirst(depositUser, session, investmentAmount = 0) {
  if (depositUser.firstDepositCredited) {
    logger.debug('Referral skip — already credited for this user', {
      depositUserId: depositUser._id,
    })
    return { credited: false, referrerId: null }
  }

  // Atomically flip the flag — only the first caller wins the update.
  const flipped = await User.findOneAndUpdate(
    { _id: depositUser._id, firstDepositCredited: false },
    { $set: { firstDepositCredited: true } },
    { returnDocument: 'after', session }
  )
  if (!flipped) {
    logger.debug('Referral skip — concurrent approval already flipped the flag', {
      depositUserId: depositUser._id,
    })
    return { credited: false, referrerId: null }
  }

  if (!flipped.referredBy) {
    logger.debug('Referral skip — user has no referrer', { depositUserId: depositUser._id })
    return { credited: true, referrerId: null }
  }

  const referrer = await User.findOneAndUpdate(
    { _id: flipped.referredBy },
    { $inc: { referralCount: 1 } },
    { returnDocument: 'after', session }
  )

  let tierChange = false
  let referralBonus = 0

  if (referrer) {
    const newTier = tierForCount(referrer.referralCount)
    if (newTier !== referrer.tier) {
      referrer.tier = newTier
      await referrer.save({ session })
      tierChange = true
    }

    // Credit 3% of the deposit amount to the referrer's wallet.
    if (investmentAmount > 0) {
      referralBonus = Math.round((investmentAmount * 3) / 100)
      if (referralBonus > 0) {
        await walletService.credit(
          referrer._id,
          referralBonus,
          {
            type: 'referral_bonus',
            actor: 'system',
            note: `Referral bonus`,
            ref: depositUser._id,
          },
          session
        )
      }
    }

    logger.info('Referral credited', {
      referrerId: referrer._id,
      depositUserId: depositUser._id,
      newReferralCount: referrer.referralCount,
      tierChange,
      newTier: referrer.tier,
      referralBonus,
    })
  }

  return { credited: true, referrerId: flipped.referredBy, referralBonus }
}

module.exports = { creditReferralIfFirst }
```

- [ ] **Step 5: Pass `inv.amount` to `creditReferralIfFirst` in `investmentService.js`**

In `server/src/services/investmentService.js`, inside `approveInvestment`'s transaction, find:
```js
const referralResult = user
  ? await creditReferralIfFirst(user, session)
  : { credited: false, referrerId: null }
```
Replace with:
```js
const referralResult = user
  ? await creditReferralIfFirst(user, session, inv.amount)
  : { credited: false, referrerId: null }
```

- [ ] **Step 6: Run tests and confirm green**

```bash
cd server && npm test -- --testPathPattern=referral.service
```
Expected: all tests PASS.

- [ ] **Step 7: Commit**

```bash
git add server/src/models/Transaction.js server/src/services/referralService.js server/src/services/investmentService.js server/tests/unit/referral.service.test.js
git commit -m "feat(referral): credit 3% wallet bonus on first deposit approval"
```

---

## Task 2: Plan model and seed update

**Files:**
- Modify: `server/src/models/Plan.js`
- Modify: `server/src/seed/seedPlans.js`

**Interfaces:**
- Produces: `plan.installmentPcts` — `number[]`, e.g. `[10, 10, 10]` for Silver; empty array for non-installment plans

- [ ] **Step 1: Add `installmentPcts` to Plan schema**

In `server/src/models/Plan.js`, add the field before the closing `}` of the schema definition:
```js
const planSchema = new Schema(
  {
    key: { type: String, enum: ['silver', 'gold', 'diamond'], unique: true, required: true },
    name: { type: String, required: true },
    returnPct: { type: Number, required: true },
    installmentPcts: { type: [Number], default: [] }, // daily breakdown; empty = single-payout
    minInvest: { type: Number, required: true }, // paise
    maxInvest: { type: Number, required: true }, // paise
    unlockReferrals: { type: Number, required: true },
    durationHours: { type: Number, default: 24 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)
```

- [ ] **Step 2: Update seed file**

Replace the `plans` array in `server/src/seed/seedPlans.js` with:
```js
const plans = [
  {
    key: 'silver',
    name: 'Silver',
    returnPct: 30,
    installmentPcts: [10, 10, 10],
    minInvest: 100000,   // ₹1,000
    maxInvest: 1000000,  // ₹10,000
    unlockReferrals: 0,
    durationHours: 72,
  },
  {
    key: 'gold',
    name: 'Gold',
    returnPct: 40,
    installmentPcts: [13, 13, 14],
    minInvest: 300000,    // ₹3,000
    maxInvest: 30000000,  // ₹3,00,000
    unlockReferrals: 21,
    durationHours: 72,
  },
  {
    key: 'diamond',
    name: 'Diamond',
    returnPct: 40,
    installmentPcts: [],
    minInvest: 500000,    // ₹5,000
    maxInvest: 50000000,  // ₹5,00,000
    unlockReferrals: 52,
    durationHours: 24,
    active: false,        // disabled — no new investments allowed
  },
]
```

- [ ] **Step 3: Run the seed in the local dev database**

```bash
cd server && npm run seed
```
Expected: output showing silver (30%), gold (40%), diamond (disabled) upserted.

- [ ] **Step 4: Commit**

```bash
git add server/src/models/Plan.js server/src/seed/seedPlans.js
git commit -m "feat(plans): add installmentPcts field; Silver 30%, Gold 40%, Diamond disabled"
```

---

## Task 3: Investment model — installments subdoc + break fields

**Files:**
- Modify: `server/src/models/Investment.js`

**Interfaces:**
- Produces: `investment.installments[]` — each entry: `{ day, pct, amount, status, maturesAt, creditedAt?, creditedBy? }`
- Produces: `investment.installmentPcts` — snapshotted from plan at creation, used in approveInvestment
- Produces: `investment.breakRequestedAt` — Date or null
- Produces: `investment.status` — now includes `'break_requested'`

- [ ] **Step 1: Replace `server/src/models/Investment.js`**

```js
const { Schema, model } = require('mongoose')

const installmentSchema = new Schema(
  {
    day:        { type: Number, required: true },  // 1, 2, or 3
    pct:        { type: Number, required: true },  // e.g. 10 for Silver day 1
    amount:     { type: Number, required: true },  // paise
    status:     { type: String, enum: ['scheduled', 'available', 'paid'], default: 'scheduled' },
    maturesAt:  { type: Date, required: true },
    creditedAt: { type: Date },
    creditedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // null = system auto-pay
  },
  { _id: false }
)

const investmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planKey: { type: String, enum: ['silver', 'gold', 'diamond'], required: true },
    amount: { type: Number, required: true }, // paise
    returnPct: { type: Number, required: true },
    // Snapshotted from Plan.installmentPcts at deposit creation time.
    // Empty array means single-payout (old Diamond or legacy) — uses runMature path.
    installmentPcts: { type: [Number], default: [] },
    expectedReturn: { type: Number, required: true }, // paise
    referenceCode: { type: String, required: true, unique: true },
    referralCodeUsed: { type: String, default: null },
    isFirstDeposit: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'active', 'matured', 'returned', 'rejected', 'deleted', 'break_requested'],
      default: 'pending',
    },
    startAt: { type: Date },
    maturesAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    walletCredited: { type: Boolean, default: false },
    maturedAt: { type: Date },
    creditedAmount: { type: Number, default: 0 }, // paise actually paid to wallet (accumulated)
    returnDecidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    returnDecidedAt: { type: Date },
    returnRejectionReason: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    autoRejected: { type: Boolean, default: false },
    autoApproved: { type: Boolean, default: false },
    paymentNotified: { type: Boolean, default: false },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
    // Installment-plan fields
    installments: { type: [installmentSchema], default: [] },
    breakRequestedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

module.exports = model('Investment', investmentSchema)
```

- [ ] **Step 2: Verify no existing tests break**

```bash
cd server && npm test
```
Expected: all existing tests pass (new optional fields have defaults so old test fixtures still work).

- [ ] **Step 3: Commit**

```bash
git add server/src/models/Investment.js
git commit -m "feat(investment): add installments subdoc, installmentPcts snapshot, breakRequestedAt"
```

---

## Task 4: investmentService — snapshot installmentPcts on create, populate installments on approve

**Files:**
- Modify: `server/src/services/investmentService.js`

**Interfaces:**
- Consumes: `plan.installmentPcts` (from Task 2), `inv.installmentPcts` (from Task 3)
- Produces: populated `inv.installments[]` after approval; schedules installment jobs (queue API from Task 5 — add the queue calls even if the functions don't exist yet; they'll be harmlessly no-ops until Task 5 adds them)

- [ ] **Step 1: Snapshot `installmentPcts` in `createInvestment`**

In `server/src/services/investmentService.js`, inside `createInvestment`, find the `Investment.create({...})` call and add `installmentPcts`:
```js
const investment = await Investment.create({
  user: user._id,
  planKey,
  amount,
  returnPct: plan.returnPct,
  installmentPcts: plan.installmentPcts || [],   // ← add this line
  expectedReturn: Math.round((amount * plan.returnPct) / 100),
  referenceCode: await uniqueRef(),
  referralCodeUsed: isFirstDeposit && referralCode ? referralCode : null,
  isFirstDeposit,
  status: 'pending',
})
```

- [ ] **Step 2: Populate installments inside `approveInvestment` transaction**

Inside `approveInvestment`'s `session.withTransaction` callback, replace:
```js
inv.maturesAt = new Date(now.getTime() + settings.cycleDurationHours * 3600 * 1000)
```
with:
```js
if (inv.installmentPcts && inv.installmentPcts.length > 0) {
  // Build installments so their amounts sum exactly to expectedReturn.
  const pcts = inv.installmentPcts
  const partialAmounts = pcts.slice(0, -1).map((pct) => Math.round((inv.amount * pct) / 100))
  const lastAmount = inv.expectedReturn - partialAmounts.reduce((s, a) => s + a, 0)
  inv.installments = pcts.map((pct, i) => ({
    day: i + 1,
    pct,
    amount: i < pcts.length - 1 ? partialAmounts[i] : lastAmount,
    status: 'scheduled',
    maturesAt: new Date(now.getTime() + (i + 1) * 24 * 3600 * 1000),
  }))
  // maturesAt on the investment = when the last installment fires
  inv.maturesAt = inv.installments[inv.installments.length - 1].maturesAt
} else {
  inv.maturesAt = new Date(now.getTime() + settings.cycleDurationHours * 3600 * 1000)
}
```

- [ ] **Step 3: Schedule installment jobs (or mature job) after the transaction**

In the post-transaction block inside `approveInvestment`, replace:
```js
await queue.scheduleMature(result.inv)
```
with:
```js
if (result.inv.installmentPcts && result.inv.installmentPcts.length > 0) {
  for (const inst of result.inv.installments) {
    await queue.scheduleInstallment(result.inv, inst.day)
  }
} else {
  await queue.scheduleMature(result.inv)
}
```

- [ ] **Step 4: Guard `runMature` from incorrectly firing on installment investments**

In `server/src/services/investmentService.js`, replace `runMature`:
```js
async function runMature(investmentId) {
  // Guard: installment-based investments never use this path — they are handled
  // by runInstallment. An empty installmentPcts means single-payout (old Diamond
  // or legacy).
  const inv = await Investment.findOneAndUpdate(
    {
      _id: investmentId,
      status: 'active',
      $or: [
        { installmentPcts: { $size: 0 } },
        { installmentPcts: { $exists: false } },
      ],
    },
    { $set: { status: 'matured', maturedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) return null
  await cacheDel('cache:admin:stats', `cache:dashboard:${inv.user}`)
  logger.info('Investment matured', { investmentId })

  const settings = await Settings.getSingleton()
  if (env.WALLET_AUTO_CREDIT_ON_MATURITY && settings.autoPayEnabled) {
    await approveReturn(inv._id, null)
  }
  return await Investment.findById(investmentId)
}
```

- [ ] **Step 5: Verify existing tests still pass**

```bash
cd server && npm test
```
Expected: all existing tests pass.

- [ ] **Step 6: Commit**

```bash
git add server/src/services/investmentService.js
git commit -m "feat(investment): snapshot installmentPcts on create; populate installments on approve"
```

---

## Task 5: Queue and Worker — installment job scheduling + sweep

**Files:**
- Modify: `server/src/config/queue.js`
- Modify: `server/src/jobs/investmentWorker.js`

**Interfaces:**
- Produces: `queue.scheduleInstallment(inv, day)`, `queue.cancelInstallments(investmentId)`, `queue.installmentJobId(id, day)`
- Produces: worker handles `job.name === 'installment'` → calls `svc.runInstallment`

- [ ] **Step 1: Add installment job helpers to `server/src/config/queue.js`**

After the existing `const matureJobId = (id) => ...` line, add:
```js
const installmentJobId = (id, day) => `installment-${id}-day-${day}`
```

After the existing `scheduleMature` function, add:
```js
async function scheduleInstallment(inv, day) {
  if (!investmentQueue) return
  const installment = inv.installments.find((i) => i.day === day)
  if (!installment) return
  const delay = Math.max(0, new Date(installment.maturesAt).getTime() - Date.now())
  await investmentQueue.add(
    'installment',
    { investmentId: String(inv._id), day },
    { delay, jobId: installmentJobId(inv._id, day), removeOnComplete: true, removeOnFail: 100 }
  )
}

async function cancelInstallments(id) {
  if (!investmentQueue) return
  for (const day of [1, 2, 3]) {
    const job = await investmentQueue.getJob(installmentJobId(id, day))
    if (job) await job.remove()
  }
}
```

Add `scheduleInstallment`, `cancelInstallments`, and `installmentJobId` to the `module.exports`:
```js
module.exports = {
  investmentQueue,
  queueConnection,
  scheduleAutoReject,
  scheduleAutoDeposit,
  scheduleMature,
  scheduleInstallment,
  cancelAutoReject,
  cancelAutoDeposit,
  cancelMature,
  cancelInstallments,
  QUEUE_NAME,
  PREFIX,
  autoRejectJobId,
  autoDepositJobId,
  matureJobId,
  installmentJobId,
}
```

- [ ] **Step 2: Add `installment` job handler to the worker**

In `server/src/jobs/investmentWorker.js`, inside `startInvestmentWorker`, find the worker job dispatcher:
```js
worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.name === 'auto-reject') return svc.runAutoReject(job.data.investmentId)
    if (job.name === 'auto-deposit') return svc.runAutoDeposit(job.data.investmentId)
    if (job.name === 'mature') return svc.runMature(job.data.investmentId)
    if (job.name === 'sweep') return runSweep()
  },
```
Add the `installment` case:
```js
    if (job.name === 'installment') return svc.runInstallment(job.data.investmentId, job.data.day)
```
so the block becomes:
```js
    async (job) => {
      if (job.name === 'auto-reject')  return svc.runAutoReject(job.data.investmentId)
      if (job.name === 'auto-deposit') return svc.runAutoDeposit(job.data.investmentId)
      if (job.name === 'mature')       return svc.runMature(job.data.investmentId)
      if (job.name === 'installment')  return svc.runInstallment(job.data.investmentId, job.data.day)
      if (job.name === 'sweep')        return runSweep()
    },
```

- [ ] **Step 3: Add installment sweep to `runSweep`**

In `runSweep`, after the existing `const due = await Investment.find(...)` block (the one that calls `svc.runMature`), add:
```js
  // Safety-net: catch any installment that fired while the server was down.
  const invWithDueInstallments = await Investment.find({
    status: 'active',
    installments: {
      $elemMatch: { status: 'scheduled', maturesAt: { $lte: new Date(now) } },
    },
  }).select('_id installments')

  let installmentsTriggered = 0
  for (const inv of invWithDueInstallments) {
    for (const inst of inv.installments) {
      if (inst.status === 'scheduled' && inst.maturesAt <= new Date(now)) {
        if (await svc.runInstallment(inv._id, inst.day)) installmentsTriggered++
      }
    }
  }

  if (installmentsTriggered) {
    logger.info('Sweep triggered overdue installments', { installmentsTriggered })
  }
```

- [ ] **Step 4: Commit**

```bash
git add server/src/config/queue.js server/src/jobs/investmentWorker.js
git commit -m "feat(queue): add installment job scheduling and sweep safety-net"
```

---

## Task 6: investmentService — runInstallment, approveInstallment, requestBreak, approveBreak, rejectBreak

**Files:**
- Modify: `server/src/services/investmentService.js`
- Modify: `server/tests/unit/investment.return.test.js`

**Interfaces:**
- Consumes: `queue.cancelInstallments` (from Task 5)
- Produces: `runInstallment(investmentId, day)`, `approveInstallment(investmentId, day, adminId)`, `requestBreak(investmentId, userId)`, `approveBreak(investmentId, adminId)`, `rejectBreak(investmentId, adminId)`

- [ ] **Step 1: Write failing tests for installment flow**

Add to `server/tests/unit/investment.return.test.js` — append after the existing tests. First add the helper for installment investments:
```js
const { approveInstallment, requestBreak, approveBreak, rejectBreak } = require('../../src/services/investmentService')
const User = require('../../src/models/User')
const { generateUniqueCode } = require('../../src/services/referralCode')

async function makeUser() {
  const code = await generateUniqueCode()
  return User.create({ name: 'T', email: `t${Math.random()}@b.com`, passwordHash: 'x', referralCode: code })
}

async function installmentInv(extra = {}) {
  const user = await makeUser()
  return Investment.create({
    user: user._id,
    planKey: 'silver',
    amount: 100000,          // ₹1,000
    returnPct: 30,
    installmentPcts: [10, 10, 10],
    expectedReturn: 30000,   // ₹300
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'active',
    startAt: new Date(),
    installments: [
      { day: 1, pct: 10, amount: 10000, status: 'available', maturesAt: new Date(Date.now() - 1000) },
      { day: 2, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 86400000) },
      { day: 3, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 172800000) },
    ],
    ...extra,
  })
}

test('approveInstallment (day 1) credits installment amount, investment stays active', async () => {
  const inv = await installmentInv()
  await approveInstallment(inv._id, 1, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(10000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('active')
  expect(fresh.installments[0].status).toBe('paid')
  expect(fresh.creditedAmount).toBe(10000)
})

test('approveInstallment (day 3) credits installment + principal and marks returned', async () => {
  const inv = await installmentInv({
    installments: [
      { day: 1, pct: 10, amount: 10000, status: 'paid',      maturesAt: new Date(Date.now() - 172800000) },
      { day: 2, pct: 10, amount: 10000, status: 'paid',      maturesAt: new Date(Date.now() - 86400000) },
      { day: 3, pct: 10, amount: 10000, status: 'available', maturesAt: new Date(Date.now() - 1000) },
    ],
    creditedAmount: 20000, // days 1+2 already credited
  })
  await approveInstallment(inv._id, 3, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  // principal (100000) + day-3 installment (10000)
  expect(w.balance).toBe(110000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
  expect(fresh.creditedAmount).toBe(130000) // 20000 + 10000 + 100000
})

test('approveInstallment rejects when already paid', async () => {
  const inv = await installmentInv({
    installments: [
      { day: 1, pct: 10, amount: 10000, status: 'paid', maturesAt: new Date(Date.now() - 1000) },
      { day: 2, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 86400000) },
      { day: 3, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 172800000) },
    ],
  })
  await expect(approveInstallment(inv._id, 1, adminId)).rejects.toMatchObject({ statusCode: 409 })
})

test('requestBreak sets status to break_requested', async () => {
  const inv = await installmentInv()
  await requestBreak(inv._id, inv.user)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('break_requested')
  expect(fresh.breakRequestedAt).not.toBeNull()
})

test('approveBreak credits available installments + principal and marks returned', async () => {
  const inv = await installmentInv({
    status: 'break_requested',
    breakRequestedAt: new Date(),
    installments: [
      { day: 1, pct: 10, amount: 10000, status: 'available', maturesAt: new Date(Date.now() - 1000) },
      { day: 2, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 86400000) },
      { day: 3, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 172800000) },
    ],
  })
  await approveBreak(inv._id, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  // day 1 (available, 10000) + principal (100000) — days 2+3 not yet due
  expect(w.balance).toBe(110000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
})

test('rejectBreak restores active status', async () => {
  const inv = await installmentInv({ status: 'break_requested', breakRequestedAt: new Date() })
  await rejectBreak(inv._id, adminId)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('active')
  expect(fresh.breakRequestedAt).toBeNull()
})
```

- [ ] **Step 2: Run to confirm new tests fail**

```bash
cd server && npm test -- --testPathPattern=investment.return
```
Expected: the 6 new tests FAIL with "approveInstallment is not a function" etc.

- [ ] **Step 3: Implement `runInstallment`**

Add to `server/src/services/investmentService.js` (before the `module.exports` line):
```js
async function runInstallment(investmentId, day) {
  // Mark the installment 'available'. The atomic positional update ensures only
  // the first caller wins (subsequent calls find no matching 'scheduled' entry).
  const inv = await Investment.findOneAndUpdate(
    {
      _id: investmentId,
      status: 'active',
      installments: { $elemMatch: { day, status: 'scheduled' } },
    },
    { $set: { 'installments.$[el].status': 'available' } },
    {
      arrayFilters: [{ 'el.day': day }],
      returnDocument: 'after',
    }
  )
  if (!inv) return null // already processed or wrong state

  await cacheDel(`cache:admin:stats`, `cache:dashboard:${inv.user}`)
  logger.info('Installment available', { investmentId, day })

  const settings = await Settings.getSingleton()
  if (env.WALLET_AUTO_CREDIT_ON_MATURITY && settings.autoPayEnabled) {
    await approveInstallment(investmentId, day, null)
  }
  return Investment.findById(investmentId)
}
```

- [ ] **Step 4: Implement `approveInstallment`**

Add to `server/src/services/investmentService.js`:
```js
async function approveInstallment(investmentId, day, adminId) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')

      const instIdx = inv.installments.findIndex((i) => i.day === day)
      if (instIdx === -1) throw new ApiError(404, `Day ${day} installment not found`)
      const installment = inv.installments[instIdx]
      if (installment.status === 'paid')      throw new ApiError(409, 'Installment already paid')
      if (installment.status === 'scheduled') throw new ApiError(409, 'Installment not yet available')

      // Credit this day's return amount.
      await walletService.credit(
        inv.user,
        installment.amount,
        {
          type: 'return',
          actor: adminId ? 'admin' : 'system',
          note: `Day ${day} return ${inv.referenceCode}`,
          ref: inv._id,
        },
        session
      )

      inv.installments[instIdx].status = 'paid'
      inv.installments[instIdx].creditedAt = new Date()
      inv.installments[instIdx].creditedBy = adminId || null
      inv.creditedAmount = (inv.creditedAmount || 0) + installment.amount

      // Check if this was the last unpaid installment.
      const isLastInstallment = inv.installments.every(
        (i) => i.day === day || i.status === 'paid'
      )
      if (isLastInstallment) {
        // Credit principal back and close the investment.
        await walletService.credit(
          inv.user,
          inv.amount,
          {
            type: 'deposit',
            actor: adminId ? 'admin' : 'system',
            note: `Principal ${inv.referenceCode}`,
            ref: inv._id,
          },
          session
        )
        inv.creditedAmount += inv.amount
        inv.walletCredited = true
        inv.status = 'returned'
        inv.returnDecidedBy = adminId || null
        inv.returnDecidedAt = new Date()
      }

      inv.markModified('installments')
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await cacheDel(
        'cache:admin:stats',
        `cache:dashboard:${updated.user}`,
        `cache:wallet:${updated.user}`
      )
      logger.info('Installment approved', { investmentId, day, adminId })
    }
    return updated
  } finally {
    session.endSession()
  }
}
```

- [ ] **Step 5: Implement `requestBreak`**

Add to `server/src/services/investmentService.js`:
```js
async function requestBreak(investmentId, userId) {
  const inv = await Investment.findOneAndUpdate(
    { _id: investmentId, user: userId, status: 'active' },
    { $set: { status: 'break_requested', breakRequestedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) throw new ApiError(409, 'Investment is not active or not found')
  await cacheDel('cache:admin:stats', `cache:dashboard:${userId}`)
  logger.info('Break requested', { investmentId, userId })
  return inv
}
```

- [ ] **Step 6: Implement `approveBreak`**

Add to `server/src/services/investmentService.js`:
```js
async function approveBreak(investmentId, adminId) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'break_requested') throw new ApiError(409, 'No break request pending')

      const breakAt = inv.breakRequestedAt || new Date()
      let credited = inv.creditedAmount || 0

      // Credit installments that had actually matured by the time of the break request.
      for (let i = 0; i < inv.installments.length; i++) {
        const inst = inv.installments[i]
        if (inst.status !== 'paid' && (inst.maturesAt <= breakAt || inst.status === 'available')) {
          await walletService.credit(
            inv.user,
            inst.amount,
            {
              type: 'return',
              actor: 'admin',
              note: `Day ${inst.day} return (break) ${inv.referenceCode}`,
              ref: inv._id,
            },
            session
          )
          inv.installments[i].status = 'paid'
          inv.installments[i].creditedAt = new Date()
          inv.installments[i].creditedBy = adminId
          credited += inst.amount
        }
      }

      // Always credit principal on break.
      await walletService.credit(
        inv.user,
        inv.amount,
        {
          type: 'deposit',
          actor: 'admin',
          note: `Principal (break) ${inv.referenceCode}`,
          ref: inv._id,
        },
        session
      )
      credited += inv.amount

      inv.markModified('installments')
      inv.status = 'returned'
      inv.walletCredited = true
      inv.creditedAmount = credited
      inv.returnDecidedBy = adminId
      inv.returnDecidedAt = new Date()
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await queue.cancelInstallments(updated._id)
      await cacheDel(
        'cache:admin:stats',
        `cache:dashboard:${updated.user}`,
        `cache:wallet:${updated.user}`
      )
      logger.info('Break approved', { investmentId, adminId, credited: updated.creditedAmount })
    }
    return updated
  } finally {
    session.endSession()
  }
}
```

- [ ] **Step 7: Implement `rejectBreak`**

Add to `server/src/services/investmentService.js`:
```js
async function rejectBreak(investmentId, adminId) {
  const inv = await Investment.findOneAndUpdate(
    { _id: investmentId, status: 'break_requested' },
    { $set: { status: 'active', breakRequestedAt: null } },
    { returnDocument: 'after' }
  )
  if (!inv) throw new ApiError(409, 'No break request pending')
  logger.info('Break rejected', { investmentId, adminId })
  return inv
}
```

- [ ] **Step 8: Export new functions**

In `server/src/services/investmentService.js`, add the new functions to `module.exports`:
```js
module.exports = {
  getDepositGate, createInvestment, notifyPaymentSubmitted,
  approveInvestment, rejectInvestment,
  approveReturn, rejectReturn,
  approvePayout, rejectPayout,
  deleteInvestment,
  runAutoReject, runAutoDeposit, runMature,
  runInstallment, approveInstallment,
  requestBreak, approveBreak, rejectBreak,
  bulkApproveInvestments, bulkRejectInvestments,
  bulkApproveReturns, bulkRejectReturns,
}
```

- [ ] **Step 9: Run tests and confirm green**

```bash
cd server && npm test -- --testPathPattern=investment.return
```
Expected: all tests PASS (including the 6 new ones).

```bash
cd server && npm test
```
Expected: full suite passes.

- [ ] **Step 10: Commit**

```bash
git add server/src/services/investmentService.js server/tests/unit/investment.return.test.js
git commit -m "feat(investment): runInstallment, approveInstallment, requestBreak, approveBreak, rejectBreak"
```

---

## Task 7: Admin and user API — wire new endpoints

**Files:**
- Modify: `server/src/controllers/adminController.js`
- Modify: `server/src/routes/adminRoutes.js`
- Modify: `server/src/controllers/investmentController.js`
- Modify: `server/src/routes/investmentRoutes.js`

- [ ] **Step 1: Add admin controller handlers**

Add to `server/src/controllers/adminController.js` (before `module.exports`):
```js
const approveInstallment = asyncHandler(async (req, res) => {
  const day = Number(req.params.day)
  if (!Number.isInteger(day) || day < 1 || day > 3) {
    return res.status(400).json({ message: 'day must be 1, 2, or 3' })
  }
  res.json(await invSvc.approveInstallment(req.params.id, day, req.user._id))
})

const approveBreak = asyncHandler(async (req, res) =>
  res.json(await invSvc.approveBreak(req.params.id, req.user._id))
)

const rejectBreak = asyncHandler(async (req, res) =>
  res.json(await invSvc.rejectBreak(req.params.id, req.user._id))
)
```

Add the three names to the `module.exports` of `adminController.js`:
```js
module.exports = {
  // ... existing exports ...
  approveInstallment,
  approveBreak,
  rejectBreak,
}
```

- [ ] **Step 2: Register admin routes**

In `server/src/routes/adminRoutes.js`, add after the existing `router.delete('/investments/:id', c.deleteInvestment)` line:
```js
router.post('/investments/:id/installments/:day/approve', c.approveInstallment)
router.post('/investments/:id/approve-break', c.approveBreak)
router.post('/investments/:id/reject-break', c.rejectBreak)
```

- [ ] **Step 3: Add `requestBreak` to investment controller**

Add to `server/src/controllers/investmentController.js`:
```js
const { requestBreak: requestBreakSvc } = require('../services/investmentService')

const requestBreak = asyncHandler(async (req, res) =>
  res.json(await requestBreakSvc(req.params.id, req.user._id))
)
```

Add `requestBreak` to `module.exports` of `investmentController.js`.

- [ ] **Step 4: Register user break route**

In `server/src/routes/investmentRoutes.js`, add after the existing `router.post('/:id/notify', ...)` line:
```js
router.post('/:id/break', auth, c.requestBreak)
```

- [ ] **Step 5: Smoke-test the routes with curl (dev server must be running)**

```bash
# In one terminal:
cd server && npm run dev

# In another — replace TOKEN and ID with real values from dev DB:
curl -X POST http://localhost:4000/api/investments/SOME_ACTIVE_ID/break \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json"
# Expected: 200 with investment at status: break_requested

curl -X POST http://localhost:4000/api/admin/investments/SOME_ID/approve-break \
  -H "Authorization: Bearer ADMIN_TOKEN"
# Expected: 200 with status: returned
```

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/adminController.js server/src/routes/adminRoutes.js server/src/controllers/investmentController.js server/src/routes/investmentRoutes.js
git commit -m "feat(api): installment approve, approve/reject break endpoints"
```

---

## Task 8: Frontend — types, API functions, React Query hooks

**Files:**
- Modify: `client/src/services/api/investments.ts`
- Modify: `client/src/services/api/admin.ts`
- Modify: `client/src/hooks/queries.ts`

- [ ] **Step 1: Extend `client/src/services/api/investments.ts`**

Replace the file with:
```ts
import { apiFetch } from '@/lib/api'
import type { Tier } from '@/types'

export interface Installment {
  day: number
  pct: number
  amount: number // paise
  status: 'scheduled' | 'available' | 'paid'
  maturesAt: string
  creditedAt?: string
}

export interface Investment {
  _id: string
  planKey: Tier
  amount: number // paise
  returnPct: number
  installmentPcts: number[]
  expectedReturn: number // paise
  referenceCode: string
  status: 'pending' | 'active' | 'matured' | 'returned' | 'rejected' | 'deleted' | 'break_requested'
  installments?: Installment[]
  breakRequestedAt?: string
  creditedAmount?: number
  startAt?: string
  maturesAt?: string
  createdAt: string
}

export interface CreateInvestmentInput {
  planKey: Tier
  amount: number
  referralCode?: string
}

export const createInvestment = (input: CreateInvestmentInput) =>
  apiFetch<{ investment: Investment; telegramLink: string; whatsappLink: string }>('/investments', { method: 'POST', body: input })

export type DepositGate =
  | { status: 'open' }
  | { status: 'pending'; pendingInvestmentId: string; since: string }
  | { status: 'cooldown'; cooldownUntil: string }

export const getDepositGate = () => apiFetch<DepositGate>('/investments/deposit-gate')

export const notifyPayment = (id: string) =>
  apiFetch<{ investment: Investment; telegramLink: string; whatsappLink: string }>(`/investments/${id}/notify`, { method: 'POST' })

export const getInvestments = () => apiFetch<Investment[]>('/investments')

export const getInvestment = (id: string) => apiFetch<Investment>(`/investments/${id}`)

export const requestBreak = (id: string) =>
  apiFetch<Investment>(`/investments/${id}/break`, { method: 'POST' })
```

- [ ] **Step 2: Extend `client/src/services/api/admin.ts`**

After the existing `export const deleteInvestment` line, add:
```ts
export const approveInstallment = (id: string, day: number) =>
  apiFetch<AdminInvestment>(`/admin/investments/${id}/installments/${day}/approve`, { method: 'POST' })

export const approveBreak = (id: string) =>
  apiFetch<AdminInvestment>(`/admin/investments/${id}/approve-break`, { method: 'POST' })

export const rejectBreak = (id: string) =>
  apiFetch<AdminInvestment>(`/admin/investments/${id}/reject-break`, { method: 'POST' })
```

Also extend the `AdminInvestment` type to include installment fields:
```ts
export type AdminInvestment = Omit<Investment, 'planKey' | 'status'> & {
  planKey: Tier
  status: 'pending' | 'active' | 'matured' | 'returned' | 'rejected' | 'deleted' | 'break_requested'
  creditedAmount?: number
  installments?: import('./investments').Installment[]
  breakRequestedAt?: string
  user: PopulatedRef
}
```

- [ ] **Step 3: Add hooks to `client/src/hooks/queries.ts`**

Add the required import at the top of queries.ts (alongside existing admin imports):
```ts
import { approveInstallment, approveBreak, rejectBreak } from '@/services/api/admin'
import { requestBreak } from '@/services/api/investments'
```

Add after the existing `useResolveSupport` hook:
```ts
export const useApproveInstallment = () =>
  useAdminMutation(
    (id: string, day: number) => approveInstallment(id, day),
    [['admin', 'investments'], ['admin', 'stats']]
  )

export const useApproveBreak = () =>
  useAdminMutation((id: string) => approveBreak(id), [['admin', 'investments'], ['admin', 'stats']])

export const useRejectBreak = () =>
  useAdminMutation((id: string) => rejectBreak(id), [['admin', 'investments'], ['admin', 'stats']])
```

For the user-side break mutation, add (the `useMutation`/`useQueryClient` imports are already present in queries.ts from existing mutations — do not re-import):
```ts
export function useRequestBreak() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => requestBreak(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['investments'] }),
  })
}
```

- [ ] **Step 4: Build to check types**

```bash
cd client && npm run build
```
Expected: no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/services/api/investments.ts client/src/services/api/admin.ts client/src/hooks/queries.ts
git commit -m "feat(client): Installment type, requestBreak/approveBreak API, React Query hooks"
```

---

## Task 9: Frontend user — 3-day timeline + break button on InvestmentsPage

**Files:**
- Modify: `client/src/pages/app/InvestmentsPage.tsx`

- [ ] **Step 1: Add `break_requested` to the status config and tab filter**

In `client/src/pages/app/InvestmentsPage.tsx`, in the `STATUS_CONFIG` object, add:
```ts
break_requested: {
  label: 'Break Pending',
  icon: Clock,
  cls: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-800/30',
  iconCls: 'text-orange-500',
},
```

In `matchesTab`, update the `'active'` case:
```ts
if (tab === 'active') return inv.status === 'active' || inv.status === 'matured' || inv.status === 'break_requested'
```

- [ ] **Step 2: Add an `InstallmentTimeline` component inside the file**

Add this component near the top of InvestmentsPage.tsx (after imports):
```tsx
import { useRequestBreak } from '@/hooks/queries'
import type { Installment } from '@/services/api/investments'

function InstallmentTimeline({
  installments,
  investmentId,
  status,
}: {
  installments: Installment[]
  investmentId: string
  status: string
}) {
  const breakMutation = useRequestBreak()
  const canBreak =
    status === 'active' &&
    installments.some((i) => i.status === 'available' || i.status === 'paid')

  return (
    <div className="mt-3 space-y-1.5">
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Daily returns</p>
      <div className="flex gap-2">
        {installments.map((inst) => (
          <div
            key={inst.day}
            className={cn(
              'flex-1 rounded-lg border px-2 py-1.5 text-center text-[11px] font-semibold',
              inst.status === 'paid'
                ? 'border-asm-green-tint bg-asm-green-tint text-asm-greenInk'
                : inst.status === 'available'
                  ? 'border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400'
                  : 'border-border bg-muted/40 text-muted-foreground'
            )}
          >
            <div>Day {inst.day}</div>
            <div>{inst.pct}%</div>
            <div className="mt-0.5 text-[10px] font-normal opacity-70">
              {inst.status === 'paid' ? 'Paid' : inst.status === 'available' ? 'Ready' : 'Pending'}
            </div>
          </div>
        ))}
      </div>
      {canBreak && (
        <button
          onClick={() => breakMutation.mutate(investmentId)}
          disabled={breakMutation.isPending}
          className="mt-1 w-full rounded-lg border border-orange-200 bg-orange-50 py-1.5 text-[12px] font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50 dark:border-orange-800/30 dark:bg-orange-950/30 dark:text-orange-400"
        >
          {breakMutation.isPending ? 'Requesting…' : 'Break investment (take principal now)'}
        </button>
      )}
      {status === 'break_requested' && (
        <p className="text-center text-[11px] text-orange-600 dark:text-orange-400">
          Break request pending admin review
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Render `InstallmentTimeline` inside the investment card**

Find the section of the investment card JSX that renders the plan detail (look for `expectedReturn` or `maturesAt`). Below the maturity countdown / return info, add:
```tsx
{inv.installments && inv.installments.length > 0 && (
  <InstallmentTimeline
    installments={inv.installments}
    investmentId={inv._id}
    status={inv.status}
  />
)}
```

- [ ] **Step 4: Start dev server and verify visually**

```bash
cd client && npm run dev
```
Log in as test user (`bhaveshsolminde@gmail.com`), navigate to the Investments page. Confirm:
- Active Silver/Gold investments show the 3-day timeline
- Completed days show green "Paid" badge
- Available days show amber "Ready" badge
- "Break investment" button appears when at least one day is ready
- Tapping Break shows loading state then updates to "break_requested"
- `break_requested` status pill appears orange

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/app/InvestmentsPage.tsx
git commit -m "feat(ui): 3-day installment timeline and break-investment button"
```

---

## Task 10: Frontend admin — InstallmentsTab + Break Requests section

**Files:**
- Create: `client/src/components/admin/investments/InstallmentsTab.tsx`
- Modify: `client/src/pages/admin/AdminInvestments.tsx`

- [ ] **Step 1: Create `InstallmentsTab.tsx`**

Create `client/src/components/admin/investments/InstallmentsTab.tsx`:
```tsx
import { useApproveInstallment, useApproveBreak, useRejectBreak } from '@/hooks/queries'
import type { AdminInvestment } from '@/services/api/admin'
import { AdminButton } from '@/components/admin/AdminButton'
import { DataTable, EmptyState, type Column } from '@/components/admin/DataTable'
import { inr } from '@/lib/format'
import { fmt } from './helpers'
import { cn } from '@/lib/utils'

interface Props {
  data: AdminInvestment[] | undefined
  isLoading: boolean
  isError: boolean
}

export function InstallmentsTab({ data, isLoading, isError }: Props) {
  const approveInstallment = useApproveInstallment()
  const approveBreak = useApproveBreak()
  const rejectBreak = useRejectBreak()

  // Investments with available (unpaid, matured) installments
  const pendingInstallments: Array<{ inv: AdminInvestment; day: number; amount: number }> = []
  const breakRequests: AdminInvestment[] = []

  for (const inv of data ?? []) {
    if (inv.status === 'break_requested') {
      breakRequests.push(inv)
    } else if (inv.status === 'active' && inv.installments) {
      for (const inst of inv.installments) {
        if (inst.status === 'available') {
          pendingInstallments.push({ inv, day: inst.day, amount: inst.amount })
        }
      }
    }
  }

  const installmentColumns: Column<{ inv: AdminInvestment; day: number; amount: number }>[] = [
    { key: 'user', header: 'User', render: (r) => <span className="font-medium">{r.inv.user.name}</span> },
    { key: 'ref', header: 'Reference', render: (r) => <span className="font-mono text-xs">{r.inv.referenceCode}</span> },
    { key: 'plan', header: 'Plan', render: (r) => <span className="capitalize">{r.inv.planKey}</span> },
    { key: 'day', header: 'Day', render: (r) => <span className="font-semibold">Day {r.day} of {r.inv.installments?.length ?? 3}</span> },
    { key: 'amount', header: 'Return Amount', render: (r) => <span className="font-semibold">{inr(r.amount)}</span> },
    {
      key: 'actions',
      header: '',
      render: (r) => (
        <AdminButton
          size="sm"
          onClick={() => approveInstallment.mutate([r.inv._id, r.day])}
          disabled={approveInstallment.isPending}
        >
          Approve Day {r.day}
        </AdminButton>
      ),
    },
  ]

  const breakColumns: Column<AdminInvestment>[] = [
    { key: 'user', header: 'User', render: (inv) => <span className="font-medium">{inv.user.name}</span> },
    { key: 'ref', header: 'Reference', render: (inv) => <span className="font-mono text-xs">{inv.referenceCode}</span> },
    { key: 'amount', header: 'Invested', render: (inv) => inr(inv.amount) },
    { key: 'requestedAt', header: 'Requested', render: (inv) => inv.breakRequestedAt ? fmt(inv.breakRequestedAt) : '—' },
    {
      key: 'actions',
      header: '',
      render: (inv) => (
        <div className="flex gap-2">
          <AdminButton size="sm" onClick={() => approveBreak.mutate([inv._id])} disabled={approveBreak.isPending}>
            Approve Break
          </AdminButton>
          <AdminButton size="sm" variant="outline" onClick={() => rejectBreak.mutate([inv._id])} disabled={rejectBreak.isPending}>
            Reject
          </AdminButton>
        </div>
      ),
    },
  ]

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Loading…</p>
  if (isError)   return <p className="py-8 text-center text-destructive">Failed to load investments.</p>

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Pending Daily Returns</h2>
        {pendingInstallments.length === 0 ? (
          <EmptyState message="No installments awaiting approval" />
        ) : (
          <DataTable columns={installmentColumns} data={pendingInstallments} keyFn={(r) => `${r.inv._id}-d${r.day}`} />
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Break Requests</h2>
        {breakRequests.length === 0 ? (
          <EmptyState message="No break requests pending" />
        ) : (
          <DataTable columns={breakColumns} data={breakRequests} keyFn={(inv) => inv._id} />
        )}
      </section>
    </div>
  )
}
```

- [ ] **Step 2: Add Installments tab to `AdminInvestments.tsx`**

In `client/src/pages/admin/AdminInvestments.tsx`, extend the `Tab` type and `TABS` array:
```ts
type Tab = 'investments' | 'returns' | 'history' | 'installments'

const TABS: { id: Tab; label: string }[] = [
  { id: 'investments',  label: 'Investments' },
  { id: 'returns',      label: 'Returns' },
  { id: 'installments', label: 'Installments' },
  { id: 'history',      label: 'History' },
]
```

Import the new tab:
```ts
import { InstallmentsTab } from '@/components/admin/investments/InstallmentsTab'
```

In the tab content render section (wherever `InvestmentTab`, `ReturnTab`, `HistoryTab` are rendered), add:
```tsx
{activeTab === 'installments' && (
  <InstallmentsTab data={investments.data} isLoading={investments.isLoading} isError={investments.isError} />
)}
```

The `useAdminInvestments` hook call that already fetches investments needs no `status` filter for the installments tab — passing the current `filterParams` is fine since the tab component filters client-side.

- [ ] **Step 3: Smoke-test admin panel**

```bash
cd client && npm run dev
```
Log in as admin (`admin@asmcoins.com`), navigate to Admin → Investments → "Installments" tab. Confirm:
- "Pending Daily Returns" section shows investments with `available` installments and their day labels
- "Break Requests" section shows `break_requested` investments
- "Approve Day N" button calls the right endpoint and the row disappears on success
- "Approve Break" / "Reject" buttons work for break requests

- [ ] **Step 4: Build for type-checking**

```bash
cd client && npm run build
```
Expected: clean build, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/admin/investments/InstallmentsTab.tsx client/src/pages/admin/AdminInvestments.tsx
git commit -m "feat(admin): installment daily returns tab and break request approval UI"
```

---

## Post-implementation checklist

- [ ] Run full backend test suite: `cd server && npm test` — all green
- [ ] Run frontend build: `cd client && npm run build` — no errors
- [ ] Manually verify referral commission: approve a deposit for a referred user, check referrer's wallet shows ₹(3% of deposit) with type `referral_bonus`
- [ ] Manually verify installment flow: approve a Silver/Gold deposit, confirm 3 installment jobs fire and each day's return lands in wallet
- [ ] Manually verify break flow: tap Break as user → admin sees request → approve → principal + accrued profit credited → investment returned
- [ ] Run database seed to update live plans: `cd server && npm run seed`
- [ ] Confirm Diamond plan is inactive (no new deposits accepted, existing active ones still complete via old path)
