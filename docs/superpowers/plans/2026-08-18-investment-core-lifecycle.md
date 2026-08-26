# Investment Core Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace AMScoins' "credit-principal-on-approval" deposit flow with a full locked-till-maturity investment lifecycle — deposit → approve → countdown → auto-mature → return → wallet — configured in Settings and driven by BullMQ background jobs, with a three-tab admin UI.

**Architecture:** Backend delta on `amscoins/server` (Express + Mongoose, money in paise, Mongo replica-set transactions). The `Investment` document gains lifecycle + return fields (one collection, no separate Return/History tables). A new BullMQ queue on the existing Redis runs a delayed `auto-reject` job, a delayed `mature` job, and a ~5-min safety `sweep`; all handlers are idempotent pure functions in `investmentService` that the unit tests call directly. Admin UI extends the existing deposits/investments page into Investment / Return / History tabs.

**Tech Stack:** Node 20 / Express / Mongoose 8, BullMQ + ioredis, Jest + `mongodb-memory-server` (replica set), React 19 + Vite + TS strict, Playwright.

## Global Constraints

- Backend under `server/`; run server tests from inside `server/`: `npm test` (`NODE_ENV=test jest --runInBand`). Target one file with `npm test -- <name>`. **Server stays on Jest** (its established runner) — do not introduce Vitest server-side.
- Frontend under `client/`; gates run inside `client/`: `npm run build`, `npm run lint`. **Client unit tests use Vitest** (`npm run test:run [-- <name>]`, colocated `*.test.tsx`, `@testing-library/react` + jsdom — see `client/src/pages/app/CommunityPage.test.tsx` for the pattern). **Client end-to-end tests use Playwright** (`npm run e2e [-- <name>]`, specs in `client/tests-e2e/`, hermetic backend auto-started on :4000, 375×812 viewport — see `client/tests-e2e/admin-withdrawal-destination.spec.ts` + `helpers.ts`).
- **Frontend work (Tasks 8–10) MUST invoke the `impeccable` and `design-taste-frontend` skills** before writing UI, and follow the existing theme + conventions: shadcn/ui style `base-nova`, base color `neutral`, CSS variables, **lucide** icons; mobile-first at a **375px base**; `@tanstack/react-query` for data/refetch; `react-hook-form + zod` for forms; `framer-motion` for motion; money formatted with `inr()` from `@/lib/format`; `tabular-nums` for timers. Do not hand-edit shadcn primitives in `client/src/components/ui`. Match the look and structure of the existing admin pages (`AdminWithdrawals.tsx`, `AdminDeposits.tsx`) — the new UI must not read as templated or off-theme.
- Money values are **paise (integers)**; never trust client-sent amounts as source of truth.
- Frontend imports via the `@/` alias; **TypeScript strict** — `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` (use `import type` for type-only imports). Do not hand-edit shadcn primitives in `client/src/components/ui`.
- All wallet-affecting state changes run inside a Mongoose session/transaction.
- Validate all new request bodies with zod in `server/src/validation/schemas.js`.
- BullMQ keys use the `asm:jobs` prefix and a dedicated connection (`maxRetriesPerRequest: null`); never collide with cache/rate-limit keys.
- Auto-reject is **silent** — it must send **no** email.
- Principal is credited to a wallet **at most once**, guarded by `Investment.walletCredited`.

---

### Task 1: Config foundation — Settings fields + env flag

**Files:**
- Modify: `server/src/models/Settings.js`
- Modify: `server/src/config/env.js`
- Test: `server/tests/unit/settings.investment.test.js` (create)

**Interfaces:**
- Consumes: existing `Settings.getSingleton()`, `settings.toPublic()`.
- Produces: `settings.cycleDurationHours` (Number, default 24), `settings.autoRejectHours` (Number, default 8), both in `toPublic()`; `env.WALLET_AUTO_CREDIT_ON_MATURITY` (Boolean, default false).

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/settings.investment.test.js`:

```js
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const Settings = require('../../src/models/Settings')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('singleton has investment-lifecycle defaults', async () => {
  const s = await Settings.getSingleton()
  expect(s.cycleDurationHours).toBe(24)
  expect(s.autoRejectHours).toBe(8)
})

test('toPublic exposes the new fields', async () => {
  const s = await Settings.getSingleton()
  s.cycleDurationHours = 36
  s.autoRejectHours = 6
  await s.save()
  const pub = s.toPublic()
  expect(pub.cycleDurationHours).toBe(36)
  expect(pub.autoRejectHours).toBe(6)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- settings.investment`
Expected: FAIL — `cycleDurationHours` is `undefined`.

- [ ] **Step 3: Add the Settings fields**

In `server/src/models/Settings.js`, add to `settingsSchema` (next to `inrThresholdPaise`):

```js
    cycleDurationHours: { type: Number, default: 24, min: 1 },
    autoRejectHours: { type: Number, default: 8, min: 1 },
```

And add both to the object returned by `settingsSchema.methods.toPublic`:

```js
    cycleDurationHours: this.cycleDurationHours,
    autoRejectHours: this.autoRejectHours,
```

- [ ] **Step 4: Add the env flag**

In `server/src/config/env.js`, add to the exported object (next to `REDIS_URL`):

```js
  WALLET_AUTO_CREDIT_ON_MATURITY: process.env.WALLET_AUTO_CREDIT_ON_MATURITY === 'true',
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- settings.investment`
Expected: PASS (2 tests).

- [ ] **Step 6: Document the new env var**

In `server/.env.production.example` (repo root has `.env.production.example`; add to the server example if present, else the repo-root one) add:

```
# When true, matured investments auto-credit the wallet with no admin click.
# Default false (manual admin approval in the Return section).
WALLET_AUTO_CREDIT_ON_MATURITY=false
```

- [ ] **Step 7: Commit**

```bash
git add server/src/models/Settings.js server/src/config/env.js server/tests/unit/settings.investment.test.js .env.production.example
git commit -m "feat(settings): add investment cycle + auto-reject config and wallet auto-credit env flag"
```

---

### Task 2: Investment model — lifecycle + return fields

**Files:**
- Modify: `server/src/models/Investment.js`
- Modify: `server/src/models/Transaction.js`
- Test: `server/tests/unit/investment.model.lifecycle.test.js` (create)

**Interfaces:**
- Produces: `Investment.status` enum `['pending','active','matured','returned','rejected']`; new fields `walletCredited`, `maturedAt`, `creditedAmount`, `returnDecidedBy`, `returnDecidedAt`, `returnRejectionReason`, `rejectionReason`, `autoRejected`. `Transaction.type` gains `'return'`.

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/investment.model.lifecycle.test.js`:

```js
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Transaction = require('../../src/models/Transaction')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

function baseInv(extra = {}) {
  return {
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver',
    amount: 100000,
    returnPct: 25,
    expectedReturn: 25000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    ...extra,
  }
}

test('accepts the new lifecycle statuses', async () => {
  for (const status of ['pending', 'active', 'matured', 'returned', 'rejected']) {
    const inv = await Investment.create(baseInv({ status }))
    expect(inv.status).toBe(status)
  }
})

test('new fields default correctly', async () => {
  const inv = await Investment.create(baseInv())
  expect(inv.walletCredited).toBe(false)
  expect(inv.autoRejected).toBe(false)
  expect(inv.creditedAmount).toBe(0)
  expect(inv.returnRejectionReason).toBe('')
})

test('Transaction accepts type "return"', async () => {
  const txn = await Transaction.create({
    user: new mongoose.Types.ObjectId(),
    type: 'return',
    direction: 'credit',
    amount: 25000,
  })
  expect(txn.type).toBe('return')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- investment.model.lifecycle`
Expected: FAIL — `matured` not a valid enum / `walletCredited` undefined.

- [ ] **Step 3: Extend the Investment schema**

In `server/src/models/Investment.js`, change the `status` line and add fields:

```js
    status: { type: String, enum: ['pending', 'active', 'matured', 'returned', 'rejected'], default: 'pending' },
    walletCredited: { type: Boolean, default: false },
    maturedAt: { type: Date },
    creditedAmount: { type: Number, default: 0 }, // paise actually paid to wallet
    returnDecidedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // null = system
    returnDecidedAt: { type: Date },
    returnRejectionReason: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    autoRejected: { type: Boolean, default: false },
```

- [ ] **Step 4: Extend the Transaction type enum**

In `server/src/models/Transaction.js`, change the `type` enum to:

```js
    type: { type: String, enum: ['deposit', 'withdrawal', 'refund', 'adjustment', 'return'], required: true },
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- investment.model.lifecycle`
Expected: PASS (3 tests).

- [ ] **Step 6: Verify no regressions in existing investment tests**

Run: `cd server && npm test -- investment`
Expected: existing `investment.create` / `investment.approve` still PASS (they will be updated in Task 4; if `investment.approve` fails here it's only because it asserts the old credit behavior — leave it, Task 4 fixes it. If it currently passes, good.)

- [ ] **Step 7: Commit**

```bash
git add server/src/models/Investment.js server/src/models/Transaction.js server/tests/unit/investment.model.lifecycle.test.js
git commit -m "feat(investment): add lifecycle statuses and return-tracking fields"
```

---

### Task 3: Return service — approveReturn / rejectReturn

**Files:**
- Modify: `server/src/services/investmentService.js`
- Test: `server/tests/unit/investment.return.test.js` (create)

**Interfaces:**
- Consumes: `walletService.credit(userId, amount, meta, session)`, `Investment`, `mongoose` sessions, `cacheDel`.
- Produces (exported from `investmentService`):
  - `approveReturn(investmentId, adminId)` → returns the updated `inv`. Guard `status==='matured'`. Credits principal (`type:'deposit'`) only if `!walletCredited`, credits `expectedReturn` (`type:'return'`), sets `walletCredited=true`, `creditedAmount = (wasCredited ? 0 : amount) + expectedReturn`, `returnDecidedBy=adminId`, `returnDecidedAt=now`, `status='returned'`.
  - `rejectReturn(investmentId, adminId, { reason, amount })` → guard `status==='matured'`. If `amount>0` credit it (`type:'adjustment'`, `actor:'admin'`). Sets `status='rejected'`, `returnRejectionReason=reason`, `creditedAmount=amount`, `returnDecidedBy=adminId`, `returnDecidedAt=now`.
  - Both throw `ApiError(409)` if not `matured` and `ApiError(400)` on invalid amount (`amount > amount+expectedReturn` for reject).

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/investment.return.test.js`:

```js
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Wallet = require('../../src/models/Wallet')
const Transaction = require('../../src/models/Transaction')
const svc = require('../../src/services/investmentService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const adminId = new mongoose.Types.ObjectId()

async function maturedInv(extra = {}) {
  return Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver',
    amount: 100000,
    returnPct: 25,
    expectedReturn: 25000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'matured',
    maturedAt: new Date(),
    ...extra,
  })
}

test('approveReturn credits principal + return once and marks returned', async () => {
  const inv = await maturedInv()
  await svc.approveReturn(inv._id, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(125000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
  expect(fresh.walletCredited).toBe(true)
  expect(fresh.creditedAmount).toBe(125000)
})

test('approveReturn on a legacy walletCredited row credits only the return', async () => {
  const inv = await maturedInv({ walletCredited: true })
  await svc.approveReturn(inv._id, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(25000) // return only, principal already paid
  const fresh = await Investment.findById(inv._id)
  expect(fresh.creditedAmount).toBe(25000)
})

test('approveReturn is rejected when not matured', async () => {
  const inv = await maturedInv({ status: 'active' })
  await expect(svc.approveReturn(inv._id, adminId)).rejects.toMatchObject({ statusCode: 409 })
})

test('rejectReturn credits a custom partial amount and marks rejected', async () => {
  const inv = await maturedInv()
  await svc.rejectReturn(inv._id, adminId, { reason: 'KYC mismatch', amount: 50000 })
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(50000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('rejected')
  expect(fresh.returnRejectionReason).toBe('KYC mismatch')
  expect(fresh.creditedAmount).toBe(50000)
})

test('rejectReturn with amount 0 credits nothing', async () => {
  const inv = await maturedInv()
  await svc.rejectReturn(inv._id, adminId, { reason: 'policy violation', amount: 0 })
  const w = await Wallet.findOne({ user: inv.user })
  expect(w).toBeNull() // no wallet created, no credit
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('rejected')
})

test('rejectReturn rejects an amount above principal+return', async () => {
  const inv = await maturedInv()
  await expect(
    svc.rejectReturn(inv._id, adminId, { reason: 'x', amount: 200000 })
  ).rejects.toMatchObject({ statusCode: 400 })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- investment.return`
Expected: FAIL — `svc.approveReturn is not a function`.

- [ ] **Step 3: Implement approveReturn / rejectReturn**

In `server/src/services/investmentService.js`, add these functions (reuse the existing `mongoose`, `walletService`, `Investment`, `ApiError`, `logger`, `cacheDel` imports already at the top of the file) and export them in `module.exports`:

```js
async function approveReturn(investmentId, adminId) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'matured') throw new ApiError(409, 'Investment not awaiting return')

      const wasCredited = inv.walletCredited
      let credited = 0
      if (!wasCredited) {
        await walletService.credit(
          inv.user, inv.amount,
          { type: 'deposit', actor: 'admin', note: `Principal ${inv.referenceCode}`, ref: inv._id },
          session
        )
        credited += inv.amount
      }
      await walletService.credit(
        inv.user, inv.expectedReturn,
        { type: 'return', actor: 'admin', note: `Return ${inv.referenceCode}`, ref: inv._id },
        session
      )
      credited += inv.expectedReturn

      inv.status = 'returned'
      inv.walletCredited = true
      inv.creditedAmount = credited
      inv.returnDecidedBy = adminId
      inv.returnDecidedAt = new Date()
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await cacheDel('cache:admin:stats', `cache:dashboard:${updated.user}`, `cache:wallet:${updated.user}`)
      logger.info('Return approved', { investmentId, adminId, creditedAmount: updated.creditedAmount })
    }
    return updated
  } finally {
    session.endSession()
  }
}

async function rejectReturn(investmentId, adminId, { reason, amount }) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'matured') throw new ApiError(409, 'Investment not awaiting return')
      const max = inv.amount + inv.expectedReturn
      if (amount < 0 || amount > max) throw new ApiError(400, 'Amount out of range')

      if (amount > 0) {
        await walletService.credit(
          inv.user, amount,
          { type: 'adjustment', actor: 'admin', note: `Return reject ${inv.referenceCode}: ${reason}`, ref: inv._id },
          session
        )
        inv.walletCredited = true
      }
      inv.status = 'rejected'
      inv.returnRejectionReason = reason
      inv.creditedAmount = amount
      inv.returnDecidedBy = adminId
      inv.returnDecidedAt = new Date()
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await cacheDel('cache:admin:stats', `cache:dashboard:${updated.user}`, `cache:wallet:${updated.user}`)
      logger.info('Return rejected', { investmentId, adminId, amount })
    }
    return updated
  } finally {
    session.endSession()
  }
}
```

Add `approveReturn` and `rejectReturn` to the `module.exports` object at the bottom of the file.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd server && npm test -- investment.return`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add server/src/services/investmentService.js server/tests/unit/investment.return.test.js
git commit -m "feat(investment): add approveReturn/rejectReturn with custom partial-credit"
```

---

### Task 4: Lifecycle change — approve locks funds; add runMature / runAutoReject handlers

**Files:**
- Modify: `server/src/services/investmentService.js`
- Modify: `server/tests/unit/investment.approve.test.js` (update assertions)
- Test: `server/tests/unit/investment.lifecycle.test.js` (create)

**Interfaces:**
- Consumes: `Settings.getSingleton()`, `env.WALLET_AUTO_CREDIT_ON_MATURITY`, `approveReturn` (Task 3), queue helpers (Task 5 — imported lazily/guarded so this task's tests don't need Redis).
- Produces (exported):
  - modified `approveInvestment(investmentId, adminId)` — sets `active`, `startAt`, `maturesAt` from **Settings.cycleDurationHours**, **no wallet credit**; schedules the `mature` job and cancels the `auto-reject` job (via queue helpers, no-op in test/no-Redis).
  - `runMature(investmentId)` — `active→matured` (+ auto-credit path when `WALLET_AUTO_CREDIT_ON_MATURITY`). Idempotent.
  - `runAutoReject(investmentId)` — `pending→rejected` with reason `'auto-rejected: approval timeout (8h)'`, `autoRejected=true`, no email. Idempotent.

- [ ] **Step 1: Write the failing lifecycle test**

Create `server/tests/unit/investment.lifecycle.test.js`:

```js
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
  const inv = await pendingInv({ status: 'active', maturesAt: new Date(Date.now() - 1000) })
  await svc.runMature(inv._id)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('matured')
  expect(fresh.maturedAt).toBeInstanceOf(Date)
  const w = await Wallet.findOne({ user: inv.user })
  expect(w == null || w.balance === 0).toBe(true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- investment.lifecycle`
Expected: FAIL — `runAutoReject`/`runMature` undefined and/or approve still credits wallet.

- [ ] **Step 3: Modify approveInvestment (remove credit, use Settings)**

> **Note (execution ordering):** The BullMQ job **scheduling** calls in `approveInvestment` are intentionally deferred to Task 5, which creates `config/queue.js`. Do **not** add `require('../config/queue')` or any `queue.*` call in this task — the module does not exist yet and would crash every `investmentService` test. This task only changes DB state; Task 5 wires the scheduling.

In `server/src/services/investmentService.js` `approveInvestment`:
1. Add near the top of the file: `const Settings = require('../models/Settings')`. (Do NOT import `../config/queue` — see the note above.)
2. Replace the `maturesAt` computation and **delete** the `walletService.credit(...)` call inside the transaction. The block becomes:

```js
      const settings = await Settings.getSingleton()
      const now = new Date()
      inv.status = 'active'
      inv.startAt = now
      inv.maturesAt = new Date(now.getTime() + settings.cycleDurationHours * 3600 * 1000)
      inv.approvedBy = adminId
      inv.approvedAt = now
      await inv.save({ session })

      // NOTE: principal is intentionally NOT credited here. Funds stay locked
      // until maturity (see approveReturn / runMature). Job scheduling
      // (cancelAutoReject + scheduleMature) is wired in Task 5.

      const user = await User.findById(inv.user).session(session)
      const referralResult = await creditReferralIfFirst(user, session)
```

- [ ] **Step 4: Add runMature and runAutoReject handlers**

Append to `server/src/services/investmentService.js` and export both:

```js
async function runAutoReject(investmentId) {
  const inv = await Investment.findOneAndUpdate(
    { _id: investmentId, status: 'pending' },
    { $set: { status: 'rejected', autoRejected: true, rejectionReason: 'auto-rejected: approval timeout (8h)', approvedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) return null // already approved/processed — idempotent no-op
  await cacheDel('cache:admin:stats', `cache:dashboard:${inv.user}`)
  logger.info('Investment auto-rejected (8h timeout)', { investmentId }) // no email
  return inv
}

async function runMature(investmentId) {
  const inv = await Investment.findOneAndUpdate(
    { _id: investmentId, status: 'active' },
    { $set: { status: 'matured', maturedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) return null // not active — idempotent no-op
  await cacheDel('cache:admin:stats', `cache:dashboard:${inv.user}`)
  logger.info('Investment matured', { investmentId })

  if (env.WALLET_AUTO_CREDIT_ON_MATURITY) {
    // Reuse the return-approve credit path with a system actor (adminId = null).
    await approveReturn(inv._id, null)
  }
  return await Investment.findById(investmentId)
}
```

(`env` is already imported at the top of the file.)

- [ ] **Step 5: Allow approveReturn to accept a system (null) actor**

In `approveReturn` (Task 3), `returnDecidedBy=adminId` already stores `null`
for the system path — no change needed, but confirm the `meta.actor` reads
`'system'` when `adminId` is null. Update both `walletService.credit` calls in
`approveReturn` to: `actor: adminId ? 'admin' : 'system'`.

- [ ] **Step 6: Add the auto-credit ON test**

Append to `server/tests/unit/investment.lifecycle.test.js`:

```js
test('runMature auto-credits when WALLET_AUTO_CREDIT_ON_MATURITY is on', async () => {
  const prev = process.env.WALLET_AUTO_CREDIT_ON_MATURITY
  jest.resetModules()
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = 'true'
  const svc2 = require('../../src/services/investmentService')
  const Investment2 = require('../../src/models/Investment')
  const Wallet2 = require('../../src/models/Wallet')
  const inv = await Investment2.create({
    user: new mongoose.Types.ObjectId(), planKey: 'silver', amount: 100000,
    returnPct: 25, expectedReturn: 25000, referenceCode: `ASM-${Math.random().toString(36).slice(2,10)}`,
    status: 'active', maturesAt: new Date(Date.now() - 1000),
  })
  await svc2.runMature(inv._id)
  const fresh = await Investment2.findById(inv._id)
  expect(fresh.status).toBe('returned')
  const w = await Wallet2.findOne({ user: inv.user })
  expect(w.balance).toBe(125000)
  process.env.WALLET_AUTO_CREDIT_ON_MATURITY = prev
  jest.resetModules()
})
```

- [ ] **Step 7: Update the existing approve test**

Open `server/tests/unit/investment.approve.test.js`. Any assertion that the
wallet balance equals the principal after approval is now wrong. Change those
to assert the wallet is **not** credited at approval (balance 0 / no wallet) and
that `status==='active'`. Keep referral/email assertions intact.

- [ ] **Step 8: Run the full investment suite**

Run: `cd server && npm test -- investment`
Expected: PASS — lifecycle (6), return (6), model (3), create + approve (updated).

- [ ] **Step 9: Commit**

```bash
git add server/src/services/investmentService.js server/tests/unit/investment.lifecycle.test.js server/tests/unit/investment.approve.test.js
git commit -m "feat(investment): lock funds till maturity; add mature/auto-reject handlers"
```

---

### Task 5: BullMQ queue + worker wiring

**Files:**
- Create: `server/src/config/queue.js`
- Create: `server/src/jobs/investmentWorker.js`
- Modify: `server/src/server.js`
- Modify: `server/src/services/investmentService.js` (schedule auto-reject on create)
- Modify: `server/package.json` (add `bullmq` dependency)
- Test: `server/tests/unit/queue.noop.test.js` (create)

**Interfaces:**
- Produces (from `config/queue.js`): `investmentQueue` (or null in test/no-Redis), `scheduleAutoReject(inv)`, `scheduleMature(inv)`, `cancelAutoReject(id)` — all async, all no-op when `NODE_ENV==='test'` or `!env.REDIS_URL`.
- Consumes (in `investmentWorker.js`): `runAutoReject`, `runMature` from `investmentService`; `Investment` + `Settings` for the sweep.

- [ ] **Step 1: Install BullMQ**

Run: `cd server && npm install bullmq`
Expected: `bullmq` added to `dependencies`.

- [ ] **Step 2: Write the no-op guard test**

Create `server/tests/unit/queue.noop.test.js`:

```js
// In NODE_ENV=test the queue helpers must be safe no-ops (no Redis in CI).
const queue = require('../../src/config/queue')

test('queue helpers are callable no-ops in test env', async () => {
  await expect(queue.scheduleAutoReject({ _id: 'x', createdAt: new Date() })).resolves.toBeUndefined()
  await expect(queue.scheduleMature({ _id: 'x', maturesAt: new Date() })).resolves.toBeUndefined()
  await expect(queue.cancelAutoReject('x')).resolves.toBeUndefined()
  expect(queue.investmentQueue).toBeNull()
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd server && npm test -- queue.noop`
Expected: FAIL — module `../../src/config/queue` not found.

- [ ] **Step 4: Implement config/queue.js**

Create `server/src/config/queue.js`:

```js
'use strict'

const env = require('./env')
const logger = require('../lib/logger').child({ service: 'queue' })

const DISABLED = env.NODE_ENV === 'test' || !env.REDIS_URL
const PREFIX = 'asm:jobs'
const QUEUE_NAME = 'investments'

let investmentQueue = null
let queueConnection = null

if (!DISABLED) {
  const { Queue } = require('bullmq')
  const IORedis = require('ioredis')
  // BullMQ requires a DEDICATED connection with maxRetriesPerRequest:null.
  // Build an ioredis instance from the URL (BullMQ's `connection` takes an
  // ioredis instance or ioredis options — a bare `{ url }` is NOT valid
  // ioredis config). Exported as `queueConnection` so the worker reuses it.
  queueConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
  investmentQueue = new Queue(QUEUE_NAME, { connection: queueConnection, prefix: PREFIX })
  logger.info('Investment job queue initialized')
}

const autoRejectJobId = (id) => `auto-reject:${id}`
const matureJobId = (id) => `mature:${id}`

async function scheduleAutoReject(inv) {
  if (!investmentQueue) return
  const Settings = require('../models/Settings')
  const settings = await Settings.getSingleton()
  const delay = Math.max(0, new Date(inv.createdAt).getTime() + settings.autoRejectHours * 3600e3 - Date.now())
  await investmentQueue.add('auto-reject', { investmentId: String(inv._id) },
    { delay, jobId: autoRejectJobId(inv._id), removeOnComplete: true, removeOnFail: 100 })
}

async function scheduleMature(inv) {
  if (!investmentQueue) return
  const delay = Math.max(0, new Date(inv.maturesAt).getTime() - Date.now())
  await investmentQueue.add('mature', { investmentId: String(inv._id) },
    { delay, jobId: matureJobId(inv._id), removeOnComplete: true, removeOnFail: 100 })
}

async function cancelAutoReject(id) {
  if (!investmentQueue) return
  const job = await investmentQueue.getJob(autoRejectJobId(id))
  if (job) await job.remove()
}

module.exports = {
  investmentQueue, queueConnection, scheduleAutoReject, scheduleMature, cancelAutoReject,
  QUEUE_NAME, PREFIX, autoRejectJobId, matureJobId,
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- queue.noop`
Expected: PASS.

- [ ] **Step 6: Wire job scheduling into the investment service (deferred from Task 4)**

Add the queue helper import once, near the other requires at the top of
`server/src/services/investmentService.js`:

```js
const queue = require('../config/queue')
```

(a) In `createInvestment`, after the investment is saved and before returning
(alongside the existing `cacheDel` / `email.depositSubmitted` calls), add:

```js
  await queue.scheduleAutoReject(investment)
```

(b) In `approveInvestment`, in the post-commit `if (result)` block (where
`cacheDel` and `email.depositApproved` already run), add:

```js
      await queue.cancelAutoReject(result.inv._id)
      await queue.scheduleMature(result.inv)
```

Both are safe no-ops in test / without Redis (the helpers guard on
`investmentQueue`). Run `cd server && npm test -- investment` afterward to
confirm no regressions (queue helpers no-op in test).

- [ ] **Step 7: Implement the worker**

Create `server/src/jobs/investmentWorker.js`:

```js
'use strict'

const env = require('../config/env')
const logger = require('../lib/logger').child({ service: 'investment-worker' })
const { QUEUE_NAME, PREFIX } = require('../config/queue')
const svc = require('../services/investmentService')

let worker = null

async function runSweep() {
  const Investment = require('../models/Investment')
  const Settings = require('../models/Settings')
  const settings = await Settings.getSingleton()
  const now = Date.now()

  const cutoff = new Date(now - settings.autoRejectHours * 3600e3)
  const stalePending = await Investment.find({ status: 'pending', createdAt: { $lt: cutoff } }).select('_id')
  for (const p of stalePending) await svc.runAutoReject(p._id)

  const due = await Investment.find({ status: 'active', maturesAt: { $lte: new Date(now) } }).select('_id')
  for (const d of due) await svc.runMature(d._id)

  if (stalePending.length || due.length) {
    logger.info('Sweep processed investments', { autoRejected: stalePending.length, matured: due.length })
  }
}

async function startInvestmentWorker() {
  if (env.NODE_ENV === 'test' || !env.REDIS_URL) return null
  const { Worker, Queue } = require('bullmq')
  const IORedis = require('ioredis')
  // Dedicated connection for the worker (BullMQ requires maxRetriesPerRequest:null
  // and its own connection separate from the Queue producer).
  const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })

  worker = new Worker(QUEUE_NAME, async (job) => {
    if (job.name === 'auto-reject') return svc.runAutoReject(job.data.investmentId)
    if (job.name === 'mature') return svc.runMature(job.data.investmentId)
    if (job.name === 'sweep') return runSweep()
  }, { connection, prefix: PREFIX })

  worker.on('failed', (job, err) => logger.error('Job failed', { name: job?.name, id: job?.id, error: err.message }))

  // Repeatable safety-net sweep every 5 minutes (catches missed/ restart cases).
  const sweepQueue = new Queue(QUEUE_NAME, { connection, prefix: PREFIX })
  await sweepQueue.add('sweep', {}, { repeat: { every: 5 * 60 * 1000 }, jobId: 'sweep', removeOnComplete: true, removeOnFail: 10 })

  logger.info('Investment worker started')
  return worker
}

module.exports = { startInvestmentWorker, runSweep }
```

- [ ] **Step 8: Boot the worker in server.js**

In `server/src/server.js`, after the DB connection is established and before/after `app.listen`, add:

```js
const { startInvestmentWorker } = require('./jobs/investmentWorker')
// ... inside the async startup, after DB connect:
startInvestmentWorker().catch((err) => logger.warn('Worker failed to start', { error: err.message }))
```

(Match the file's existing startup structure — if it uses a `.then()` chain on `connectDb()`, add the call there. `logger` is already imported in `server.js`.)

- [ ] **Step 9: Add a runSweep integration test**

Append to `server/tests/unit/investment.lifecycle.test.js` (worker sweep logic is pure and testable without Redis):

```js
test('runSweep matures due and auto-rejects stale', async () => {
  const { runSweep } = require('../../src/jobs/investmentWorker')
  const Settings2 = require('../../src/models/Settings')
  const s = await Settings2.getSingleton(); s.autoRejectHours = 8; await s.save()

  const stale = await pendingInv() // createdAt now; force it old:
  await Investment.updateOne({ _id: stale._id }, { $set: { createdAt: new Date(Date.now() - 9 * 3600e3) } })
  const due = await pendingInv({ status: 'active', maturesAt: new Date(Date.now() - 1000) })

  await runSweep()

  expect((await Investment.findById(stale._id)).status).toBe('rejected')
  expect((await Investment.findById(due._id)).status).toBe('matured')
})
```

- [ ] **Step 10: Run tests**

Run: `cd server && npm test -- investment.lifecycle queue.noop`
Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add server/src/config/queue.js server/src/jobs/investmentWorker.js server/src/server.js server/src/services/investmentService.js server/package.json server/package-lock.json server/tests/unit/queue.noop.test.js server/tests/unit/investment.lifecycle.test.js
git commit -m "feat(jobs): BullMQ queue + worker for auto-reject, maturity, and safety sweep"
```

---

### Task 6: Data migration for in-flight active investments

**Files:**
- Create: `server/src/scripts/migrateWalletCredited.js`
- Test: `server/tests/unit/migrate.walletCredited.test.js` (create)
- Modify: `server/package.json` (add `migrate:wallet-credited` script)

**Interfaces:**
- Produces: `markActiveAsCredited()` → sets `walletCredited=true` on all `status:'active'` investments where it is not already true; returns the modified count. Idempotent.

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/migrate.walletCredited.test.js`:

```js
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const { markActiveAsCredited } = require('../../src/scripts/migrateWalletCredited')

beforeAll(setupDb); afterEach(clearDb); afterAll(teardownDb)

function inv(status) {
  return {
    user: new mongoose.Types.ObjectId(), planKey: 'silver', amount: 1000,
    returnPct: 25, expectedReturn: 250, referenceCode: `ASM-${Math.random().toString(36).slice(2,10)}`, status,
  }
}

test('marks only active investments as walletCredited, idempotently', async () => {
  await Investment.create(inv('active'))
  await Investment.create(inv('active'))
  await Investment.create(inv('pending'))
  const n1 = await markActiveAsCredited()
  expect(n1).toBe(2)
  const n2 = await markActiveAsCredited()
  expect(n2).toBe(0) // idempotent
  expect(await Investment.countDocuments({ status: 'pending', walletCredited: true })).toBe(0)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- migrate.walletCredited`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the migration**

Create `server/src/scripts/migrateWalletCredited.js`:

```js
'use strict'

const Investment = require('../models/Investment')
const logger = require('../lib/logger').child({ service: 'migrate' })

// Existing 'active' investments already had their principal credited under the
// old approve-time logic. Flag them so the new mature/return path credits only
// the return, never re-crediting principal.
async function markActiveAsCredited() {
  const res = await Investment.updateMany(
    { status: 'active', walletCredited: { $ne: true } },
    { $set: { walletCredited: true } }
  )
  return res.modifiedCount
}

module.exports = { markActiveAsCredited }

if (require.main === module) {
  const { connectDb, disconnectDb } = require('../config/db')
  connectDb()
    .then(markActiveAsCredited)
    .then((n) => logger.info('Migration complete', { modified: n }))
    .then(disconnectDb)
    .catch((err) => { logger.error('Migration failed', { stack: err.stack }); process.exit(1) })
}
```

- [ ] **Step 4: Add the npm script**

In `server/package.json` `scripts`, add:

```json
    "migrate:wallet-credited": "node src/scripts/migrateWalletCredited.js",
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd server && npm test -- migrate.walletCredited`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add server/src/scripts/migrateWalletCredited.js server/tests/unit/migrate.walletCredited.test.js server/package.json
git commit -m "feat(migrate): flag in-flight active investments as walletCredited"
```

---

### Task 7: Admin API — return endpoints + section filtering

**Files:**
- Modify: `server/src/controllers/adminController.js`
- Modify: `server/src/routes/adminRoutes.js`
- Modify: `server/src/validation/schemas.js`
- Test: `server/tests/integration/admin.returns.test.js` (create; follow existing integration test setup)

**Interfaces:**
- Consumes: `invSvc.approveReturn`, `invSvc.rejectReturn` (Task 3).
- Produces:
  - `POST /api/admin/investments/:id/return/approve` → `c.approveReturn`.
  - `POST /api/admin/investments/:id/return/reject` → `validate(returnRejectSchema), c.rejectReturn`.
  - `GET /api/admin/investments?status=matured` (and comma lists like `returned,rejected`) supported by `listInvestments`.
  - zod `returnRejectSchema = { reason: string ≥1, amount: int ≥0 }`.

- [ ] **Step 1: Write the failing integration test**

Create `server/tests/integration/admin.returns.test.js`, following the setup in an existing `server/tests/integration/*.test.js` (app + supertest + admin auth token). Core assertions:

```js
// (setup: boot app, seed an admin, obtain adminToken, create a matured Investment)
test('approve return credits wallet and marks returned', async () => {
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/return/approve`)
    .set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
})

test('reject return requires a reason', async () => {
  const res = await request(app)
    .post(`/api/admin/investments/${inv2._id}/return/reject`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ amount: 0 })
  expect(res.status).toBe(400)
})

test('list filters by matured status', async () => {
  const res = await request(app)
    .get('/api/admin/investments?status=matured')
    .set('Authorization', `Bearer ${adminToken}`)
  expect(res.status).toBe(200)
  expect(res.body.every((i) => i.status === 'matured')).toBe(true)
})
```

(Mirror the exact auth/seed helpers used by the neighbouring integration tests — check `server/tests/integration/` for the established pattern before writing.)

- [ ] **Step 2: Run test to verify it fails**

Run: `cd server && npm test -- admin.returns`
Expected: FAIL — routes 404 / handlers undefined.

- [ ] **Step 3: Add the zod schema**

In `server/src/validation/schemas.js`, add and export:

```js
const returnRejectSchema = z.object({
  reason: z.string().min(1),
  amount: z.number().int().min(0),
})
```

Add `returnRejectSchema` to the file's `module.exports`.

- [ ] **Step 4: Add controller handlers**

In `server/src/controllers/adminController.js`:

1. Update `listInvestments` to accept comma-separated statuses:

```js
const listInvestments = asyncHandler(async (req, res) => {
  const q = req.query.status ? { status: { $in: String(req.query.status).split(',') } } : {}
  res.json(await Investment.find(q).sort('-createdAt').populate('user', 'name email'))
})
```

2. Add:

```js
const approveReturn = asyncHandler(async (req, res) => {
  res.json(await invSvc.approveReturn(req.params.id, req.user._id))
})

const rejectReturn = asyncHandler(async (req, res) => {
  const { reason, amount } = req.body
  res.json(await invSvc.rejectReturn(req.params.id, req.user._id, { reason, amount }))
})
```

Add both to `module.exports`.

- [ ] **Step 5: Add the routes**

In `server/src/routes/adminRoutes.js`, add (near the other investment routes), and import `returnRejectSchema` from `../validation/schemas`:

```js
router.post('/investments/:id/return/approve', c.approveReturn)
router.post('/investments/:id/return/reject', validate(returnRejectSchema), c.rejectReturn)
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd server && npm test -- admin.returns`
Expected: PASS.

- [ ] **Step 7: Full server suite green**

Run: `cd server && npm test`
Expected: PASS (all suites).

- [ ] **Step 8: Commit**

```bash
git add server/src/controllers/adminController.js server/src/routes/adminRoutes.js server/src/validation/schemas.js server/tests/integration/admin.returns.test.js
git commit -m "feat(admin-api): return approve/reject endpoints and multi-status investment filter"
```

---

### Task 8: Client — API layer + countdown component

**Files:**
- Modify: `client/src/services/api/investments.ts`
- Create: `client/src/components/admin/InvestmentCountdown.tsx`
- Test (Vitest): `client/src/components/admin/InvestmentCountdown.test.tsx` (create; colocated Vitest + `@testing-library/react`, per `CommunityPage.test.tsx`)

**Interfaces:**
- Produces (in `investments.ts`):
  - `listAdminInvestments(status: string)` → GET `/api/admin/investments?status=`.
  - `approveInvestment(id)`, `rejectInvestment(id)` (if not already present) → POST approve/reject.
  - `approveReturn(id)` → POST `.../return/approve`.
  - `rejectReturn(id, body: { reason: string; amount: number })` → POST `.../return/reject`.
  - `InvestmentCountdown` React component: props `{ maturesAt: string }`, renders a live `HH:MM:SS` reverse timer, `"Matured"` when elapsed.

- [ ] **Step 1: Invoke design skills, then read the existing API module and admin patterns**

Invoke the `impeccable` and `design-taste-frontend` skills first (frontend gate). Then read `client/src/services/api/investments.ts` and `client/src/pages/admin/AdminWithdrawals.tsx` to match the existing fetch helper, auth header handling, `@tanstack/react-query` usage, and money formatting (`inr()` from `@/lib/format`). Note the exact `api` client import used.

- [ ] **Step 2: Add the API functions**

In `client/src/services/api/investments.ts`, add the admin functions above, mirroring the module's existing call style (same base client, same error handling). Use `import type` for any type-only imports.

- [ ] **Step 3: Write the countdown component**

Create `client/src/components/admin/InvestmentCountdown.tsx`:

```tsx
import { useEffect, useState } from 'react'

function format(ms: number): string {
  if (ms <= 0) return 'Matured'
  const s = Math.floor(ms / 1000)
  const h = String(Math.floor(s / 3600)).padStart(2, '0')
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${h}:${m}:${sec}`
}

export function InvestmentCountdown({ maturesAt }: { maturesAt: string }) {
  const target = new Date(maturesAt).getTime()
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className="tabular-nums">{format(target - now)}</span>
}
```

- [ ] **Step 4: Write the Vitest test for the countdown**

Create `client/src/components/admin/InvestmentCountdown.test.tsx` (Vitest + `@testing-library/react`, mirroring `client/src/pages/app/CommunityPage.test.tsx`):

```tsx
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InvestmentCountdown } from './InvestmentCountdown'

describe('InvestmentCountdown', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('renders a reverse HH:MM:SS timer for a future maturity', () => {
    const maturesAt = new Date(Date.now() + 3661_000).toISOString() // 1h 1m 1s
    render(<InvestmentCountdown maturesAt={maturesAt} />)
    expect(screen.getByText('01:01:01')).toBeInTheDocument()
  })

  it('shows "Matured" once the target has passed', () => {
    const maturesAt = new Date(Date.now() - 1000).toISOString()
    render(<InvestmentCountdown maturesAt={maturesAt} />)
    expect(screen.getByText('Matured')).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run Vitest, type-check, lint**

Run: `cd client && npm run test:run -- InvestmentCountdown && npm run build && npm run lint`
Expected: Vitest PASS (2 tests), tsc clean, lint clean. Fix any strict/`import type` issues.

- [ ] **Step 6: Commit**

```bash
git add client/src/services/api/investments.ts client/src/components/admin/InvestmentCountdown.tsx client/src/components/admin/InvestmentCountdown.test.tsx
git commit -m "feat(admin-ui): investment admin API calls + live countdown component (Vitest)"
```

---

### Task 9: Client — Investment / Return / History tabs + return dialog

**Files:**
- Modify (or create): the admin investments page — reuse the existing deposits/investments admin page. Confirm the exact file by reading `client/src/pages/admin/AdminDeposits.tsx` and the admin route table in `AdminLayout.tsx`; add tabs there (or create `client/src/pages/admin/AdminInvestments.tsx` and route to it).
- Create: `client/tests-e2e/admin-investment-lifecycle.spec.ts`

**Interfaces:**
- Consumes: `listAdminInvestments`, `approveInvestment`, `rejectInvestment`, `approveReturn`, `rejectReturn`, `InvestmentCountdown` (Task 8).

- [ ] **Step 1: Invoke design skills, then read the current admin deposits/investments page**

Invoke the `impeccable` and `design-taste-frontend` skills first, then read `client/src/pages/admin/AdminDeposits.tsx` and `AdminLayout.tsx`. Decide: add three tabs to the existing page (preferred if it already lists investments) or add a sibling page. Follow the shadcn `Tabs` usage already in the codebase (grep for `TabsTrigger`), the `base-nova`/`neutral` theme, lucide icons, and the mobile-first 375px base. The result must visually match the existing admin surfaces, not a generic template.

- [ ] **Step 2: Build the three tabs**

Implement tabs **Investment** (`listAdminInvestments('pending,active')`), **Return** (`'matured'`), **History** (`'returned,rejected'`). Columns per section (from the design spec §7): Investment shows `referenceCode`, user, `inr(amount)`, dates, status, and `<InvestmentCountdown maturesAt={i.maturesAt}/>` on active rows, tier (`planKey`). Return adds principal / `inr(expectedReturn)` / `returnPct`%. History adds durations + final status. Reuse the table primitives and `inr()` from `AdminWithdrawals.tsx`.

- [ ] **Step 3: Wire Investment-tab actions**

On pending rows: Approve → `approveInvestment(id)`; Reject → `rejectInvestment(id)`. Refetch on success (match the page's existing query/refetch pattern — `@tanstack/react-query` per CLAUDE.md).

- [ ] **Step 4: Build the return-reject dialog**

On Return-tab rows: **Approve** → confirm dialog → `approveReturn(id)`. **Reject** → a dialog (reuse the `Dialog` primitive + `react-hook-form + zod` per CLAUDE.md) with a **reason** textarea (required) and a **custom amount** field in rupees, validated `0 … (amount+expectedReturn)`, converted to paise before calling `rejectReturn(id, { reason, amount })`.

- [ ] **Step 5: Design pass, then type-check + lint**

Do a self-review against the `impeccable` / `design-taste-frontend` guidance (hierarchy, spacing, states, motion, on-theme). Then run: `cd client && npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 6: Write the Playwright e2e**

Create `client/tests-e2e/admin-investment-lifecycle.spec.ts`, following `client/tests-e2e/admin-withdrawal-destination.spec.ts` and `client/tests-e2e/helpers.ts` for setup (admin login, seeded data; the hermetic backend + Vite dev server auto-start via `playwright.config.ts`). Assert: the three tabs render; an active investment shows a countdown; approving a matured investment moves it to History as `returned`; rejecting a matured investment with a reason + partial amount moves it to History as `rejected`.

- [ ] **Step 7: Run e2e**

Run: `cd client && npm run e2e -- admin-investment-lifecycle`
Expected: PASS. (Ensure no stale e2e server is holding :4000/:5173 first.)

- [ ] **Step 8: Commit**

```bash
git add client/src/pages/admin/ client/tests-e2e/admin-investment-lifecycle.spec.ts
git commit -m "feat(admin-ui): Investment/Return/History tabs with countdown and return dialog"
```

---

### Task 10: Admin Settings UI — cycle duration + auto-reject window

**Files:**
- Modify: `client/src/pages/admin/AdminSettings.tsx`
- Modify: `client/src/services/api/*` settings module (whichever the settings page uses)
- Modify: `client/tests-e2e/` add/extend the settings e2e if one exists

**Interfaces:**
- Consumes: existing settings GET/PUT (the page already reads `toPublic()` which now includes `cycleDurationHours` + `autoRejectHours` from Task 1).

- [ ] **Step 1: Invoke design skills, then read the settings page**

Invoke the `impeccable` and `design-taste-frontend` skills, then read `client/src/pages/admin/AdminSettings.tsx` and its settings API module to learn the existing field/save pattern and match its layout/theme exactly.

- [ ] **Step 2: Add the two numeric fields**

Add "Investment cycle duration (hours)" bound to `cycleDurationHours` and "Auto-reject window (hours)" bound to `autoRejectHours`, using the same controlled-input + save pattern as the existing scalar settings. Validate positive integers.

- [ ] **Step 3: Type-check + lint**

Run: `cd client && npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 4: Manual/e2e verify save round-trips**

If a settings e2e exists, extend it to set `cycleDurationHours=36` and assert it persists; otherwise verify via the admin UI against a local server that a save then reload shows 36.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/admin/AdminSettings.tsx client/src/services
git commit -m "feat(admin-ui): configure investment cycle duration and auto-reject window in settings"
```

---

### Task 11: Docs — deployment note that Redis is now required

**Files:**
- Modify: `amscoins/docker-compose.yml` (comment) and/or `amscoins/docs/` deployment doc
- Modify: `server/README.md`

**Interfaces:** none (docs only).

- [ ] **Step 1: Update the Redis note in docker-compose.yml**

The `redis` service comment currently says Redis is an *optional* dependency. Add a note that, as of the investment automation, **BullMQ requires Redis** — the auto-reject / maturity / sweep jobs do not run without it (though the HTTP API still serves). Keep the existing volume/persistence guidance.

- [ ] **Step 2: Note the env var + Redis requirement in server/README.md**

Document `WALLET_AUTO_CREDIT_ON_MATURITY` (default false) and that Redis is required for background automation; the queue uses the `asm:jobs` key prefix.

- [ ] **Step 3: Commit**

```bash
git add amscoins/docker-compose.yml amscoins/docs server/README.md
git commit -m "docs: Redis is required for investment automation; document auto-credit flag"
```

---

## Final verification (run before declaring the plan complete)

- [ ] `cd server && npm test` → all suites PASS (Jest).
- [ ] `cd client && npm run test:run` → all Vitest unit tests PASS.
- [ ] `cd client && npm run build && npm run lint` → PASS.
- [ ] `cd client && npm run e2e` → all Playwright e2e PASS (including `admin-investment-lifecycle`).
- [ ] Manually confirm with `WALLET_AUTO_CREDIT_ON_MATURITY=false` (default): an approved investment shows a countdown, moves to Return at maturity, and only credits the wallet when an admin approves the return.
- [ ] Run `cd server && npm run migrate:wallet-credited` against a copy of production data (or confirm no active investments exist) before deploying the new approve logic.

---

## Self-review notes (coverage of the Core Lifecycle Bundle)

- Settings config (cycle, auto-reject) → Task 1, 10. Auto-credit env flag → Task 1.
- Lifecycle states + return fields → Task 2. Return calc/credit → Task 3. Lock-till-maturity + auto-reject + maturity + auto-credit → Task 4.
- BullMQ infra (delayed jobs + sweep, Redis hard dep) → Task 5, 11.
- Migration of in-flight investments → Task 6.
- Admin API (return endpoints, section filters) → Task 7.
- Admin UI (3 tabs, countdown, return dialog) → Tasks 8, 9.
- Deferred items are listed in the design spec and intentionally excluded here.
