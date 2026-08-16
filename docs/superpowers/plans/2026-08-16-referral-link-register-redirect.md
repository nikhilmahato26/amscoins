# Referral Link → Register Redirect Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a referral link (`/?ref=CODE`) redirect the visitor to the register page with the referral code pre-filled and applied, instead of silently dropping them on the marketing home page.

**Architecture:** The `/` route currently renders `LandingPage` directly, so `?ref=CODE` is lost. We introduce a thin `LandingRoute` guard component: when the URL carries a `ref` query param it issues a client-side `<Navigate>` to `/register`, forwarding the entire query string; otherwise it renders `LandingPage` unchanged. `RegisterPage` **already** reads `?ref=`, uppercases it into the referral-code input, and shows "Referral code applied" — no change needed there. The backend referral wiring (`referredBy`) is already built and working; we only add the missing front-door redirect and prove the end-to-end journey with Playwright.

**Tech Stack:** React 19, Vite 8, TypeScript 6 (strict), react-router 7, Playwright e2e (hermetic Express + in-memory MongoDB backend on :4000, Vite dev server on :5173).

## Global Constraints

- All frontend paths below are relative to `client/` inside the `amscoins/` monorepo directory. Run Playwright and npm scripts from `client/`.
- **Node version: run `nvm use 22` in every shell before any `npm`/`npx` command.**
- TypeScript is strict (`noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax`) — use `import type` for type-only imports.
- Import via the `@/` alias (`@/*` → `client/src/*`); avoid deep relative paths in app code.
- Do **not** modify `RegisterPage.tsx` — its `?ref=` prefill already works. Do **not** touch the backend; referral application is already built.
- e2e helpers arrange backend state against the hermetic server at `http://localhost:4000/api` (in-memory Mongo, never Atlas). Use `uniqueEmail()` for test isolation.
- The referral link format handed out by the app is `${FRONTEND_URL}/?ref=${referralCode}` (see `server/src/controllers/referralController.js`) — the redirect must handle exactly this shape.

---

## File Structure

- `client/src/pages/landing/LandingRoute.tsx` — **new.** Guard component for the `/` route: redirects to `/register` when `?ref=` is present, otherwise renders `LandingPage`.
- `client/src/App.tsx` — **modified.** Swap the `/` route element from `LandingPage` to `LandingRoute` (and the corresponding import).
- `client/tests-e2e/referral.spec.ts` — **new.** Two e2e tests: (1) UI-level redirect + prefill; (2) full referral journey with backend verification.
- `client/tests-e2e/helpers.ts` — **modified.** Add `referralCode` to the `RegisterResult` user type and a `referralOverview()` helper for backend verification.

---

## Task 1: Referral redirect + register prefill (UI-level)

Adds the `LandingRoute` guard and wires it into `/`. The deliverable is the redirect behavior, proven by an e2e test that a referral link lands on `/register` with the code pre-filled and the "Referral code applied" confirmation visible.

**Files:**
- Create: `client/src/pages/landing/LandingRoute.tsx`
- Modify: `client/src/App.tsx` (import line for `LandingPage`; the `<Route path="/" ...>` element)
- Create (test): `client/tests-e2e/referral.spec.ts`

**Interfaces:**
- Consumes: `LandingPage` (named export from `@/pages/landing/LandingPage`); `Navigate`, `useSearchParams` from `react-router`; `RegisterPage`'s existing `?ref=` prefill (input has placeholder `USER010`; success text matches `/referral code applied/i`).
- Produces: `LandingRoute` — named export `export function LandingRoute(): JSX.Element`, used as the element for `<Route path="/">`.

- [ ] **Step 1: Write the failing e2e test**

Create `client/tests-e2e/referral.spec.ts`:

```ts
/**
 * referral.spec.ts — a referral link (/?ref=CODE) must carry the visitor to
 * the register screen with the code pre-filled and applied, not drop them on
 * the marketing home. Lowercase input also proves the code is uppercased.
 */
import { test, expect } from '@playwright/test'

test.describe('Referral link', () => {
  test('/?ref=CODE redirects to /register with the code pre-filled and applied', async ({ page }) => {
    // Lowercase on purpose: RegisterPage uppercases the referral input.
    await page.goto('/?ref=azzxsn')

    // Landed on register, query string carried through.
    await expect(page).toHaveURL(/\/register\?ref=azzxsn/, { timeout: 10_000 })

    // The referral-code input (placeholder "USER010") is pre-filled, uppercased.
    await expect(page.getByPlaceholder('USER010')).toHaveValue('AZZXSN')

    // The applied-confirmation is shown.
    await expect(page.getByText(/referral code applied/i)).toBeVisible()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
nvm use 22
cd client
npx playwright test tests-e2e/referral.spec.ts -g "pre-filled and applied"
```

Expected: FAIL. The URL assertion times out because `/?ref=azzxsn` renders `LandingPage` and never navigates to `/register` (the actual URL stays `/?ref=azzxsn`).

- [ ] **Step 3: Create the `LandingRoute` guard**

Create `client/src/pages/landing/LandingRoute.tsx`:

```tsx
import { Navigate, useSearchParams } from 'react-router'

import { LandingPage } from './LandingPage'

/**
 * The app hands out referral links shaped `/?ref=CODE` (see the backend's
 * referral overview). Rendering the marketing home for those would silently
 * drop the code, so when `ref` is present we send the visitor straight to the
 * register screen — forwarding the whole query string so RegisterPage can
 * pre-fill the referral code (and honour any `?plan=` alongside it). Any other
 * visit to `/` is an ordinary home-page visit and renders LandingPage.
 */
export function LandingRoute() {
  const [params] = useSearchParams()

  if (params.get('ref')) {
    return <Navigate to={`/register?${params.toString()}`} replace />
  }

  return <LandingPage />
}
```

- [ ] **Step 4: Wire `LandingRoute` into the `/` route**

In `client/src/App.tsx`, change the eager landing import:

```tsx
import { LandingRoute } from './pages/landing/LandingRoute'
```

(replacing `import { LandingPage } from './pages/landing/LandingPage'`)

Then update the home route element:

```tsx
<Route path="/" element={<LandingRoute />} />
```

(replacing `<Route path="/" element={<LandingPage />} />`)

- [ ] **Step 5: Run the test to verify it passes**

```bash
nvm use 22
cd client
npx playwright test tests-e2e/referral.spec.ts -g "pre-filled and applied"
```

Expected: PASS (1 passed).

- [ ] **Step 6: Type-check and lint**

```bash
nvm use 22
cd client
npm run build
npm run lint
```

Expected: `tsc -b` completes with no type errors (confirms no unused imports — e.g. `LandingPage` is no longer imported in `App.tsx`); `oxlint` reports no new errors.

- [ ] **Step 7: Commit**

```bash
cd client
git add src/pages/landing/LandingRoute.tsx src/App.tsx tests-e2e/referral.spec.ts
git commit -m "feat(referral): redirect /?ref=CODE to register with code prefilled"
```

---

## Task 2: Full referral journey (end-to-end, backend-verified)

Proves the complete journey against the hermetic backend: a real referrer's code, carried through the referral link and the redirect, results in the referred user being recorded under that referrer.

**Files:**
- Modify: `client/tests-e2e/helpers.ts` (extend `RegisterResult` user type; add `referralOverview()`)
- Modify: `client/tests-e2e/referral.spec.ts` (add the full-journey test)

**Interfaces:**
- Consumes: `register()`, `uniqueEmail()` from `./helpers`; the backend `GET /api/referral` (auth'd) returning `{ referralCode, count, referrals: { name; joinedAt; credited }[] }`; the `LandingRoute` redirect from Task 1.
- Produces: `referralOverview(token: string): Promise<ReferralOverview>` where `ReferralOverview = { referralCode: string; count: number; referrals: { name: string; joinedAt: string; credited: boolean }[] }`; and `RegisterResult.user.referralCode: string`.

- [ ] **Step 1: Extend the helpers (type + overview fetch)**

In `client/tests-e2e/helpers.ts`, update the `RegisterResult` interface so its `user` includes the referral code the register endpoint returns (`user.toPublic()` includes `referralCode`):

```ts
export interface RegisterResult {
  user: { id: string; name: string; email: string; role: string; referralCode: string }
  token: string
}
```

Then add, at the end of the file (before nothing in particular — append after `uniqueEmail`):

```ts
export interface ReferralOverview {
  referralCode: string
  count: number
  referrals: { name: string; joinedAt: string; credited: boolean }[]
}

/** Fetch a user's referral overview (who they referred) using their token. */
export async function referralOverview(token: string): Promise<ReferralOverview> {
  const res = await fetch(`${API}/referral`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`referralOverview failed ${res.status}: ${body}`)
  }
  return res.json()
}
```

- [ ] **Step 2: Write the failing full-journey test**

In `client/tests-e2e/referral.spec.ts`, update the imports line and add a second test inside the existing `test.describe('Referral link', ...)` block.

Change the import at the top of the file to:

```ts
import { test, expect } from '@playwright/test'
import { register, referralOverview, uniqueEmail } from './helpers'
```

Add this test after the first one, still inside the `describe`:

```ts
  test('full journey: a real code carried through the link records the referral', async () => {
    // Arrange: a referrer exists; capture the code the app would put in their link.
    const referrer = await register({
      name: 'Referrer Rita',
      email: uniqueEmail('referrer'),
      password: 'testpass1',
    })
    const code = referrer.user.referralCode
    expect(code).toMatch(/^[A-Z2-9]{6}$/) // sanity: real, uppercase code

    // (browser-scoped so the redirect + registration share one context)
  })
```

> Note: the test body needs a `page`. Playwright injects fixtures via the callback argument. Write the full test as below in Step 3 — this step is only to establish a failing test first; run it and it fails to compile/reference `page`. To keep the TDD loop honest, write the *complete* test now:

```ts
  test('full journey: a real code carried through the link records the referral', async ({ page }) => {
    // Arrange: a referrer exists; capture the code the app would put in their link.
    const referrer = await register({
      name: 'Referrer Rita',
      email: uniqueEmail('referrer'),
      password: 'testpass1',
    })
    const code = referrer.user.referralCode
    expect(code).toMatch(/^[A-Z2-9]{6}$/) // sanity: real, uppercase code

    // Act 1: visit the referral link the app hands out.
    await page.goto(`/?ref=${code}`)
    await expect(page).toHaveURL(new RegExp(`/register\\?ref=${code}`), { timeout: 10_000 })
    await expect(page.getByPlaceholder('USER010')).toHaveValue(code)
    await expect(page.getByText(/referral code applied/i)).toBeVisible()

    // Act 2: the referred visitor completes registration.
    await page.getByPlaceholder('Your full name').fill('Referred Ravi')
    await page.getByPlaceholder('Enter your email').fill(uniqueEmail('referred'))
    await page.getByPlaceholder('Create a strong password').fill('testpass1')
    await page.getByPlaceholder('Confirm your password').fill('testpass1')
    await page.getByRole('button', { name: /sign up/i }).click()
    await expect(page).toHaveURL(/\/app/, { timeout: 15_000 })

    // Assert: backend recorded the referral under the referrer.
    const overview = await referralOverview(referrer.token)
    expect(overview.count).toBeGreaterThanOrEqual(1)
    expect(overview.referrals.map((r) => r.name)).toContain('Referred Ravi')
  })
```

- [ ] **Step 3: Run the full-journey test to verify it fails first without the guard**

Confirm the test itself is meaningful by running only it. With Task 1 already merged the redirect exists, so to see it fail-for-the-right-reason, temporarily reason about it: run it and expect PASS only because Task 1 shipped. To honour TDD for *this* task's new assertion (backend recording), first run with a deliberately wrong expectation is unnecessary — instead verify the test drives the helper you just added:

```bash
nvm use 22
cd client
npx playwright test tests-e2e/referral.spec.ts -g "full journey"
```

Expected on first run BEFORE Step 1's helper is saved: FAIL to compile (`referralOverview` / `register ... referralCode` unresolved). After Step 1 is saved, this should PASS because Task 1's redirect is in place. If it FAILS on the URL or the backend assertion, fix the implementation from Task 1 before continuing — do not weaken the test.

- [ ] **Step 4: Run the whole referral spec to verify both tests pass**

```bash
nvm use 22
cd client
npx playwright test tests-e2e/referral.spec.ts
```

Expected: `2 passed`.

- [ ] **Step 5: Run the full e2e suite to confirm no regressions**

```bash
nvm use 22
cd client
npm run e2e
```

Expected: all specs pass (`auth`, `admin`, `invest`, `leaderboard`, `withdraw`, `referral`). The two Playwright `webServer` entries (backend :4000, Vite :5173) start automatically.

- [ ] **Step 6: Type-check and lint**

```bash
nvm use 22
cd client
npm run build
npm run lint
```

Expected: no type errors, no new lint errors.

- [ ] **Step 7: Commit**

```bash
cd client
git add tests-e2e/helpers.ts tests-e2e/referral.spec.ts
git commit -m "test(referral): end-to-end journey — link carries code and records referral"
```

---

## Self-Review

**Spec coverage:**
- "Link should go to the register page" → Task 1, `LandingRoute` `<Navigate to="/register…">`, asserted by the URL check.
- "Referral code input should be automatically filled" → Task 1, `toHaveValue('AZZXSN')` (prefill already implemented in `RegisterPage`; redirect forwards the query string).
- "The referral should be applied" → Task 1 asserts the "Referral code applied" UI; Task 2 asserts the backend records `referredBy` via the referrer's `GET /api/referral` overview.
- "Test using Playwright" → both tasks are Playwright specs in `tests-e2e/`.
- "Use `nvm use 22`" → in the Global Constraints and prefixed on every command block.
- "Test the full thing" → Task 2 full journey + Task 2 Step 5 runs the entire e2e suite.

**Placeholder scan:** No TBD/TODO/"handle edge cases"; all code shown in full. The redirect forwards `params.toString()` so `?ref=X&plan=gold` also carries the plan — no extra work needed since `RegisterPage` already reads `plan`.

**Type consistency:** `LandingRoute` (named export) is imported and used consistently in `App.tsx`. `referralOverview(token)` returns `ReferralOverview` and is called with `referrer.token`. `RegisterResult.user.referralCode` is added before it is read as `referrer.user.referralCode`. Backend fields (`count`, `referrals[].name`) match `server/src/controllers/referralController.js`.

**Note on TDD ordering (Task 2 Step 3):** because Task 1 ships the redirect, Task 2's spec passes as soon as its helper compiles. That is expected — Task 2 exists to lock in the backend-recorded outcome and guard against regressions, not to drive new production code. Keep the assertions strict; never relax them to force a pass.
