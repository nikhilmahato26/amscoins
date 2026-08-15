# Frontend Integration + Admin Panel + Leaderboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the mocked `client/` React app to the real ASM Coins backend, add the backend endpoints the client/admin still need (leaderboard, dashboard, admin stats), build a role-gated admin panel under `/admin/*`, add a daily/monthly/yearly investor leaderboard, and cover the critical flows with Playwright e2e tests.

**Architecture:** The backend (`server/`) gains three read/aggregate endpoints. The frontend (`client/`) gets a single typed API client (`src/lib/api.ts`) reading `VITE_API_URL`, a token-aware `AuthContext`, and TanStack Query for data fetching. Every page that reads a mock is repointed at a real endpoint. The admin panel is a set of `/admin/*` routes in the **same** client app (reusing auth/token/API client). Playwright drives the real client against a running server.

**Tech Stack:** Backend: Express 5, Mongoose 9, Jest+Supertest (existing). Frontend: React 19, Vite 8, react-router 7, react-hook-form + zod (existing) + **@tanstack/react-query 5** (new) + **@playwright/test** (new). Design work uses the `impeccable`, `frontend-design`, and `design-taste-frontend-v1` skills.

## Global Constraints

- **Money is integer paise end-to-end.** The API returns/accepts paise; the client converts to ₹ only for display via `src/lib/format.ts`. Never send rupees.
- **Tier thresholds:** Silver 0–10, Gold 11–20, Diamond 21+ (gold@11, diamond@21). The client's `ReferralPage` currently hardcodes gold=5/diamond=20 — fix to 11/21.
- **Visual authority:** the `theme-light-home` light theme (white bg, navy text, `asm-blue` #0B4FD8 primary, green profit accent) is the authoritative direction for ALL new surfaces (leaderboard, admin, payment-waiting) per `PRODUCT.md`. Mobile-first at 375px.
- **Never trust client amounts** — the server re-validates plan limits, tier gating, balance, and TDS. The client only mirrors server rules for UX.
- **Leaderboard:** rank by **sum of admin-approved deposit principal** in the period; display **full names** + rank + amount. Periods: `daily` (today), `monthly` (current calendar month), `yearly` (current calendar year), IST.
- **Admin panel lives in the client app** under `/admin/*`, gated by `RequireAuth role="admin"`.
- **Auth:** JWT stored client-side; the stored session shape is `{ token, user }` where `user` matches the backend `toPublic()` payload (`id, name, email, role, status, referralCode, referralCount, tier, createdAt`) — **no `password` field**.
- **Env supplied later:** build everything to run once `server/.env` and `client/.env` are provided. Tests that need a live server are written now; document how to run them.
- All backend changes keep the existing 64-test suite green.

---

## File Structure

### Backend (`server/`)
```
src/services/leaderboardService.js     # aggregate top investors per period
src/services/statsService.js           # admin dashboard counters
src/controllers/leaderboardController.js
src/controllers/dashboardController.js  # per-user portfolio summary
src/controllers/adminController.js      # (modify) + getStats
src/routes/leaderboardRoutes.js
src/routes/dashboardRoutes.js
src/routes/adminRoutes.js               # (modify) mount /stats
src/routes/index.js                     # (modify) mount new routers
```

### Frontend (`client/`)
```
.env.example                           # VITE_API_URL
src/lib/api.ts                         # fetch wrapper (base URL, token, errors)
src/lib/queryClient.ts                 # TanStack QueryClient
src/types/index.ts                     # (modify) align to backend payloads
src/auth/AuthContext.tsx               # (modify) store {token,user}
src/services/authService.ts            # (modify) real endpoints
src/services/api/*.ts                  # plans, investments, wallet, referral, withdrawals, leaderboard, dashboard, admin
src/hooks/*.ts                         # usePlans, useWallet, useReferral, useDashboard, useLeaderboard, admin hooks
src/pages/app/LeaderboardPage.tsx      # new
src/pages/admin/AdminLayout.tsx        # new
src/pages/admin/AdminDashboard.tsx     # new
src/pages/admin/AdminDeposits.tsx      # new
src/pages/admin/AdminWithdrawals.tsx   # new
src/pages/admin/AdminUsers.tsx         # new
src/pages/**                           # (modify) each mocked page repointed
src/App.tsx                            # (modify) add leaderboard + admin routes
src/main.tsx                           # (modify) wrap in QueryClientProvider
tests-e2e/*.spec.ts                    # Playwright specs
playwright.config.ts                   # new
```

---

# PHASE A — Backend additions

## Task A1: Leaderboard service + endpoint

**Files:**
- Create: `server/src/services/leaderboardService.js`
- Create: `server/src/controllers/leaderboardController.js`, `server/src/routes/leaderboardRoutes.js`
- Modify: `server/src/routes/index.js`
- Test: `server/tests/unit/leaderboard.service.test.js`, `server/tests/integration/leaderboard.routes.test.js`

**Interfaces:**
- Consumes: `Investment` (status `active` = approved), `User`.
- Produces `leaderboardService.js`: `periodStart(period, now = new Date())` → `Date` (start of today/month/year in IST); `topInvestors(period, limit = 20)` → `[{ rank, userId, name, tier, totalInvested }]` sorted desc by `totalInvested` (paise), ties broken by earliest first approval.
- Produces route: `GET /api/leaderboard?period=daily|monthly|yearly` (auth) → `{ period, entries: [...] }`.

- [ ] **Step 1: Write failing service test**

```js
process.env.JWT_SECRET = 'test'; process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const User = require('../../src/models/User')
const Investment = require('../../src/models/Investment')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { topInvestors } = require('../../src/services/leaderboardService')

beforeAll(setupDb); afterEach(clearDb); afterAll(teardownDb)

async function investor(name, amount, when = new Date()) {
  const code = await generateUniqueCode()
  const u = await User.create({ name, email: `${name}${Math.random()}@b.com`, passwordHash: 'x', referralCode: code })
  await Investment.create({ user: u._id, planKey: 'silver', amount, returnPct: 25, expectedReturn: amount*0.25,
    referenceCode: `ASM-${Math.random()}`, status: 'active', approvedAt: when, startAt: when })
  return u
}

test('ranks by total approved principal desc with names', async () => {
  await investor('Alice', 500000)
  await investor('Bob', 900000)
  const rows = await topInvestors('yearly')
  expect(rows[0].name).toBe('Bob')
  expect(rows[0].rank).toBe(1)
  expect(rows[0].totalInvested).toBe(900000)
  expect(rows[1].name).toBe('Alice')
})

test('daily excludes older approvals', async () => {
  const old = new Date(Date.now() - 3*24*3600*1000)
  await investor('Old', 999999, old)
  await investor('Fresh', 100000)
  const rows = await topInvestors('daily')
  expect(rows.map((r) => r.name)).toEqual(['Fresh'])
})
```

- [ ] **Step 2: Run — FAIL** (`Cannot find module leaderboardService`). `cd server && npm test -- leaderboard.service`

- [ ] **Step 3: Implement `leaderboardService.js`**

```js
const Investment = require('../models/Investment')

// IST day/month/year starts. IST is UTC+5:30 with no DST.
const IST_OFFSET_MS = 5.5 * 3600 * 1000
function periodStart(period, now = new Date()) {
  const ist = new Date(now.getTime() + IST_OFFSET_MS)
  let y = ist.getUTCFullYear(), m = ist.getUTCMonth(), d = ist.getUTCDate()
  if (period === 'monthly') d = 1
  if (period === 'yearly') { d = 1; m = 0 }
  const istMidnight = Date.UTC(y, m, d, 0, 0, 0)
  return new Date(istMidnight - IST_OFFSET_MS)
}

async function topInvestors(period, limit = 20) {
  const start = periodStart(period)
  const rows = await Investment.aggregate([
    { $match: { status: 'active', approvedAt: { $gte: start } } },
    { $group: { _id: '$user', totalInvested: { $sum: '$amount' }, firstAt: { $min: '$approvedAt' } } },
    { $sort: { totalInvested: -1, firstAt: 1 } },
    { $limit: limit },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'u' } },
    { $unwind: '$u' },
    { $project: { _id: 0, userId: '$_id', name: '$u.name', tier: '$u.tier', totalInvested: 1 } },
  ])
  return rows.map((r, i) => ({ rank: i + 1, ...r }))
}

module.exports = { periodStart, topInvestors }
```

- [ ] **Step 4: Run — PASS.**

- [ ] **Step 5: Controller + route + mount**

```js
// leaderboardController.js
const asyncHandler = require('../middleware/asyncHandler')
const { topInvestors } = require('../services/leaderboardService')
const { ApiError } = require('../middleware/errorHandler')
const VALID = ['daily', 'monthly', 'yearly']
const list = asyncHandler(async (req, res) => {
  const period = req.query.period || 'daily'
  if (!VALID.includes(period)) throw new ApiError(400, 'Invalid period')
  res.json({ period, entries: await topInvestors(period) })
})
module.exports = { list }
```
```js
// leaderboardRoutes.js
const router = require('express').Router()
const auth = require('../middleware/auth')
const { list } = require('../controllers/leaderboardController')
router.get('/', auth, list)
module.exports = router
```
In `routes/index.js` add: `router.use('/leaderboard', require('./leaderboardRoutes'))`.

- [ ] **Step 6: Integration test** — `leaderboard.routes.test.js`: seed two approved investments (via admin approve or direct `Investment.create` + auth token), `GET /api/leaderboard?period=yearly` → 200, `entries[0]` has `name`, `rank:1`, `totalInvested`. Invalid `?period=x` → 400. Unauthed → 401. Run — PASS.

- [ ] **Step 7: Commit** — `git commit -am "feat(server): investor leaderboard endpoint (daily/monthly/yearly)"`

---

## Task A2: Per-user dashboard summary endpoint

**Files:**
- Create: `server/src/controllers/dashboardController.js`, `server/src/routes/dashboardRoutes.js`
- Modify: `server/src/routes/index.js`
- Test: `server/tests/integration/dashboard.routes.test.js`

**Interfaces:**
- Consumes: `Wallet`, `Investment`, `User` (`req.user`).
- Produces: `GET /api/dashboard` (auth) → `{ balance, tier, referralCount, totals: { invested, expectedReturn, activeCount }, activeInvestments: [{ id, planKey, amount, expectedReturn, startAt, maturesAt }] }`. All money paise.

- [ ] **Step 1: Failing test** — register user, admin-approve a silver ₹2,000 deposit, `GET /api/dashboard` → `balance:200000`, `totals.invested:200000`, `totals.activeCount:1`, `tier:'silver'`.

- [ ] **Step 2: Implement `dashboardController.js`**

```js
const asyncHandler = require('../middleware/asyncHandler')
const Investment = require('../models/Investment')
const { getOrCreateWallet } = require('../services/walletService')
const summary = asyncHandler(async (req, res) => {
  const u = req.user
  const wallet = await getOrCreateWallet(u._id)
  const active = await Investment.find({ user: u._id, status: 'active' }).sort('-startAt')
  const totals = active.reduce((a, i) => ({
    invested: a.invested + i.amount, expectedReturn: a.expectedReturn + i.expectedReturn, activeCount: a.activeCount + 1,
  }), { invested: 0, expectedReturn: 0, activeCount: 0 })
  res.json({
    balance: wallet.balance, tier: u.tier, referralCount: u.referralCount, totals,
    activeInvestments: active.map((i) => ({ id: i._id, planKey: i.planKey, amount: i.amount,
      expectedReturn: i.expectedReturn, startAt: i.startAt, maturesAt: i.maturesAt })),
  })
})
module.exports = { summary }
```
Route `dashboardRoutes.js` (`GET / → summary`, auth); mount `router.use('/dashboard', ...)`. Run — PASS.

- [ ] **Step 3: Commit** — `git commit -am "feat(server): per-user dashboard summary endpoint"`

---

## Task A3: Admin stats endpoint

**Files:**
- Modify: `server/src/controllers/adminController.js` (add `getStats`), `server/src/routes/adminRoutes.js` (mount `GET /stats`)
- Test: `server/tests/integration/admin.stats.test.js`

**Interfaces:**
- Produces: `GET /api/admin/stats` (admin) → `{ users, pendingDeposits, pendingWithdrawals, totals: { invested, walletLiability } }`. `invested` = sum of active investment amounts; `walletLiability` = sum of wallet balances (paise).

- [ ] **Step 1: Failing test** — admin token, seed 1 pending deposit + 1 user, `GET /api/admin/stats` → `pendingDeposits:1`, `users >= 1`. Non-admin → 403.

- [ ] **Step 2: Implement `getStats`** in `adminController.js`

```js
const Wallet = require('../models/Wallet')
const getStats = asyncHandler(async (_req, res) => {
  const [users, pendingDeposits, pendingWithdrawals, invAgg, walAgg] = await Promise.all([
    User.countDocuments(),
    Investment.countDocuments({ status: 'pending' }),
    Withdrawal.countDocuments({ status: 'pending' }),
    Investment.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, s: { $sum: '$amount' } } }]),
    Wallet.aggregate([{ $group: { _id: null, s: { $sum: '$balance' } } }]),
  ])
  res.json({ users, pendingDeposits, pendingWithdrawals,
    totals: { invested: invAgg[0]?.s || 0, walletLiability: walAgg[0]?.s || 0 } })
})
```
Add `getStats` to exports; add `router.get('/stats', c.getStats)` in `adminRoutes.js`. Run — PASS.

- [ ] **Step 3: Commit** — `git commit -am "feat(server): admin dashboard stats endpoint"`

- [ ] **Step 4: Run full backend suite** — `cd server && npm test` → all green (67+ tests). Commit if any incidental fixes.

---

# PHASE B — Client API + auth foundation

## Task B1: API client + env + query client

**Files:**
- Create: `client/.env.example`, `client/src/lib/api.ts`, `client/src/lib/queryClient.ts`
- Modify: `client/package.json` (add `@tanstack/react-query`), `client/src/main.tsx`
- Test: manual (typecheck) — this task ships infra consumed by later tested tasks.

**Interfaces:**
- Produces `api.ts`: `getToken()`, `setToken(t|null)`, `apiFetch<T>(path, { method?, body?, auth? }) => Promise<T>` — prefixes `import.meta.env.VITE_API_URL`, attaches `Authorization: Bearer` when a token exists, JSON-encodes body, throws `ApiError { status, message }` on non-2xx (message from `body.error`).
- Produces `queryClient.ts`: a configured `QueryClient`.

- [ ] **Step 1: Add dep + env**

```bash
cd client && npm i @tanstack/react-query
```
`client/.env.example`:
```
VITE_API_URL=http://localhost:4000/api
```

- [ ] **Step 2: Implement `src/lib/api.ts`**

```ts
const BASE = import.meta.env.VITE_API_URL ?? '/api'
const TOKEN_KEY = 'asm_token'

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string | null) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY)

interface Opts { method?: string; body?: unknown; auth?: boolean }
export async function apiFetch<T>(path: string, { method = 'GET', body, auth = true }: Opts = {}): Promise<T> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const token = getToken()
  if (auth && token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) })
  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string })?.error ?? res.statusText)
  return data as T
}
```

- [ ] **Step 3: Implement `src/lib/queryClient.ts`**

```ts
import { QueryClient } from '@tanstack/react-query'
export const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000, refetchOnWindowFocus: false } },
})
```

- [ ] **Step 4: Wrap app in `main.tsx`** — import `QueryClientProvider` + `queryClient`, wrap `<App/>` inside `<AuthProvider>`:

```tsx
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
// ... <AuthProvider><QueryClientProvider client={queryClient}><BrowserRouter>...
```

- [ ] **Step 5: Typecheck** — `cd client && npm run build` (or `npx tsc -b`) → no errors.

- [ ] **Step 6: Commit** — `git commit -am "feat(client): typed API client, env, TanStack Query provider"`

---

## Task B2: Align types + token-aware auth

**Files:**
- Modify: `client/src/types/index.ts`, `client/src/auth/AuthContext.tsx`, `client/src/services/authService.ts`, `client/src/pages/auth/LoginPage.tsx`, `client/src/pages/auth/RegisterPage.tsx`
- Test: `client/tests-e2e/auth.spec.ts` (Phase F) covers this end-to-end; here verify via typecheck + a unit test on the storage guard.
- Test: `client/src/auth/session.test.ts` (add `vitest`? No — keep to typecheck + Playwright). Use a plain node assertion script is overkill; rely on Phase F.

**Interfaces:**
- Produces updated `User` type: `{ id: string; name: string; email: string; role: 'user'|'admin'; status: 'active'|'frozen'; referralCode: string; referralCount: number; tier: 'silver'|'gold'|'diamond'; createdAt: string }` (no `password`).
- `authService`: `login(email,password) => {user,token}`, `register({name,email,password,referralCode?}) => {user,token}`, `me() => {user}`, `logout()`.
- `AuthContext`: persists `{ token, user }` under `asm_session`; on boot, if a token exists, calls `me()` to refresh the user and drops the session on 401.

- [ ] **Step 1: Update `types/index.ts`** — replace `User` (remove `password`, add `referralCode/referralCount/tier`). Keep `Transaction` but align to backend: `{ id, type: 'deposit'|'withdrawal'|'refund'|'adjustment', direction: 'credit'|'debit', amount, status, note, actor, createdAt }`.

- [ ] **Step 2: Rewrite `authService.ts`** to hit the API

```ts
import { apiFetch, setToken } from '@/lib/api'
import type { User } from '@/types'
export const authService = {
  async login(email: string, password: string) {
    const r = await apiFetch<{ user: User; token: string }>('/auth/login', { method: 'POST', body: { email, password }, auth: false })
    setToken(r.token); return r
  },
  async register(input: { name: string; email: string; password: string; referralCode?: string }) {
    const r = await apiFetch<{ user: User; token: string }>('/auth/register', { method: 'POST', body: input, auth: false })
    setToken(r.token); return r
  },
  me: () => apiFetch<{ user: User }>('/auth/me'),
  async logout() { setToken(null) },
}
```

- [ ] **Step 3: Update `AuthContext.tsx`** — replace the `taksal_session`/`isStoredUser(password)` logic: store `{ token, user }` under `asm_session`, and on mount, if a token is present, call `authService.me()` to hydrate/validate (clear on failure). `setUser(user, token)` writes both; logout clears both and calls `setToken(null)`.

- [ ] **Step 4: Update `LoginPage.tsx`** — `const { user } = await authService.login(email, password); setUser(user)` (token already stored by service); navigate by role. Surface `ApiError.message` in the existing error state.

- [ ] **Step 5: Update `RegisterPage.tsx`** — collect `name` (add field if absent), read `referralCode` from `useSearchParams().get('ref')`, call `authService.register({ name, email, password, referralCode })`, `setUser(user)`, navigate `/app`.

- [ ] **Step 6: Typecheck** — `npm run build` → no errors.

- [ ] **Step 7: Commit** — `git commit -am "feat(client): token-aware auth wired to real API"`

---

## Task B3: Typed API service modules + hooks

**Files:**
- Create: `client/src/services/api/plans.ts`, `investments.ts`, `wallet.ts`, `referral.ts`, `withdrawals.ts`, `dashboard.ts`, `leaderboard.ts`, `admin.ts`
- Create: `client/src/hooks/queries.ts` (TanStack Query hooks)
- Test: typecheck.

**Interfaces (exact shapes the pages rely on):**
- `plans.ts`: `Plan { key; name; returnPct; minInvest; maxInvest; unlockReferrals; durationHours; unlocked }`; `getPlans(): Promise<Plan[]>`.
- `investments.ts`: `createInvestment({planKey, amount, referralCode?}): Promise<{ investment: Investment; telegramLink: string }>`; `getInvestments(): Promise<Investment[]>`. `Investment { _id; planKey; amount; returnPct; expectedReturn; referenceCode; status; startAt?; maturesAt?; createdAt }`.
- `wallet.ts`: `getWallet(): Promise<{ balance: number; transactions: Transaction[] }>`.
- `referral.ts`: `getReferral(): Promise<{ referralCode; link; count; tier; nextTier; nextTierAt; referrals: {name; joinedAt; credited}[] }>`.
- `withdrawals.ts`: `createWithdrawal({amount, upiId}): Promise<Withdrawal>`; `getWithdrawals(): Promise<Withdrawal[]>`. `Withdrawal { _id; gross; tds; net; upiId; status; createdAt }`.
- `dashboard.ts`: `getDashboard(): Promise<Dashboard>` (shape from Task A2).
- `leaderboard.ts`: `getLeaderboard(period): Promise<{ period; entries: {rank; name; tier; totalInvested}[] }>`.
- `admin.ts`: `adminStats()`, `adminInvestments(status?)`, `approveInvestment(id)`, `rejectInvestment(id, note?)`, `adminWithdrawals(status?)`, `completeWithdrawal(id, note?)`, `rejectWithdrawal(id, note?)`, `adminUsers()`, `freezeUser(id)`, `unfreezeUser(id)`, `adjustWallet(userId, {amount, direction, note?})`.
- `hooks/queries.ts`: `usePlans`, `useWallet`, `useReferral`, `useDashboard`, `useLeaderboard(period)`, `useInvestments`, `useWithdrawals`, and admin equivalents + mutations (`useApproveInvestment`, etc.) that invalidate their lists.

- [ ] **Step 1: Implement the service modules** — each is a thin `apiFetch` wrapper. Example `plans.ts`:

```ts
import { apiFetch } from '@/lib/api'
export interface Plan { key: 'silver'|'gold'|'diamond'; name: string; returnPct: number; minInvest: number; maxInvest: number; unlockReferrals: number; durationHours: number; unlocked: boolean }
export const getPlans = () => apiFetch<Plan[]>('/plans')
```
Implement the remaining modules following the interface shapes above (each function one `apiFetch` call; POSTs pass `{ method: 'POST', body }`).

- [ ] **Step 2: Implement `hooks/queries.ts`** — example:

```ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getPlans } from '@/services/api/plans'
import { getWallet } from '@/services/api/wallet'
import { approveInvestment } from '@/services/api/admin'
export const usePlans = () => useQuery({ queryKey: ['plans'], queryFn: getPlans })
export const useWallet = () => useQuery({ queryKey: ['wallet'], queryFn: getWallet })
export function useApproveInvestment() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: approveInvestment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin', 'investments'] }); qc.invalidateQueries({ queryKey: ['admin', 'stats'] }) } })
}
```
Add the rest following the same pattern.

- [ ] **Step 3: Typecheck** — `npm run build` → no errors.

- [ ] **Step 4: Commit** — `git commit -am "feat(client): typed API service modules + query hooks"`

---

# PHASE C — Wire user pages to the API

> Each task replaces a page's mock with a real hook, shows loading/empty/error states, and formats paise with `src/lib/format.ts`. Apply the `frontend-design` + `impeccable` skills so each page keeps the `theme-light-home` look. Commit after each page builds clean.

## Task C1: Plans + invest flow (PackageDetailPage → InvestSummaryPage → PaymentMethodPage)

**Files:** Modify `client/src/pages/plans/PlansPage.tsx`, `client/src/pages/app/PackageDetailPage.tsx`, `InvestSummaryPage.tsx`, `PaymentMethodPage.tsx`, `PlanBenefitsPage.tsx`, `SilverTierPage.tsx`.

**Interfaces:** Consumes `usePlans`, `createInvestment`. The invest flow carries `{ planKey, amount }` via router state (`navigate('/app/summary', { state: { planKey, amount } })`) and finally calls `createInvestment`.

- [ ] **Step 1: PlansPage** — replace static plan cards with `usePlans()`; render `unlocked` state (lock badge + "Unlock with N referrals" when `!unlocked`, using `unlockReferrals`). Tapping an unlocked plan → `navigate('/app/invest', { state: { planKey } })`.
- [ ] **Step 2: PackageDetailPage** — read `planKey` from router state (fallback: `usePlans` + default silver); show the plan's `returnPct/min/max/durationHours`; amount input validated client-side against `minInvest/maxInvest` (mirror server). Continue → `navigate('/app/summary', { state: { planKey, amount } })`.
- [ ] **Step 3: InvestSummaryPage** — read `{planKey, amount}` from state; show plan terms + expected return (`amount*returnPct/100`); "Proceed to payment" → `navigate('/app/payment', { state: { planKey, amount } })`.
- [ ] **Step 4: PaymentMethodPage** — on confirm, call `createInvestment({ planKey, amount, referralCode })` (referralCode only meaningful on first deposit; pull from a stored `?ref` if present). Render the returned **`referenceCode`** prominently and a **"Open Telegram to pay"** button linking to `telegramLink`, plus a "waiting for admin confirmation" state. Use the `design-taste-frontend-v1` skill for this new waiting/confirmation surface.
- [ ] **Step 5: PlanBenefitsPage / SilverTierPage** — repoint any hardcoded plan figures to `usePlans` data.
- [ ] **Step 6: Build clean; commit** — `git commit -am "feat(client): wire plans + invest→telegram payment flow to API"`

## Task C2: Home / Dashboard

**Files:** Modify `client/src/pages/app/HomePage.tsx`, `DashboardPage.tsx`.
**Interfaces:** `useDashboard`, `useWallet`.
- [ ] Replace mock portfolio numbers with `useDashboard()` (balance, tier, totals, activeInvestments) and `useWallet()`. Show loading skeletons + empty state ("No active investments yet"). Format paise via `format.ts`. Build; commit `feat(client): wire home/dashboard to API`.

## Task C3: Account + transactions

**Files:** Modify `client/src/pages/app/AccountPage.tsx`.
**Interfaces:** `useWallet` (balance + transactions), `useAuth` (profile), logout.
- [ ] Remove inline `MOCK_TRANSACTIONS`; render `useWallet().transactions` (type/direction/amount/status/date). Profile block shows `user.name/email/tier/referralCode`. Logout calls `authService.logout()` + `setUser(null)` → `/login`. Build; commit `feat(client): wire account + transactions to API`.

## Task C4: Referral

**Files:** Modify `client/src/pages/app/ReferralPage.tsx`.
**Interfaces:** `useReferral`.
- [ ] Replace the hardcoded `REFERRAL`/`TIER_THRESHOLDS` (gold=5/diamond=20) with `useReferral()` and thresholds **11/21**. Show `referralCode`, copyable `link`, `count`, current `tier`, progress to `nextTier` at `nextTierAt`, and the `referrals` list (name/joinedAt/credited). Build; commit `feat(client): wire referral page to API + fix tier thresholds`.

## Task C5: Withdraw

**Files:** Modify `client/src/pages/app/WithdrawPage.tsx`.
**Interfaces:** `useWallet`, `createWithdrawal`, `useWithdrawals`.
- [ ] Form (`amount`, `upiId`) validated against wallet balance; on submit call `createWithdrawal`; show **gross / 5% TDS / net** breakdown from the returned record and a success state ("Initiated — funds within 3 hours; you'll get an email"). List past withdrawals with status. Build; commit `feat(client): wire withdrawal flow (TDS + status) to API`.

## Task C6: Retire dead mocks

**Files:** Delete `client/src/mocks/users.ts`, `coins.ts`, `ledger.ts` if unused after wiring; keep `SettlementTape` only if repointed to real data, else make it a clearly-labelled decorative marquee (no fabricated figures) or remove it.
- [ ] Remove unused mock imports; `npm run build` clean; commit `chore(client): remove mock data now served by API`.

---

# PHASE D — Leaderboard (client)

## Task D1: Leaderboard page + route + nav

**Files:** Create `client/src/pages/app/LeaderboardPage.tsx`; modify `client/src/App.tsx` (route `/app/leaderboard`), and the app nav (`src/components/app/BottomNav.tsx` or `SideNav.tsx`) to add a Leaderboard entry.
**Interfaces:** `useLeaderboard(period)`.

- [ ] **Step 1:** Add lazy route `/app/leaderboard` under `RequireAuth role="user"` in `App.tsx`.
- [ ] **Step 2:** Build `LeaderboardPage` — segmented control for **Daily / Monthly / Yearly** (drives `useLeaderboard(period)`); ranked rows show `rank`, full `name`, `tier` badge (reuse `TierBadge`), and `totalInvested` formatted as ₹. Top-3 emphasised. Loading + empty ("No investments in this period yet") states. Use `impeccable` + `design-taste-frontend-v1` for the ranked visual; keep `theme-light-home`.
- [ ] **Step 3:** Add nav entry linking to `/app/leaderboard`.
- [ ] **Step 4:** Build clean; commit `feat(client): investor leaderboard page (daily/monthly/yearly)`.

---

# PHASE E — Admin panel (`/admin/*`, same app)

## Task E1: Admin shell + routing + dashboard

**Files:** Create `client/src/pages/admin/AdminLayout.tsx`, `AdminDashboard.tsx`; modify `client/src/App.tsx` (replace `AdminPlaceholder` with nested `/admin/*` routes gated by `RequireAuth role="admin"`).
**Interfaces:** `adminStats` / `useAdminStats`.

- [ ] **Step 1:** In `App.tsx`, replace the single `/admin/*` placeholder with an `AdminLayout` wrapping child routes: `/admin` (dashboard), `/admin/deposits`, `/admin/withdrawals`, `/admin/users` — all under `RequireAuth role="admin"`.
- [ ] **Step 2:** `AdminLayout` — sidebar/topbar nav (Dashboard, Deposits, Withdrawals, Users) + logout + `<Outlet/>`. Desktop-first but responsive (admin is a desk tool). Apply `frontend-design`.
- [ ] **Step 3:** `AdminDashboard` — cards for `users`, `pendingDeposits`, `pendingWithdrawals`, `totals.invested`, `totals.walletLiability` from `useAdminStats()`.
- [ ] **Step 4:** Build clean; commit `feat(client): admin shell, routing, dashboard`.

## Task E2: Admin deposits (approve/reject)

**Files:** Create `client/src/pages/admin/AdminDeposits.tsx`.
**Interfaces:** `adminInvestments('pending')`, `useApproveInvestment`, `useRejectInvestment`.
- [ ] Table of pending deposits (user name/email, planKey, amount ₹, referenceCode, createdAt) with **Approve** / **Reject (note)** actions that call the mutations and optimistically refresh the list + stats. Empty state when none pending. Confirm dialog on approve (credits wallet + referral). Build; commit `feat(client): admin deposits approve/reject`.

## Task E3: Admin withdrawals (complete/reject)

**Files:** Create `client/src/pages/admin/AdminWithdrawals.tsx`.
**Interfaces:** `adminWithdrawals('pending')`, `useCompleteWithdrawal`, `useRejectWithdrawal`.
- [ ] Table (user, gross/tds/net ₹, upiId, status, initiatedAt) with **Mark paid** (complete) and **Reject/refund (note)** actions → emails fire server-side. Refresh list + stats on success. Build; commit `feat(client): admin withdrawals complete/reject`.

## Task E4: Admin users (freeze / wallet adjust)

**Files:** Create `client/src/pages/admin/AdminUsers.tsx`.
**Interfaces:** `adminUsers`, `freezeUser`/`unfreezeUser`, `adjustWallet`.
- [ ] Users table (name, email, tier, referralCount, status). Actions: freeze/unfreeze; a wallet-adjust dialog (`amount`, `direction` credit/debit, `note`). Refresh on success. Build; commit `feat(client): admin users freeze + wallet adjust`.

---

# PHASE F — Playwright e2e

## Task F1: Playwright setup

**Files:** Create `client/playwright.config.ts`, `client/tests-e2e/helpers.ts`; modify `client/package.json` (scripts + dep) and `.gitignore` (playwright artifacts).
**Interfaces:** `helpers.ts` exposes `api(path, opts)` (calls the backend directly to seed/admin-approve) and `registerViaUi(page, {...})`.

- [ ] **Step 1:** `cd client && npm i -D @playwright/test && npx playwright install --with-deps chromium`.
- [ ] **Step 2:** `playwright.config.ts` — `testDir: 'tests-e2e'`, `baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:5173'`, `webServer` optional (documented: run `client` dev + `server` separately, or set `E2E_BASE_URL`). Single chromium project, mobile viewport (375×812) as default.
- [ ] **Step 3:** `helpers.ts` — thin fetch wrapper to `E2E_API_URL ?? 'http://localhost:4000/api'` for seeding (register users, admin login, approve deposits) so UI tests can arrange backend state.
- [ ] **Step 4:** Add scripts: `"e2e": "playwright test"`, `"e2e:ui": "playwright test --ui"`. Commit `chore(client): playwright setup`.

## Task F2: Core flow specs

**Files:** Create `client/tests-e2e/auth.spec.ts`, `invest.spec.ts`, `withdraw.spec.ts`, `leaderboard.spec.ts`, `admin.spec.ts`.
**Interfaces:** consumes `helpers.ts`.

- [ ] **auth.spec.ts** — register via UI → lands on `/app`; reload keeps session (token hydrate); logout returns to `/login`.
- [ ] **invest.spec.ts** — logged-in user picks Silver, enters amount, reaches payment page showing a `referenceCode` + Telegram link; gold plan shows locked. Then `helpers` admin-approves the deposit and the dashboard balance updates on refresh.
- [ ] **withdraw.spec.ts** — with balance seeded via admin adjust, submit a withdrawal; UI shows gross/TDS/net; withdrawal appears in list as pending.
- [ ] **leaderboard.spec.ts** — seed two approved investments via helpers; leaderboard Daily tab lists the bigger investor first with their name + ₹ amount.
- [ ] **admin.spec.ts** — admin logs in, sees a pending deposit, approves it, and it disappears from the pending list; stats pending count decrements.
- [ ] **Run** (requires server+client running, env provided): `E2E_API_URL=... E2E_BASE_URL=... npm run e2e`. Document in `client/README-e2e.md`. Commit `test(client): playwright specs for auth/invest/withdraw/leaderboard/admin`.

---

# PHASE G — Design polish pass

## Task G1: Visual QA on new surfaces

**Files:** Touch-ups across `LeaderboardPage`, `admin/*`, `PaymentMethodPage` waiting state.
- [ ] Run the `impeccable`, `frontend-design`, and `design-taste-frontend-v1` skills over the leaderboard, admin panel, and payment-waiting surfaces. Enforce `theme-light-home` (white/navy/asm-blue/green), 375px-first, `prefers-reduced-motion`, and accessible states (`aria-live` on async, focus states). Screenshot-review with Playwright at 375px and desktop.
- [ ] Build clean; commit `style(client): design polish on leaderboard, admin, payment states`.

---

## Verification

**Backend:** `cd server && npm test` — existing 64 + new leaderboard/dashboard/stats tests all green.

**Frontend build:** `cd client && npm run build` — typechecks and builds with the new API layer, admin routes, and leaderboard.

**End-to-end (once env provided):**
1. `server/.env` (Mongo replica set + Gmail app password + `ADMIN_EMAIL/PASSWORD`), `client/.env` (`VITE_API_URL`).
2. Terminal 1: `cd server && npm run seed && npm run dev`. Terminal 2: `cd client && npm run dev`.
3. Manual smoke: register (with `?ref=CODE`) → pick Silver → payment page shows reference code + Telegram link → (admin approves in `/admin/deposits`) → dashboard balance updates, referrer's count increments → withdraw shows TDS/net → admin completes → email received → leaderboard shows the investor.
4. `E2E_API_URL=http://localhost:4000/api E2E_BASE_URL=http://localhost:5173 cd client && npm run e2e` — all specs pass.

## Self-review notes
- **Spec coverage:** backend-for-client/admin → Phase A; modify client frontend per backend → Phases B–C; admin panel → Phase E; leaderboard daily/monthly/yearly → A1 + D1; Playwright → Phase F; design skills → C/D/E/G. ✅
- **Deferred (unchanged from backend plan):** return accrual, 3-hour auto-refund cron, SMS — out of scope here.
- **Money type consistency:** all endpoints and hooks use paise; only `format.ts` converts for display.
- **Env later:** all env reads have safe local defaults; nothing hard-codes secrets.
