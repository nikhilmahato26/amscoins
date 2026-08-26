# AMScoins Batch Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship seven product fixes to ASM Coins: shorten the investment term to 24h, adjust deposit/withdrawal limits, replace the crypto payment methods with direct TRC20/BEP20 QR codes, fix a broken plan-name in the deposit email, strip the anti-phishing block from all emails, repair a 404 support link, and give the profile banner tier-specific visuals.

**Architecture:** Monorepo. Backend is Node/Express + MongoDB (`server/`, Jest + in-memory Mongo). Frontend is React 19 + Vite + TS strict (`client/`, no unit-test runner — verification is `npm run build` typecheck + `npm run lint` + manual visual check). Money limits are enforced server-side (source of truth) and mirrored in the client UI. Payment method availability lives in a single shared `Settings` document.

**Tech Stack:** Express, Mongoose, Zod, Jest/Supertest (backend); React 19, react-router 7, react-hook-form, framer-motion, Tailwind + shadcn (frontend).

## Global Constraints

- **Run backend commands inside `server/`; frontend commands inside `client/`.** (`cd` in one shell line can trigger a permission prompt — run each command from the correct directory.)
- Backend money values are **paise** (₹1 = 100 paise). Frontend UI values are **rupees**, converted at the boundary.
- Frontend imports use the `@/` alias; use `import type` for type-only imports (TS `verbatimModuleSyntax`).
- Do **not** touch the separate **"3-hour" payout** copy anywhere — only the **investment term** ("36 hours"/"36-Hour") changes to 24.
- New limits (authoritative values):
  - Deposit caps (`Plan.maxInvest`): Silver ₹10,000 (unchanged), **Gold ₹3,00,000**, **Diamond ₹5,00,000**.
  - Withdrawal caps (per tier): **Silver ₹30,000**, **Gold ₹50,000**, **Diamond ₹1,00,000**.
- Backend verification for every backend task: `npm test` (from `server/`). Frontend verification for every frontend task: `npm run build && npm run lint` (from `client/`).
- Commit after each task.

---

## File Structure

**Backend (`server/`):**
- `src/models/Plan.js` — term default (Task 1).
- `src/seed/seedPlans.js` — plan term + deposit caps (Tasks 1, 2).
- `src/config/limits.js` — **new**; per-tier withdrawal caps (Task 3).
- `src/services/withdrawalService.js` — enforce withdrawal cap (Task 3).
- `src/validation/schemas.js` — settings schema field removal (Task 7).
- `src/services/investmentService.js` — pass plan name to email (Task 4).
- `src/services/emailService.js` — anti-phishing removal + support link (Tasks 5, 6).
- `src/models/Settings.js`, `src/controllers/settingsController.js` — drop Binance Pay + Trust Wallet (Task 7).
- Tests: `tests/unit/plan.model.test.js`, `tests/unit/settingsModel.test.js`, `tests/integration/settings.routes.test.js`, plus new withdrawal-limit test.

**Frontend (`client/`):**
- Copy edits: `LandingPage.tsx`, `HomePage.tsx`, `ReferralPage.tsx`, `MarketTicker.tsx`, `HeroBanner.tsx`, `LandingChrome.tsx`, `TierPlanCard.tsx`, `PackageDetailPage.tsx`, `InvestmentGridGold.tsx` (Tasks 8, 9).
- `pages/app/WithdrawPage.tsx` — per-tier client cap (Task 10).
- `config/payment.ts`, `services/api/settings.ts`, `pages/app/PaymentMethodPage.tsx` — USDT-only crypto (Task 11).
- `pages/admin/AdminSettings.tsx` — settings panel cleanup (Task 12).
- `pages/app/AccountPage.tsx` — tier banner (Task 13).

---

### Task 1: Backend — investment term 36h → 24h

**Files:**
- Modify: `server/src/models/Plan.js:11`
- Modify: `server/src/seed/seedPlans.js:6-10`
- Test: `server/tests/unit/plan.model.test.js:19`

**Interfaces:**
- Produces: `Plan.durationHours` default `24`; seeded plans all carry `durationHours: 24`. Maturity in `investmentService.approveInvestment` (`plan.durationHours * 3600 * 1000`) becomes 24h automatically.

- [ ] **Step 1: Update the failing test expectation**

In `server/tests/unit/plan.model.test.js`, change line 19:

```js
  expect(gold.durationHours).toBe(24)
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `server/`): `npm test -- plan.model.test.js`
Expected: FAIL — `Expected: 24, Received: 36`.

- [ ] **Step 3: Change the model default**

In `server/src/models/Plan.js`, line 11:

```js
    durationHours: { type: Number, default: 24 },
```

- [ ] **Step 4: Set the term explicitly in the seed**

In `server/src/seed/seedPlans.js`, replace the `DEFAULTS` array (lines 6-10) so every tier pins `durationHours: 24` (this `$set`s it onto existing DB docs on re-seed). Note: `maxInvest` for gold/diamond also changes here — that is Task 2 and is included now to avoid editing this array twice:

```js
const DEFAULTS = [
  { key: 'silver', name: 'Silver', returnPct: 25, minInvest: 100000, maxInvest: 1000000, unlockReferrals: 0, durationHours: 24 },
  { key: 'gold', name: 'Gold', returnPct: 30, minInvest: 300000, maxInvest: 30000000, unlockReferrals: 11, durationHours: 24 },
  { key: 'diamond', name: 'Diamond', returnPct: 40, minInvest: 500000, maxInvest: 50000000, unlockReferrals: 21, durationHours: 24 },
]
```

- [ ] **Step 5: Run the test to verify it passes**

Run (from `server/`): `npm test -- plan.model.test.js`
Expected: PASS. (The `maxInvest` assertion at line 18 still expects `5000000` and will now FAIL — that is fixed in Task 2, Step 1. If running Task 2 immediately after, proceed; otherwise temporarily leave line 18 and let Task 2 own it.)

- [ ] **Step 6: Commit**

```bash
git add server/src/models/Plan.js server/src/seed/seedPlans.js server/tests/unit/plan.model.test.js
git commit -m "feat(server): shorten investment term to 24h"
```

---

### Task 2: Backend — deposit caps (Gold ₹3L, Diamond ₹5L)

**Files:**
- Modify: `server/src/seed/seedPlans.js` (already edited in Task 1 Step 4 — verify values)
- Test: `server/tests/unit/plan.model.test.js:18`

**Interfaces:**
- Consumes: `Plan.maxInvest` is enforced in `investmentService.createInvestment` (`amount > plan.maxInvest` → 400). No code change there — only the seeded value changes.
- Produces: Gold `maxInvest = 30000000` paise (₹3,00,000), Diamond `maxInvest = 50000000` paise (₹5,00,000). Silver unchanged at `1000000` (₹10,000).

- [ ] **Step 1: Update the test expectation**

In `server/tests/unit/plan.model.test.js`, change line 18:

```js
  expect(gold.maxInvest).toBe(30000000)
```

- [ ] **Step 2: Run the test to verify it fails then passes**

Confirm `server/src/seed/seedPlans.js` gold `maxInvest: 30000000` and diamond `maxInvest: 50000000` (set in Task 1 Step 4).
Run (from `server/`): `npm test -- plan.model.test.js`
Expected: PASS (both `durationHours` and `maxInvest` assertions green).

- [ ] **Step 3: Run the full backend suite for regressions**

Run (from `server/`): `npm test`
Expected: PASS. (Investment integration tests use amounts inside plan limits; widening the cap does not break them. If any test asserted a rejection *above* the old cap, update it to use an amount above the new cap.)

- [ ] **Step 4: Commit**

```bash
git add server/src/seed/seedPlans.js server/tests/unit/plan.model.test.js
git commit -m "feat(server): raise gold/diamond deposit caps to 3L/5L"
```

> **Re-seed note (deploy):** existing plan docs keep their old `maxInvest`/`durationHours` until `npm run seed` runs against the target DB. Flag this in the PR description — the seed must be run after deploy.

---

### Task 3: Backend — enforce per-tier withdrawal limits

**Files:**
- Create: `server/src/config/limits.js`
- Modify: `server/src/services/withdrawalService.js:1-11` (imports), `:39-42` (guard)
- Test: `server/tests/unit/withdrawal.limit.test.js` (new)

**Interfaces:**
- Produces: `withdrawalLimitFor(tier) → number` (paise). `WITHDRAWAL_LIMIT_PAISE = { silver: 3000000, gold: 5000000, diamond: 10000000 }`. `initiateWithdrawal` throws `ApiError(400, 'Amount exceeds your withdrawal limit')` when `amount > withdrawalLimitFor(user.tier)`.

- [ ] **Step 1: Write the failing test**

Create `server/tests/unit/withdrawal.limit.test.js`:

```js
'use strict'

process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { initiateWithdrawal } = require('../../src/services/withdrawalService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function userWithBalance(tier, balancePaise) {
  const referralCode = await generateUniqueCode()
  const user = await User.create({
    name: 'W', email: `w-${Date.now()}-${Math.random()}@t.com`,
    passwordHash: 'x', referralCode, tier,
  })
  await Wallet.create({ user: user._id, balance: balancePaise })
  return user
}

test('rejects a withdrawal above the silver tier limit', async () => {
  const user = await userWithBalance('silver', 10000000) // ₹1,00,000 balance
  await expect(
    initiateWithdrawal(user, { amount: 3000001, upiId: 'a@okhdfc' }) // ₹30,000.01
  ).rejects.toMatchObject({ statusCode: 400 })
})

test('allows a withdrawal at the diamond tier limit', async () => {
  const user = await userWithBalance('diamond', 20000000) // ₹2,00,000 balance
  const w = await initiateWithdrawal(user, { amount: 10000000, upiId: 'a@okhdfc' }) // ₹1,00,000
  expect(w.gross).toBe(10000000)
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `server/`): `npm test -- withdrawal.limit.test.js`
Expected: FAIL — the silver case resolves instead of rejecting (no limit enforced yet). (If `Wallet` model field differs, mirror an existing wallet-service test's setup; the assertion on the 400 is the target.)

- [ ] **Step 3: Create the limits module**

Create `server/src/config/limits.js`:

```js
'use strict'

// Per-tier withdrawal caps, in paise. Mirrored client-side in WithdrawPage.tsx.
const WITHDRAWAL_LIMIT_PAISE = {
  silver: 3000000, // ₹30,000
  gold: 5000000, // ₹50,000
  diamond: 10000000, // ₹1,00,000
}

function withdrawalLimitFor(tier) {
  return WITHDRAWAL_LIMIT_PAISE[tier] ?? WITHDRAWAL_LIMIT_PAISE.silver
}

module.exports = { WITHDRAWAL_LIMIT_PAISE, withdrawalLimitFor }
```

- [ ] **Step 4: Enforce the cap in the service**

In `server/src/services/withdrawalService.js`, add the import after line 12 (`const { cacheDel } = require('../config/redis')`):

```js
const { withdrawalLimitFor } = require('../config/limits')
```

Then inside `initiateWithdrawal`, immediately after `const { amount } = body` (line 40), add the guard:

```js
  const limit = withdrawalLimitFor(user.tier)
  if (amount > limit) {
    throw new ApiError(400, 'Amount exceeds your withdrawal limit')
  }
```

- [ ] **Step 5: Run the tests to verify they pass**

Run (from `server/`): `npm test -- withdrawal.limit.test.js`
Expected: PASS (both cases).

- [ ] **Step 6: Run the withdrawal suite for regressions**

Run (from `server/`): `npm test -- withdrawal`
Expected: PASS. (Existing withdrawal tests use small amounts under ₹30,000; if one uses a `silver` user withdrawing above ₹30,000, lower the amount or set the user's `tier` to `diamond`.)

- [ ] **Step 7: Commit**

```bash
git add server/src/config/limits.js server/src/services/withdrawalService.js server/tests/unit/withdrawal.limit.test.js
git commit -m "feat(server): enforce per-tier withdrawal limits"
```

---

### Task 4: Backend — fix `[object Object]` plan name in deposit-request email

**Files:**
- Modify: `server/src/services/investmentService.js:76`
- Test: `server/tests/unit/email.service.test.js` (add a case)

**Interfaces:**
- Consumes: `emailService.depositSubmitted(user, inv, planName)` where `planName` is a **string**.
- Produces: `investmentService.createInvestment` passes `plan.name` (a string) instead of the whole Mongoose `plan` document.

**Root cause:** `investmentService.js:76` calls `email.depositSubmitted(user, investment, plan)` passing the full plan document. In `depositSubmitted`, `planLabel = planName || …`, and `escapeHtml(planLabel)` stringifies the document — rendering the raw object in the email (see screenshot).

- [ ] **Step 1: Write the failing test**

Append to `server/tests/unit/email.service.test.js`:

```js
test('depositSubmitted renders the plan name, not an object', async () => {
  const email = require('../../src/services/emailService')
  const user = { _id: 'u1', name: 'Nikhil', email: 'n@t.com' }
  const inv = { amount: 300000, expectedReturn: 75000, referenceCode: 'ASM-1', planKey: 'silver', createdAt: new Date() }
  const msg = await email.depositSubmitted(user, inv, 'Silver')
  expect(msg.message).toContain('Silver')
  expect(msg.message).not.toContain('ObjectId')
  expect(msg.message).not.toContain('[object Object]')
})
```

> Note: in test env `sendMail` uses `jsonTransport`, so the returned info's `.message` is the raw MIME (a Buffer/string) containing the HTML. If `msg.message` is a Buffer, wrap with `String(msg.message)`. Confirm against the existing `passwordResetOtp` test's assertion style at the top of the file and match it.

- [ ] **Step 2: Run the test to verify it passes already for the string path**

Run (from `server/`): `npm test -- email.service.test.js`
Expected: PASS for this case (the bug is in the *caller*, not `depositSubmitted`). This test locks in the contract.

- [ ] **Step 3: Fix the caller**

In `server/src/services/investmentService.js`, line 76, pass the plan **name**:

```js
  email.depositSubmitted(user, investment, plan.name).catch(() => {}) // fire-and-forget
```

- [ ] **Step 4: Run the investment tests**

Run (from `server/`): `npm test -- investment`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/investmentService.js server/tests/unit/email.service.test.js
git commit -m "fix(server): send plan name (not object) in deposit-request email"
```

---

### Task 5: Backend — remove anti-phishing block from all emails

**Files:**
- Modify: `server/src/services/emailService.js` — remove `antiPhishingCode` (lines 120-130), the header note comment (199-204), the `const code` line + Anti-Phishing header cell inside `emailShell` (206, 268-280), and the `.asm-phish` media-query rule (line 234).

**Interfaces:**
- Produces: `emailShell(userId, bodyHtml)` keeps its signature (all callers unchanged); `userId` is simply no longer read. Every email renders without the "Anti-Phishing Code" header chip.

- [ ] **Step 1: Delete the code generator**

Remove the entire `antiPhishingCode` function block in `server/src/services/emailService.js` (lines 120-130, the comment `/** Generate a deterministic 8-char … */` through the closing `}`):

```js
/**
 * Generate a deterministic 8-char anti-phishing code from the user's _id.
 */
function antiPhishingCode(userId) {
  const hex = String(userId || 'ASMUSER')
  let h = 0
  for (let i = 0; i < hex.length; i++) {
    h = (Math.imul(31, h) + hex.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(36).toUpperCase().slice(0, 8).padStart(8, '0')
}
```

- [ ] **Step 2: Remove the explanatory note comment**

Remove the comment block directly above `function emailShell` (lines 199-204):

```js
/**
 * NOTE: The anti-phishing code is a deterministic hash of the user's MongoDB _id.
 * It is displayed in every email so users can spot spoofed emails that don't know
 * their personal code. To allow users to verify it on the website, consider storing
 * it in the User model (e.g. user.antiPhishingCode).
 */
```

- [ ] **Step 3: Remove `const code` from `emailShell`**

Inside `emailShell`, delete line 206:

```js
  const code = antiPhishingCode(userId)
```

so the function body starts directly with `return \`<!DOCTYPE html> …`.

- [ ] **Step 4: Remove the Anti-Phishing header cell**

In the header `<table>`, delete the entire Anti-Phishing `<td>` block (lines 268-280):

```html
                  <!-- Anti-Phishing Code -->
                  <td align="right" class="asm-phish" style="vertical-align:middle;">
                    <table cellpadding="0" cellspacing="0" align="right">
                      <tr>
                        <td style="padding-right:8px;font-size:12px;font-weight:600;color:#4b5563;white-space:nowrap;">Anti-Phishing Code:</td>
                        <td>
                          <div style="border:1.5px solid ${C.accent};border-radius:4px;padding:4px 10px;font-size:14px;font-weight:700;letter-spacing:1.5px;color:${C.accent};background-color:${C.accentSoft};text-align:center;">
                            ${code}
                          </div>
                        </td>
                      </tr>
                    </table>
                  </td>
```

The brand-logo `<td>` (lines 250-266) remains as the sole cell in that header row.

- [ ] **Step 5: Remove the now-unused `.asm-phish` responsive rule**

In the `<style>` block, delete line 234:

```css
      .asm-phish { display: block !important; text-align: left !important; padding-top: 10px !important; }
```

- [ ] **Step 6: Verify nothing else references the removed symbols**

Run (from `server/`): `grep -n "antiPhishing\|asm-phish\|Anti-Phishing\|const code" src/services/emailService.js`
Expected: no matches (the OTP `.asm-code` class is different — do not touch it).

- [ ] **Step 7: Run the email tests**

Run (from `server/`): `npm test -- email.service.test.js`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add server/src/services/emailService.js
git commit -m "chore(server): remove static anti-phishing code from emails"
```

---

### Task 6: Backend — fix 404 support link in emails

**Files:**
- Modify: `server/src/services/emailService.js` — support links (lines 442, 541, 576, 759, 872) and wallet link (line 516).

**Interfaces:**
- Produces: all in-email links point at real routes. The app support route is `/app/support`; there is no `/support` or `/wallet` route (both 404). Wallet balance lives on `/app/account`.

- [ ] **Step 1: Fix every support link**

In `server/src/services/emailService.js`, replace all `${env.FRONTEND_URL}/support` with `${env.FRONTEND_URL}/app/support`. There are 5 occurrences (withdrawalInitiated:442, withdrawalCompleted:541, **withdrawalRejected:576** ← the screenshot's email, welcome:759, depositApproved:872).

Run this exact replacement (from `server/`), then eyeball the diff:

```bash
sed -i '' 's#${env.FRONTEND_URL}/support#${env.FRONTEND_URL}/app/support#g' src/services/emailService.js
```

- [ ] **Step 2: Fix the wallet link (same class of 404)**

In `withdrawalCompleted`, line 516, change `${env.FRONTEND_URL}/wallet` to `${env.FRONTEND_URL}/app/account`:

```html
      You can check the updated wallet balance <a href="${env.FRONTEND_URL}/app/account" class="asm-accent" style="color:${C.accent};text-decoration:underline;">here</a>
```

- [ ] **Step 3: Verify no bare `/support` or `/wallet` links remain**

Run (from `server/`): `grep -n "FRONTEND_URL}/support\|FRONTEND_URL}/wallet" src/services/emailService.js`
Expected: no matches. Then `grep -n "FRONTEND_URL}/app/support" src/services/emailService.js` → 5 matches.

- [ ] **Step 4: Run the email tests**

Run (from `server/`): `npm test -- email.service.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/emailService.js
git commit -m "fix(server): point email support/wallet links at real app routes"
```

---

### Task 7: Backend — remove Binance Pay & Trust Wallet from Settings

**Files:**
- Modify: `server/src/models/Settings.js` (schema + `toPublic`)
- Modify: `server/src/validation/schemas.js:84-112` (`updateSettingsSchema`)
- Modify: `server/src/controllers/settingsController.js:9-14` (`IMAGE_KEYS`)
- Test: `server/tests/unit/settingsModel.test.js`, `server/tests/integration/settings.routes.test.js`

**Interfaces:**
- Produces: `methods` becomes `{ usdtCrypto, whatsapp, telegram, inrQr }` (replaces `trustWallet` + `binancePay` with a single `usdtCrypto` toggle). All `binancePay*` scalar fields and the `binance-qr` image key are removed. Public shape drops `binancePayId/Name/Link/QrUrl`. Consumed by frontend Tasks 11 & 12.

- [ ] **Step 1: Update the model unit test**

In `server/tests/unit/settingsModel.test.js`:

Replace lines 23-25 (`defaults are sensible` body) with:

```js
    expect(s.inrThresholdPaise).toBe(200000)
    expect(s.methods.usdtCrypto).toBe(true)
    expect(s.methods.inrQr).toBe(true)
```

Replace the `toPublic` key list (lines 31-41) with:

```js
    expect(Object.keys(pub).sort()).toEqual(
      [
        'inrQrUrl', 'inrThresholdPaise', 'methods',
        'telegramUsername', 'usdtBep20Address', 'usdtBep20QrUrl',
        'usdtTrc20Address', 'usdtTrc20QrUrl', 'whatsappNumber',
      ].sort()
    )
    expect(pub.methods).toEqual({
      usdtCrypto: true, whatsapp: true, telegram: true, inrQr: true,
    })
```

- [ ] **Step 2: Update the settings route integration test**

In `server/tests/integration/settings.routes.test.js`:
- Line 37: replace `expect(res.body.settings.binancePayName).toBe('ASM Coins')` with `expect(res.body.settings.methods.usdtCrypto).toBe(true)`.
- Lines 41 and 50: replace `.send({ binancePayId: 'x' })` with `.send({ inrThresholdPaise: 300000 })`.
- Line 64: replace `methods: { binancePay: false },` with `methods: { usdtCrypto: false },`.
- Line 71: replace `expect(res.body.settings.methods.binancePay).toBe(false)` with `expect(res.body.settings.methods.usdtCrypto).toBe(false)`.

- [ ] **Step 3: Run the tests to verify they fail**

Run (from `server/`): `npm test -- settings`
Expected: FAIL (model still exposes binance fields / `trustWallet`).

- [ ] **Step 4: Update the Settings model**

In `server/src/models/Settings.js`:

Replace `methodsSchema` (lines 5-14) with:

```js
const methodsSchema = new Schema(
  {
    usdtCrypto: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: true },
    telegram: { type: Boolean, default: true },
    inrQr: { type: Boolean, default: true },
  },
  { _id: false }
)
```

Remove the four `binancePay*` field lines (30-33) from `settingsSchema`.

In `toPublic` (lines 52-73), remove the four `binancePay*` lines and update the `methods` object:

```js
settingsSchema.methods.toPublic = function toPublic() {
  return {
    inrThresholdPaise: this.inrThresholdPaise,
    inrQrUrl: this.inrQrUrl,
    usdtTrc20Address: this.usdtTrc20Address,
    usdtBep20Address: this.usdtBep20Address,
    usdtTrc20QrUrl: this.usdtTrc20QrUrl,
    usdtBep20QrUrl: this.usdtBep20QrUrl,
    whatsappNumber: this.whatsappNumber,
    telegramUsername: this.telegramUsername,
    methods: {
      usdtCrypto: this.methods.usdtCrypto,
      whatsapp: this.methods.whatsapp,
      telegram: this.methods.telegram,
      inrQr: this.methods.inrQr,
    },
  }
}
```

- [ ] **Step 5: Update the validation schema**

In `server/src/validation/schemas.js`, replace `updateSettingsSchema` (lines 84-112) so the `binancePay*` scalars are gone and `methods` uses the new keys:

```js
const updateSettingsSchema = z
  .object({
    inrThresholdPaise: z.number().int().min(0).optional(),
    usdtTrc20Address: z.string().trim().optional(),
    usdtBep20Address: z.string().trim().optional(),
    whatsappNumber: z
      .string()
      .transform((v) => v.replace(/\D/g, ''))
      .optional(),
    telegramUsername: z
      .string()
      .transform((v) => v.trim().replace(/^@/, ''))
      .optional(),
    methods: z
      .object({
        usdtCrypto: z.boolean().optional(),
        whatsapp: z.boolean().optional(),
        telegram: z.boolean().optional(),
        inrQr: z.boolean().optional(),
      })
      .optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Provide at least one field to update',
  })
```

- [ ] **Step 6: Remove the Binance image key**

In `server/src/controllers/settingsController.js`, remove the `'binance-qr'` line from `IMAGE_KEYS` (line 13) so it reads:

```js
const IMAGE_KEYS = {
  'inr-qr': 'inrQrUrl',
  'usdt-trc20-qr': 'usdtTrc20QrUrl',
  'usdt-bep20-qr': 'usdtBep20QrUrl',
}
```

- [ ] **Step 7: Sweep for stragglers**

Run (from `server/`): `grep -rn "binancePay\|trustWallet\|binance-qr" src/`
Expected: no matches. Fix any that remain.

- [ ] **Step 8: Run the full backend suite**

Run (from `server/`): `npm test`
Expected: PASS (settings suite green; no other suite references binance/trustWallet).

- [ ] **Step 9: Commit**

```bash
git add server/src/models/Settings.js server/src/validation/schemas.js server/src/controllers/settingsController.js server/tests/unit/settingsModel.test.js server/tests/integration/settings.routes.test.js
git commit -m "feat(server): drop Binance Pay & Trust Wallet, add usdtCrypto toggle"
```

---

### Task 8: Frontend — investment term 36h → 24h (copy)

**Files (all under `client/src/`):**
- `components/sections/TierPlanCard.tsx:16`
- `components/sections/HeroBanner.tsx:33`
- `components/landing/LandingChrome.tsx:205`
- `components/app/MarketTicker.tsx:100`
- `pages/landing/LandingPage.tsx:52, 57, 76, 77, 78, 84, 215`
- `pages/app/HomePage.tsx:50, 51, 52, 162`
- `pages/app/ReferralPage.tsx:47, 54, 61`
- `pages/app/PackageDetailPage.tsx:27`

**Interfaces:** none — pure display strings. Do **not** touch `durationHours`-driven text (`PackageDetailPage:183`, `InvestSummaryPage:123`, `SilverTierPage:17`, `PlanBenefitsPage:69`); those already read the DB value, which is now 24 (Task 1).

- [ ] **Step 1: Replace every investment-term string**

Apply these exact substitutions (leave all "3-hour"/"3 Hours" payout copy untouched):

- `TierPlanCard.tsx:16` — `duration = '36 Hours',` → `duration = '24 Hours',`
- `HeroBanner.tsx:33` — `36-Hour Cycles` → `24-Hour Cycles`
- `LandingChrome.tsx:205` — `'36-hour defined terms'` → `'24-hour defined terms'`
- `MarketTicker.tsx:100` — `title: '36-Hour Term'` → `title: '24-Hour Term'`
- `LandingPage.tsx:52` — `label: '36-Hour Cycles'` → `label: '24-Hour Cycles'`
- `LandingPage.tsx:57` — `value: '36 Hours', label: 'Cycle Duration'` → `value: '24 Hours', label: 'Cycle Duration'`
- `LandingPage.tsx:76,77,78` — each `duration: '36 Hours'` → `duration: '24 Hours'`
- `LandingPage.tsx:84` — `Follow your 36-hour investment` → `Follow your 24-hour investment`
- `LandingPage.tsx:215` — `time-boxed 36-hour investment platform` → `time-boxed 24-hour investment platform`
- `HomePage.tsx:50,51,52` — each `duration: '36 Hours'` → `duration: '24 Hours'`
- `HomePage.tsx:162` — `in 36 hours.` → `in 24 hours.`
- `ReferralPage.tsx:47,54,61` — each `Returns in 36h` → `Returns in 24h`
- `PackageDetailPage.tsx:27` — `Calculated and paid at term maturity (36 hours)` → `Calculated and paid at term maturity (24 hours)`

- [ ] **Step 2: Verify no stray investment-term strings remain**

Run (from `client/`):

```bash
grep -rn "36" src --include="*.tsx" --include="*.ts" | grep -iE "hour|term|cycle|36h"
```

Expected: no matches. (Any remaining `3 Hours`/`3-Hour` payout hits are fine — they contain "3" not "36".)

- [ ] **Step 3: Typecheck + lint**

Run (from `client/`): `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add client/src
git commit -m "feat(client): update investment term copy to 24h"
```

---

### Task 9: Frontend — deposit presets & tier limit displays

**Files (all under `client/src/`):**
- `pages/app/PackageDetailPage.tsx:35` (Silver Starter), `:43` (Gold Max), `:49` (Diamond Max)
- `pages/landing/LandingPage.tsx:77, 78` (gold/diamond max)
- `pages/app/HomePage.tsx:51, 52` (gold/diamond max)
- `pages/app/ReferralPage.tsx:54, 61` (invest-up-to)
- `components/sections/InvestmentGridGold.tsx:94` (gold max display)

**Interfaces:** display + quick-pick values only; server enforces the real caps (Task 2).

- [ ] **Step 1: Silver Starter ₹3,000 → ₹2,000**

In `PackageDetailPage.tsx`, line 35 (Min Entry stays ₹1,000 at line 34):

```js
    { id: 's2', label: 'Starter', rupees: 2000 },
```

- [ ] **Step 2: Update Gold/Diamond quick-pick max limits**

In `PackageDetailPage.tsx`, line 43 (Gold Max Limit) and line 49 (Diamond Max Limit):

```js
    { id: 'g4', label: 'Max Limit', rupees: 300000 },
```
```js
    { id: 'd4', label: 'Max Limit', rupees: 500000 },
```

(Leave the Gold/Diamond "Starter" and "Growth" presets as-is — they remain within the new range.)

- [ ] **Step 3: Update marketing max displays**

- `LandingPage.tsx:77` — `max: '₹50,000'` → `max: '₹3,00,000'`
- `LandingPage.tsx:78` — `max: '₹1,00,000'` → `max: '₹5,00,000'`
- `HomePage.tsx:51` — `max: '₹50,000'` → `max: '₹3,00,000'`
- `HomePage.tsx:52` — `max: '₹1,00,000'` → `max: '₹5,00,000'`
- `ReferralPage.tsx:54` — `'Invest up to ₹50,000'` → `'Invest up to ₹3,00,000'`
- `ReferralPage.tsx:61` — `'Invest up to ₹1,00,000'` → `'Invest up to ₹5,00,000'`
- `InvestmentGridGold.tsx:94` — `₹50,000` → `₹3,00,000`

- [ ] **Step 4: Typecheck + lint**

Run (from `client/`): `npm run build && npm run lint`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add client/src
git commit -m "feat(client): silver starter ₹2,000 + gold/diamond deposit caps"
```

---

### Task 10: Frontend — per-tier withdrawal cap in WithdrawPage

**Files:**
- Modify: `client/src/pages/app/WithdrawPage.tsx:32` (constant), `:89, 216, 409` (usages)

**Interfaces:**
- Consumes: `user.tier` from `useAuth()` (already imported at line 58: `const { user } = useAuth()`).
- Mirrors the server caps from Task 3.

- [ ] **Step 1: Replace the flat max constant with a per-tier map**

In `WithdrawPage.tsx`, replace line 32 (`const MAX_WITHDRAWAL_RS = 100_000`) with:

```ts
const MAX_WITHDRAWAL_BY_TIER: Record<'silver' | 'gold' | 'diamond', number> = {
  silver: 30_000,
  gold: 50_000,
  diamond: 1_00_000,
}
```

- [ ] **Step 2: Derive the active cap from the user's tier**

Inside `WithdrawPage`, right after `const balanceRs = balancePaise / 100` (line 79), add:

```ts
  const maxWithdrawalRs = MAX_WITHDRAWAL_BY_TIER[user?.tier ?? 'silver']
```

- [ ] **Step 3: Point the validation and display at `maxWithdrawalRs`**

- Line 89: `if (validRs > MAX_WITHDRAWAL_RS) return \`Maximum withdrawal is ₹${rupeesCompact(MAX_WITHDRAWAL_RS)}.\`` → replace both `MAX_WITHDRAWAL_RS` with `maxWithdrawalRs`.
- Line 216: `Max <span …>₹{rupeesCompact(MAX_WITHDRAWAL_RS)}</span>` → `maxWithdrawalRs`.
- Line 409: `<Strong>₹{rupeesCompact(MAX_WITHDRAWAL_RS)}</Strong>.` → `maxWithdrawalRs`.

- [ ] **Step 4: Verify the old constant is fully gone**

Run (from `client/`): `grep -n "MAX_WITHDRAWAL_RS" src/pages/app/WithdrawPage.tsx`
Expected: no matches.

- [ ] **Step 5: Typecheck + lint**

Run (from `client/`): `npm run build && npm run lint`
Expected: PASS. (`user.tier` type must include `'silver' | 'gold' | 'diamond'`; if TS complains, confirm the `Tier` type in `@/types` and cast `user?.tier` accordingly.)

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/app/WithdrawPage.tsx
git commit -m "feat(client): per-tier withdrawal caps in WithdrawPage"
```

---

### Task 11: Frontend — USDT-only crypto payment method

**Files (all under `client/src/`):**
- `config/payment.ts` (types + helpers)
- `services/api/settings.ts` (`PublicSettings` shape)
- `pages/app/PaymentMethodPage.tsx` (USDT section, method routing, label map, remove Binance)

**Interfaces:**
- Consumes: `settings.methods.usdtCrypto` (Task 7).
- Produces: `PaymentMethodId = 'usdt' | 'whatsapp' | 'telegram'`. USDT section shows the TRC20/BEP20 QR flow directly; no Trust Wallet / Binance Pay chooser.

- [ ] **Step 1: Update the payment config types & helpers**

In `client/src/config/payment.ts`:

Line 13 — narrow the id union and drop `deriveBinancePay`:

```ts
export type PaymentMethodId = 'usdt' | 'whatsapp' | 'telegram'
```

Delete the `deriveBinancePay` function (lines 49-56).

Replace `isMethodConfigured` (lines 83-94) so `'usdt'` replaces the two crypto cases:

```ts
export function isMethodConfigured(s: PublicSettings, method: PaymentMethodId): boolean {
  switch (method) {
    case 'usdt':
      return s.methods.usdtCrypto && deriveUsdtWallets(s).length > 0
    case 'whatsapp':
      return s.methods.whatsapp && deriveWhatsapp(s).number.length > 0
    case 'telegram':
      return s.methods.telegram && deriveTelegram(s).username.length > 0
  }
}
```

- [ ] **Step 2: Update the client Settings type**

In `client/src/services/api/settings.ts`, `PublicSettings` (lines 5-25): remove the four `binancePay*` string fields, and change the `methods` block:

```ts
  methods: {
    usdtCrypto: boolean
    whatsapp: boolean
    telegram: boolean
    inrQr: boolean
  }
```

Also update `SettingsImageKey` (line 34) to drop `'binance-qr'`:

```ts
export type SettingsImageKey = 'inr-qr' | 'usdt-trc20-qr' | 'usdt-bep20-qr'
```

(`SettingsUpdate`'s `Omit` at line 30 references `'binancePayQrUrl'` — remove that entry from the union since the field no longer exists.)

- [ ] **Step 3: Replace the USDT section's method chooser**

In `client/src/pages/app/PaymentMethodPage.tsx`, replace the two-button grid (lines 340-363, the `<div className="grid grid-cols-2 gap-3">…</div>` with the Trust Wallet + Binance Pay `MethodButton`s) with a single full-width USDT button:

```tsx
            <MethodButton
              method="usdt"
              title="USDT (TRC20 / BEP20)"
              subtitle="Scan the QR to pay"
              icon={<TetherIcon className="size-5 text-asm-greenInk" />}
              iconClassName="bg-asm-green-tint"
              settings={settings}
              pending={pending === 'usdt'}
              disabled={!hasSelection || Boolean(pending)}
              onSelect={handleSelect}
            />
```

- [ ] **Step 4: Update the method label map**

Lines 54-57 (`METHOD_LABEL`): remove `'trust-wallet'` and `'binance-pay'`, add `'usdt'`:

```ts
const METHOD_LABEL: Record<PaymentMethodId, string> = {
  usdt: 'USDT (Crypto)',
  whatsapp: 'WhatsApp',
  telegram: 'Telegram',
}
```

- [ ] **Step 5: Route the detail view to the USDT QR**

In the `MethodDetail` render (around lines 609-630), replace the two crypto branches with one. Change:

```tsx
      {method === 'trust-wallet' && (
        <UsdtInstructions settings={settings} copied={copied} onCopy={copy} />
      )}
      {method === 'binance-pay' && (
        <BinanceInstructions settings={settings} copied={copied} onCopy={copy} />
      )}
```

to:

```tsx
      {method === 'usdt' && (
        <UsdtInstructions settings={settings} copied={copied} onCopy={copy} />
      )}
```

And the proof-of-payment gate at line 629 (`method === 'trust-wallet' || method === 'binance-pay'`) becomes:

```tsx
      {method === 'usdt' && (
```

- [ ] **Step 6: Delete the Binance-only pieces**

Remove the `BinanceInstructions` component definition, the `deriveBinancePay` import (line 21), and the `BnbIcon` import/definition (used only by the removed Binance card). In `UsdtInstructions`, change the fallback `<UnavailableNotice method="Trust Wallet" />` (line 687) to `<UnavailableNotice method="USDT" />`, and the instruction string `Open Trust Wallet and choose USDT on ${active.network}.` (line 746) to `Open your wallet and choose USDT on ${active.network}.`

- [ ] **Step 7: Sweep for stragglers**

Run (from `client/`): `grep -rn "trust-wallet\|binance\|Binance\|Trust Wallet\|BnbIcon\|deriveBinancePay" src/`
Expected: no matches.

- [ ] **Step 8: Typecheck + lint**

Run (from `client/`): `npm run build && npm run lint`
Expected: PASS. (TS will flag any missed `binancePay`/`trust-wallet` reference — resolve each until green.)

- [ ] **Step 9: Commit**

```bash
git add client/src/config/payment.ts client/src/services/api/settings.ts client/src/pages/app/PaymentMethodPage.tsx
git commit -m "feat(client): USDT-only crypto payment (TRC20/BEP20 QR)"
```

---

### Task 12: Frontend — Settings panel cleanup (admin)

**Files:**
- Modify: `client/src/pages/admin/AdminSettings.tsx`

**Interfaces:**
- Consumes: the new `PublicSettings` shape (Task 11 Step 2) and `usdtCrypto` toggle (Task 7).
- Produces: admin panel keeps only TRC20/BEP20 QR uploads for crypto; no Binance section; availability list uses `usdtCrypto`.

- [ ] **Step 1: Drop Binance fields from the form type & reset/submit**

In `AdminSettings.tsx`:
- `FormValues` (lines 10-26): remove `binancePayId`, `binancePayName`, `binancePayLink`; change `methods` to `{ usdtCrypto: boolean; whatsapp: boolean; telegram: boolean; inrQr: boolean }`.
- `reset({…})` (lines 42-52): remove the three `binancePay*` lines.
- `onSubmit` payload (lines 56-66): remove the three `binancePay*` lines.

- [ ] **Step 2: Remove the Binance Pay section**

Delete the entire `<Section title="Binance Pay">…</Section>` block (lines 136-153), including its `binance-qr` `ImageUploadField`.

- [ ] **Step 3: Update the availability list**

In the `Section title="Payment methods available"` array (lines 167-174), replace the Trust Wallet and Binance rows with a single USDT row:

```tsx
            [
              ['methods.usdtCrypto', 'USDT (Crypto)'],
              ['methods.whatsapp', 'WhatsApp (INR)'],
              ['methods.telegram', 'Telegram (INR)'],
              ['methods.inrQr', 'INR direct QR'],
            ] as const
```

- [ ] **Step 4: Update the image-key map**

In `ImageUploadField.onFile`, the `map` (lines 265-270) — remove the `'binance-qr'` entry so it only has `inr-qr`, `usdt-trc20-qr`, `usdt-bep20-qr`.

- [ ] **Step 5: Sweep + typecheck + lint**

Run (from `client/`):

```bash
grep -n "binance\|Binance" src/pages/admin/AdminSettings.tsx
npm run build && npm run lint
```

Expected: no grep matches; build + lint PASS.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/admin/AdminSettings.tsx
git commit -m "feat(client): admin settings keep only USDT TRC20/BEP20 QR"
```

---

### Task 13: Frontend — tier-specific profile banner

**Files:**
- Modify: `client/src/pages/app/AccountPage.tsx:262` (tier already read), `:289-294` (gradient strip)

**Interfaces:**
- Consumes: `tier` (already `const tier = user?.tier ?? null` at line 262).
- Produces: the identity-card header strip renders a Silver (metallic grey), Gold (amber), or Diamond (icy blue) themed gradient instead of the fixed blue→green. Status pill + avatar keep reading in white — all three gradients stay dark enough for white overlay text.

- [ ] **Step 1: Add a tier→gradient map**

In `AccountPage.tsx`, above the `AccountPage` component (near the other module-scope helpers), add:

```ts
// Tier-specific header gradients for the identity card. All are dark enough
// to keep the white status pill and avatar ring legible.
const TIER_BANNER: Record<'silver' | 'gold' | 'diamond', string> = {
  silver: 'linear-gradient(135deg, #6B7280 0%, #9CA3AF 45%, #4B5563 100%)',
  gold: 'linear-gradient(135deg, #B45309 0%, #F59E0B 50%, #92400E 100%)',
  diamond: 'linear-gradient(135deg, #0EA5E9 0%, #38BDF8 45%, #1E3A8A 100%)',
}
const DEFAULT_BANNER = 'linear-gradient(135deg, #0B4FD8 0%, #15803D 100%)'
```

- [ ] **Step 2: Drive the gradient strip from tier**

Replace the header strip `style` (line 293):

```tsx
            style={{ background: tier ? TIER_BANNER[tier] : DEFAULT_BANNER }}
```

- [ ] **Step 3: Typecheck + lint**

Run (from `client/`): `npm run build && npm run lint`
Expected: PASS. (If TS narrows `tier` to a broader string, index with `tier as 'silver' | 'gold' | 'diamond'` or reuse the `Tier` type from `@/types`.)

- [ ] **Step 4: Manual visual check**

Run (from `client/`): `npm run dev`, open `/app/account` while signed in as each tier (or temporarily hardcode `tier`), confirm: Silver = metallic grey, Gold = amber, Diamond = icy blue, and the white "Active" pill + avatar remain legible on all three.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/app/AccountPage.tsx
git commit -m "feat(client): tier-specific profile banner (silver/gold/diamond)"
```

---

## Self-Review

**Spec coverage:**
1. Deposit page 36h→24h + Silver Starter ₹2,000 (min ₹1,000) → Tasks 1 (term), 8 (copy), 9 (Starter). ✅
2. Remove Trust Wallet + Binance Pay from USDT, add TRC20/BEP20 QR, same in Settings panel → Tasks 7 (backend), 11 (deposit page), 12 (admin panel). ✅
3. Investment-request email object-instead-of-name → Task 4. ✅
4. Withdrawal limits (30K/50K/1L) + deposit limits (Gold 3L, Diamond 5L) → Tasks 2, 3, 9, 10. ✅
5. Tier-specific profile banner → Task 13. ✅
6. Remove anti-phishing code from all emails → Task 5. ✅
7. Fix 404 support link in the withdrawal-rejected email → Task 6. ✅

**Placeholder scan:** No TBD/"handle edge cases"/vague steps — every code step shows exact code; every verify step shows a command + expected result.

**Type consistency:** `usdtCrypto` used identically in Settings model, validation schema, `PublicSettings` (server `toPublic` + client type), `isMethodConfigured`, and admin panel. `PaymentMethodId = 'usdt' | 'whatsapp' | 'telegram'` used in `METHOD_LABEL`, `MethodButton`, and `MethodDetail` routing. Withdrawal caps: server `WITHDRAWAL_LIMIT_PAISE` (paise) and client `MAX_WITHDRAWAL_BY_TIER` (rupees) hold the same ₹30k/50k/1L values.

**Ordering note:** Tasks 1→7 are backend (each leaves `npm test` green); 8→13 are frontend (each leaves `npm run build`/`lint` green). Task 2 finishes the `plan.model.test.js` edit that Task 1 Step 5 flagged — run them back-to-back.
