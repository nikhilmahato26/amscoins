# Investment Core Lifecycle — Design Spec

**Date:** 2026-08-18
**Source spec:** `INVESTMENT.md` (full multi-subsystem feature spec)
**Scope of THIS design:** the "Core Lifecycle Bundle" only — the end-to-end
investment lifecycle (deposit → approve → countdown → auto-mature → return →
wallet), its configuration, and its background automation. Everything else in
`INVESTMENT.md` is explicitly deferred (see [Deferred](#deferred-to-later-cycles)).

---

## 1. Context & baseline (what already exists)

`amscoins/` is a live monorepo: `client/` (React 19 + Vite + TS strict) and
`server/` (Node/Express + Mongoose, Jest tests, in-memory Mongo replica set).
Money is stored as **paise (integers)** everywhere. MongoDB runs as a **replica
set**, so Mongoose transactions are available (and already used by
wallet/referral/withdrawal services).

Relevant existing pieces:

- **`server/src/models/Investment.js`** — `status` enum is only
  `['pending','active','rejected']`. Fields: `user`, `planKey`
  (silver/gold/diamond), `amount` (paise), `returnPct`, `expectedReturn`
  (paise), `referenceCode` (`ASM-XXXX`), `referralCodeUsed`, `isFirstDeposit`,
  `startAt`, `maturesAt`, `approvedBy`, `approvedAt`. No return tracking, no
  maturity handling, no auto-reject.
- **`server/src/services/investmentService.js`** — `createInvestment` (fires
  `email.depositSubmitted` = the "Deposit Initiated" email; returns
  telegram/whatsapp links), `approveInvestment`, `rejectInvestment`.
  **`approveInvestment` currently credits the full principal to the wallet at
  approval time** and sets `maturesAt` from `plan.durationHours` — but nothing
  ever acts on `maturesAt`. No return is ever paid today.
- **`server/src/controllers/adminController.js` + `routes/adminRoutes.js`** —
  admin investment ops live here: `GET /api/admin/investments` (filter by
  `status`), `POST /api/admin/investments/:id/approve`, `.../reject`.
- **`server/src/models/Settings.js`** — a singleton doc
  (`Settings.getSingleton()`), currently only payment-method config. Has a
  `toPublic()` method.
- **`server/src/models/Wallet.js` + `services/walletService.js`** —
  `credit(userId, amount, meta, session)` / `debit(...)` write a `Wallet`
  `$inc` and a `Transaction` row, session-aware.
- **`server/src/models/Transaction.js`** — `type` enum
  `['deposit','withdrawal','refund','adjustment']`, `direction`, `status`,
  `actor` (`user|admin|system`), `ref`.
- **`server/src/models/Plan.js`** — per-tier `returnPct`, `minInvest`,
  `maxInvest`, `durationHours` (seed defaults: silver 25% / gold 30% /
  diamond 40%, all `durationHours: 24`).
- **`server/src/config/redis.js`** — `ioredis` with graceful degradation;
  exports the `redis` instance + `cacheGet/cacheSet/cacheDel`. Built with
  `maxRetriesPerRequest: 1` (unsuitable for a BullMQ worker → BullMQ needs its
  own connection). **No BullMQ / cron / scheduler exists anywhere yet.**
- **`server/src/config/env.js`** — a plain validated object;
  `REDIS_URL` is optional (`|| null`).
- **`server/src/server.js:27`** — the process entry (`app.listen`). Worker boots here.
- **`server/src/services/emailService.js`** — `depositSubmitted(user, inv,
  planName)` and `depositApproved(user, inv, planName)` already exist.
- **Tests** — `server/tests/helpers/db.js` spins a `MongoMemoryReplSet`;
  patterns in `investment.approve.test.js`, `investment.create.test.js`,
  `wallet.service.test.js`, `settingsModel.test.js`.
- **Client admin** — `client/src/pages/admin/` has `AdminDeposits.tsx`,
  `AdminWithdrawals.tsx`, `AdminSettings.tsx`, etc.
  `client/src/services/api/investments.ts` exists. `AdminWithdrawals` +
  `tests-e2e/admin-withdrawal-*.spec.ts` are the reference patterns for admin
  tables, dialogs, and Playwright e2e.

### ⚠️ Behavioral conflict this design resolves

Today: deposit → admin approves → **principal is immediately spendable wallet
balance**; no return concept. `INVESTMENT.md` requires the **opposite**: money
is **locked** during the cycle (`₹0` in wallet), and only credited at maturity
as **principal + return together**. This design changes the credit timing and
adds the return lifecycle.

---

## 2. Decisions (confirmed with stakeholder)

1. **Wallet credit timing → lock-till-maturity.** Remove the principal credit
   from `approveInvestment`. Wallet stays `₹0` from a deposit during its cycle.
   At maturity, credit `principal + return` together (or an admin-set custom
   amount on return-reject).
2. **Migration of in-flight investments → flag legacy rows.** Add
   `walletCredited: Boolean`; backfill all currently-`active` investments to
   `walletCredited=true` so the new `mature` job credits **only their return**
   (never double-crediting principal). New investments follow full
   lock-till-maturity (`walletCredited` starts `false`).
3. **Return/History modeling → one collection.** Extend the `Investment`
   document with lifecycle status + return fields. "Return section" = `matured`
   investments; "History section" = `returned`/`rejected`. No separate
   Return/History collections.
4. **Config location → Settings + Plan + env.** `cycleDurationHours` and
   `autoRejectHours` go on the `Settings` singleton; per-tier `returnPct` stays
   in `Plan` (already snapshotted onto each Investment). The auto-credit switch
   is the env flag `WALLET_AUTO_CREDIT_ON_MATURITY` (default `false`).
5. **Job scheduling → BullMQ delayed jobs + safety sweep.** Exact delayed jobs
   at `maturesAt` and `createdAt+autoRejectHours`, plus a repeatable ~5-min
   sweep that catches anything missed across restarts. Redis becomes a **hard
   production dependency** once this ships.

---

## 3. Data model

### `Investment` (modified)
```
status:   ['pending','active','matured','returned','rejected']   // was pending|active|rejected
walletCredited:       Boolean, default false    // migration + double-credit guard
maturedAt:            Date                        // when it entered the Return section
creditedAmount:       Number                      // paise actually paid to wallet (0 allowed)
returnDecidedBy:      ObjectId ref User, null     // null = system (auto-credit / auto-reject)
returnDecidedAt:      Date
returnRejectionReason: String, default ''         // reason on return-reject
rejectionReason:      String, default ''          // pre-approval / auto-reject reason
autoRejected:         Boolean, default false      // set only by the 8h timeout job
```
`amount` = principal (paise). `expectedReturn` = the return (paise), already
computed at creation from `returnPct`. Terminal payout on approve =
`amount + expectedReturn`.

### `Transaction` (modified)
`type` enum gains `'return'`: `['deposit','withdrawal','refund','adjustment','return']`.

### `Settings` (modified)
```
cycleDurationHours: Number, default 24, min 1
autoRejectHours:    Number, default 8,  min 1
```
Surface both in `toPublic()` and allow update via the existing
`updateSettings` (scalar merge already handles new scalar fields).

### `env.js` (modified)
```
WALLET_AUTO_CREDIT_ON_MATURITY: process.env.WALLET_AUTO_CREDIT_ON_MATURITY === 'true'  // default false
```

---

## 4. Lifecycle state machine

```
create ──▶ pending ──(admin approve)──▶ active ──(mature job @maturesAt)──▶ matured
              │                                                                │
   (auto-reject job @createdAt+autoRejectHours, still pending)                 │
              ▼                                          ┌─────────────────────┤
           rejected (autoRejected, silent, no email)     │ auto-credit ON      │ auto-credit OFF
                                                          ▼                     ▼
                                                    returned (system)   [awaits admin in Return]
                                                                          │            │
                                                              return approve      return reject
                                                                    ▼                  ▼
                                                                returned            rejected
                                                          (credit P+R)      (credit custom amount)
```

**Transitions & side effects:**

- **create** — `pending`; schedule delayed `auto-reject` job. `depositSubmitted`
  email already fires. No wallet effect.
- **approve** — guard `status==pending`; set `active`, `startAt=now`,
  `maturesAt=now + settings.cycleDurationHours*3600e3`, `approvedBy/At`.
  **No wallet credit.** Cancel the `auto-reject` job for this id; schedule a
  `mature` job at `maturesAt`. Keep `creditReferralIfFirst` + `depositApproved`
  email (post-commit, fire-and-forget). All in one Mongo transaction.
- **auto-reject job** — if `status==pending`: set `rejected`,
  `rejectionReason='auto-rejected: approval timeout (8h)'`, `autoRejected=true`.
  **No email.** Idempotent (no-op if not pending).
- **mature job** — if `status==active`: set `matured`, `maturedAt=now`. Then if
  `WALLET_AUTO_CREDIT_ON_MATURITY`: run the same credit path as return-approve
  with `returnDecidedBy=null` (system) → `returned`. Idempotent (no-op if not active).
- **return approve** (admin) — guard `status==matured`; in one transaction:
  credit principal (`type:'deposit'`) only if `!walletCredited`, credit return
  (`type:'return'`), set `walletCredited=true`,
  `creditedAmount = (walletCredited_before ? 0 : amount) + expectedReturn`,
  `returnDecidedBy=admin`, `returnDecidedAt=now`, `status=returned`.
  Bust the same caches `approveInvestment` busts.
- **return reject** (admin; `reason`, `amount` in paise, `0 ≤ amount ≤
  principal+return`) — guard `status==matured`; if `amount>0` credit it
  (`type:'adjustment'`, `actor:'admin'`); set `status=rejected`,
  `returnRejectionReason=reason`, `creditedAmount=amount`, `returnDecidedBy`,
  `returnDecidedAt`.

**Migration:** a one-off, idempotent step sets `walletCredited=true` on every
Investment currently in `status:'active'` (principal already credited under old
logic), so their `mature` job credits only `expectedReturn`.

**Idempotency invariant:** principal is credited at most once, enforced by
`walletCredited`. Every job handler re-reads status inside its transaction and
no-ops if the precondition no longer holds, so a delayed job + the sweep can
both fire without double-effect.

---

## 5. Automation infrastructure (BullMQ)

- **`server/src/config/queue.js`** — construct a BullMQ `Queue` named
  `investments` on a **dedicated** ioredis connection built from `env.REDIS_URL`
  with `maxRetriesPerRequest: null` and key prefix `asm:jobs`. Export the queue
  plus helpers `scheduleAutoReject(inv)`, `scheduleMature(inv)`,
  `cancelAutoReject(id)`. When `NODE_ENV==='test'` or `REDIS_URL` is absent,
  these helpers no-op (mirroring `redis.js`'s graceful pattern) so unit tests
  and Redis-less dev don't require a broker.
- **`server/src/jobs/investmentWorker.js`** — a BullMQ `Worker` on the same
  connection/prefix that dispatches by job name to **pure handler functions**
  exported from `investmentService` (`runAutoReject(id)`, `runMature(id)`),
  plus a repeatable `sweep` job (every ~5 min) that queries for
  `pending` past their auto-reject deadline and `active` past `maturesAt` and
  runs the same handlers. Handlers are what the unit tests call directly.
- **Boot** — `server/src/server.js` starts the worker after the DB connects
  (skipped when `NODE_ENV==='test'`).
- **Deployment note** — Redis is now **required** in production (documented in
  `.env.production.example` and `docs/`); the queue uses DB/prefix isolation so
  it never collides with the existing rate-limit/cache keys.

---

## 6. Admin API

Additions to `adminController.js` / `adminRoutes.js` (all behind existing
`auth, requireAdmin`):

- `GET /api/admin/investments?status=` — already exists; the three UI sections
  are just `status` filters (`pending,active` / `matured` / `returned,rejected`).
  Extend to accept comma-separated statuses.
- `POST /api/admin/investments/:id/return/approve` → `invSvc.approveReturn(id, adminId)`.
- `POST /api/admin/investments/:id/return/reject` → `invSvc.rejectReturn(id,
  adminId, { reason, amount })`, zod-validated (`returnRejectSchema`:
  `reason` non-empty string, `amount` int ≥ 0).

Existing approve/reject endpoints unchanged in signature.

---

## 7. Admin UI (client)

- Extend the existing admin deposits/investments page into three tabs —
  **Investment** (`pending`+`active`), **Return** (`matured`), **History**
  (`returned`+`rejected`) — reusing the table/dialog patterns from
  `AdminWithdrawals.tsx`.
- **Countdown**: a small reusable component computes a live reverse timer from
  `maturesAt` (client-side `setInterval`); shows on `active` rows.
- **Return actions**: Approve (confirm dialog) and Reject (dialog with a
  **reason** textarea + **custom amount** field, validated `0 … principal+return`).
- New client API calls in `client/src/services/api/investments.ts`:
  `approveReturn(id)`, `rejectReturn(id, { reason, amount })`, and a
  section-scoped list fetch.
- Columns per `INVESTMENT.md` §"Admin Panel Sections" (Investment ID =
  `referenceCode`, user, amount, dates, status, countdown, tier; Return adds
  principal / return / return %; History adds durations + final status).

---

## 8. Testing strategy

- **Server (Jest, in-memory replica set):** approve sets `active` **without**
  crediting wallet; auto-reject flips `pending→rejected` silently with the exact
  reason string and sends no email; mature `active→matured`; auto-credit toggle
  ON credits `principal+return` and sets `returned`; toggle OFF leaves `matured`;
  return-approve credits `principal+return` once and respects `walletCredited`
  (legacy rows credit return only); return-reject credits the custom amount and
  sets `rejected`; Settings persists the two new fields with defaults; migration
  sets `walletCredited` on active rows. Handlers are called directly (BullMQ not
  exercised in tests). Mirror `investment.approve.test.js`.
- **Client unit (Vitest + `@testing-library/react`):** the countdown formats a
  future maturity as `HH:MM:SS` and shows `"Matured"` once elapsed; return-reject
  amount validation clamps to `0…principal+return`. Colocated `*.test.tsx`, run
  with `npm run test:run`; mirror `client/src/pages/app/CommunityPage.test.tsx`.
- **Client e2e (Playwright):** the three tabs render the right rows by status; a
  countdown appears on an active investment; return approve + return reject
  (with reason/amount) drive the API. Specs in `client/tests-e2e/`; mirror
  `admin-withdrawal-destination.spec.ts` + `helpers.ts`.
- **Frontend build:** all admin UI is built via the `impeccable` +
  `design-taste-frontend` skills and matches the existing `base-nova`/`neutral`
  shadcn theme, lucide icons, `@tanstack/react-query`, `react-hook-form + zod`,
  and the mobile-first 375px base — consistent with `AdminWithdrawals.tsx`.

---

## 9. Global constraints (verbatim, bind every task)

- Backend under `server/`; run tests from inside `server/` with `npm test`
  (`NODE_ENV=test jest --runInBand`). Frontend under `client/`; gates
  `npm run build`, `npm run lint`, and Playwright e2e run inside `client/`.
- Money values are **paise (integers)**; never trust client-sent amounts.
- Frontend imports via the `@/` alias; **TypeScript strict**
  (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` → `import
  type` for type-only imports). Do not hand-edit shadcn primitives in
  `client/src/components/ui`.
- All wallet-affecting state changes run inside a Mongoose transaction/session.
- Validate all new request bodies with zod in `server/src/validation/schemas.js`.
- BullMQ keys use the `asm:jobs` prefix; do not collide with cache/rate-limit keys.

---

## Deferred to later cycles

Dashboard & quick stats · smart sorting/filtering/search · alerts &
notifications (browser push, color coding) · export & reports (CSV/PDF) ·
user-section investor filter + total-invested column · deposit confirmation-page
polish & deep-link refinements · withdrawal concurrency/robustness (processing/
failed states, per-user locking, retry, bulk approve, audit) · full
`invest-{id}`/`user-{id}` ID rename. Each is its own spec → plan → build cycle.
