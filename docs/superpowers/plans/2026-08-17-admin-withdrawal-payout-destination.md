# Admin Withdrawal Payout Destination Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the admin Withdrawals table so bank-account payouts show the account number / IFSC / holder name (they currently render a blank cell), while UPI payouts continue to show the VPA.

**Architecture:** The data layer is already complete — the `Withdrawal` model, the `POST /withdrawals` endpoint, the zod schema, the admin list endpoint, and the client `Withdrawal` type all carry both `upiId` and the bank fields (`accountName`, `accountNumber`, `ifsc`). The only defect is presentation: `AdminWithdrawals.tsx` hardcodes `{wd.upiId}` in the table cell and the Mark-paid dialog, so bank withdrawals appear destination-less. We add one pure formatting helper (`payoutView`) in `lib/format.ts`, wire it into the table cell, search filter, and confirmation dialog, and tighten one server log line that also assumed UPI-only. Tests are the existing Playwright e2e harness (real full-stack, in-memory Mongo) plus the existing Jest server suite — this repo has no client unit-test runner, so we follow the established e2e convention rather than introduce one.

**Tech Stack:** React 19 + Vite + TypeScript (strict, `import type` required), Tailwind, Playwright e2e (`client/tests-e2e`), Node/Express + Mongoose + Jest (`server/tests`).

## Global Constraints

- Frontend paths are under `client/`; import via the `@/` alias, never deep relative paths.
- TypeScript strict mode: `noUnusedLocals`, `noUnusedParameters`, `verbatimModuleSyntax` — use `import type` for type-only imports.
- Do not hand-edit shadcn primitives in `client/src/components/ui`.
- Money values are **paise** (integers); format for display with `inr()` from `@/lib/format`.
- Admin payout is a sensitive surface: the admin must be able to read the **full** account number to execute the transfer, so the account number is shown in full in this internal admin tool (no masking in scope).
- Frontend build/typecheck gate: `npm run build` inside `client/`. Lint gate: `npm run lint` inside `client/`.
- e2e gate: `npm run e2e` inside `client/` (Playwright auto-starts the client dev server and the hermetic API server on :4000).
- Server test gate: `npm test` inside `server/`.

---

### Task 1: `payoutView` formatting helper + admin table renders both destination types

Replace the UPI-only table cell with a method-aware destination cell driven by a single pure helper. TDD anchor is a Playwright e2e that seeds one bank and one UPI withdrawal via API and asserts the admin table renders each correctly.

**Files:**
- Modify: `client/src/lib/format.ts` (append helper)
- Modify: `client/tests-e2e/helpers.ts` (append `createWithdrawal` API helper)
- Create: `client/tests-e2e/admin-withdrawal-destination.spec.ts`
- Modify: `client/src/pages/admin/AdminWithdrawals.tsx` (header label, table cell, search filter, placeholder)

**Interfaces:**
- Consumes: existing `register`, `adminLogin`, `adminAdjustWallet`, `uniqueEmail` from `client/tests-e2e/helpers.ts`; existing `inr` and `cn` imports in `AdminWithdrawals.tsx`.
- Produces:
  - `export interface PayoutSource { method?: 'upi' | 'bank'; upiId?: string; accountName?: string; accountNumber?: string; ifsc?: string }`
  - `export interface PayoutView { method: 'upi' | 'bank'; badge: string; primary: string; secondary?: string; search: string; sentence: string }`
  - `export function payoutView(w: PayoutSource): PayoutView` — used by Task 2.
  - `export async function createWithdrawal(userToken: string, body: { amount: number; upiId?: string; accountName?: string; accountNumber?: string; ifsc?: string }): Promise<{ _id: string; net: number }>` — test helper.

- [ ] **Step 1: Add the `createWithdrawal` e2e helper**

Append to `client/tests-e2e/helpers.ts` (the file already defines `const API = 'http://localhost:4000/api'` and uses this exact `fetch` + error pattern):

```ts
/** Create a withdrawal via API with an inline destination; returns the created withdrawal. */
export async function createWithdrawal(
  userToken: string,
  body: {
    amount: number
    upiId?: string
    accountName?: string
    accountNumber?: string
    ifsc?: string
  },
): Promise<{ _id: string; net: number }> {
  const res = await fetch(`${API}/withdrawals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text()
    throw new Error(`createWithdrawal failed ${res.status}: ${b}`)
  }
  return res.json()
}
```

- [ ] **Step 2: Write the failing e2e test**

Create `client/tests-e2e/admin-withdrawal-destination.spec.ts`:

```ts
/**
 * admin-withdrawal-destination.spec.ts — the admin Withdrawals table must show
 * bank account + IFSC for bank payouts and the VPA for UPI payouts.
 */
import { test, expect } from '@playwright/test'
import {
  uniqueEmail,
  register,
  adminLogin,
  adminAdjustWallet,
  createWithdrawal,
} from './helpers'

test('admin withdrawals: bank payout shows account + IFSC, UPI shows VPA', async ({ page }) => {
  const adminToken = await adminLogin()

  // Seed a BANK withdrawal
  const bank = await register({
    name: 'Bank Payout User',
    email: uniqueEmail('wd-bank'),
    password: 'userpass1',
  })
  await adminAdjustWallet(adminToken, bank.user.id, 1_000_000, 'credit', 'e2e seed')
  await createWithdrawal(bank.token, {
    amount: 100_000,
    accountName: 'Bank Payout User',
    accountNumber: '000123456789',
    ifsc: 'HDFC0001234',
  })

  // Seed a UPI withdrawal
  const upi = await register({
    name: 'Upi Payout User',
    email: uniqueEmail('wd-upi'),
    password: 'userpass1',
  })
  await adminAdjustWallet(adminToken, upi.user.id, 1_000_000, 'credit', 'e2e seed')
  await createWithdrawal(upi.token, { amount: 100_000, upiId: '9876543210@paytm' })

  // Admin logs in via UI
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

  await page.goto('/admin/withdrawals')
  await expect(page.getByRole('heading', { name: 'Withdrawals' })).toBeVisible({ timeout: 10_000 })

  // BANK row: account number, IFSC and BANK badge all visible (no blank cell)
  const bankRow = page.locator('tr').filter({ hasText: 'Bank Payout User' })
  await expect(bankRow.getByText('000123456789')).toBeVisible({ timeout: 15_000 })
  await expect(bankRow.getByText('HDFC0001234')).toBeVisible()
  await expect(bankRow.getByText('BANK', { exact: true })).toBeVisible()

  // UPI row still shows the VPA
  const upiRow = page.locator('tr').filter({ hasText: 'Upi Payout User' })
  await expect(upiRow.getByText('9876543210@paytm')).toBeVisible()
})
```

- [ ] **Step 3: Run the e2e test to verify it fails**

Run (inside `client/`): `npm run e2e -- admin-withdrawal-destination.spec.ts`
Expected: FAIL — the bank row's destination cell is empty, so `getByText('000123456789')` times out (and `BANK` badge does not exist yet).

- [ ] **Step 4: Add the `payoutView` helper**

Append to `client/src/lib/format.ts`:

```ts
export interface PayoutSource {
  method?: 'upi' | 'bank'
  upiId?: string
  accountName?: string
  accountNumber?: string
  ifsc?: string
}

export interface PayoutView {
  method: 'upi' | 'bank'
  badge: string
  primary: string
  secondary?: string
  search: string
  sentence: string
}

/**
 * Derive a display view for a withdrawal payout destination. Falls back to
 * inferring the method from which fields are present so legacy rows (no
 * `method`) still render. The full account number is intentionally shown —
 * the admin needs it to execute the transfer.
 */
export function payoutView(w: PayoutSource): PayoutView {
  const method = w.method ?? (w.upiId ? 'upi' : 'bank')
  const search = [w.upiId, w.accountName, w.accountNumber, w.ifsc]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (method === 'upi') {
    const vpa = w.upiId ?? '—'
    return { method: 'upi', badge: 'UPI', primary: vpa, search, sentence: `via UPI ${vpa}` }
  }

  const acct = w.accountNumber ?? '—'
  const ifsc = w.ifsc ?? '—'
  return {
    method: 'bank',
    badge: 'BANK',
    primary: `${ifsc} · A/C ${acct}`,
    secondary: w.accountName,
    search,
    sentence: `to bank account ${acct} (IFSC ${ifsc}${w.accountName ? `, ${w.accountName}` : ''})`,
  }
}
```

- [ ] **Step 5: Wire the helper into the table header, cell, and search**

In `client/src/pages/admin/AdminWithdrawals.tsx`:

Update the import line (currently `import { inr } from '@/lib/format'`) to:

```ts
import { inr, payoutView } from '@/lib/format'
```

Rename the column header — replace:

```tsx
<th scope="col" className="px-3 py-2.5 text-left">UPI ID</th>
```

with:

```tsx
<th scope="col" className="px-3 py-2.5 text-left">Destination</th>
```

Replace the destination cell — replace:

```tsx
<td className="px-3 py-2.5 font-mono text-[11px] text-asm-body">{wd.upiId}</td>
```

with:

```tsx
<td className="px-3 py-2.5">
  {(() => {
    const dest = payoutView(wd)
    return (
      <div className="flex flex-col gap-0.5">
        <span
          className={cn(
            'inline-flex w-fit rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.06em]',
            dest.method === 'bank' ? 'bg-asm-blue/10 text-asm-blue' : 'bg-asm-green/10 text-asm-green',
          )}
        >
          {dest.badge}
        </span>
        <span className="font-mono text-[11px] text-asm-navy">{dest.primary}</span>
        {dest.secondary && <span className="text-[11px] text-asm-muted">{dest.secondary}</span>}
      </div>
    )
  })()}
</td>
```

Update the search filter — replace:

```tsx
      (w.upiId ?? '').toLowerCase().includes(s)
```

with:

```tsx
      payoutView(w).search.includes(s)
```

Update the search placeholder — replace:

```tsx
      <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or UPI ID" />
```

with:

```tsx
      <SearchInput value={q} onChange={setQ} placeholder="Search by name, email or destination" />
```

- [ ] **Step 6: Run the e2e test to verify it passes**

Run (inside `client/`): `npm run e2e -- admin-withdrawal-destination.spec.ts`
Expected: PASS — bank row shows `000123456789`, `HDFC0001234`, and a `BANK` badge; UPI row shows `9876543210@paytm`.

- [ ] **Step 7: Typecheck and lint**

Run (inside `client/`): `npm run build && npm run lint`
Expected: both succeed with no errors (verifies strict-mode/`import type` compliance and no unused symbols).

- [ ] **Step 8: Commit**

```bash
git add client/src/lib/format.ts client/tests-e2e/helpers.ts client/tests-e2e/admin-withdrawal-destination.spec.ts client/src/pages/admin/AdminWithdrawals.tsx
git commit -m "fix(admin): show bank account destination in withdrawals table"
```

---

### Task 2: Mark-paid dialog shows the correct destination for bank payouts

The confirmation dialog hardcodes "via UPI {upiId}", so a bank payout shows "via UPI" followed by nothing. Drive its copy from `payoutView(...).sentence`.

**Files:**
- Modify: `client/src/pages/admin/AdminWithdrawals.tsx` (`MarkPaidDialog` body)
- Modify: `client/tests-e2e/admin-withdrawal-destination.spec.ts` (add a second test)

**Interfaces:**
- Consumes: `payoutView` from `@/lib/format` (Task 1); `createWithdrawal`, `adminLogin`, `adminAdjustWallet`, `register`, `uniqueEmail` from `./helpers`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the failing e2e test**

Append this second test to `client/tests-e2e/admin-withdrawal-destination.spec.ts`:

```ts
test('admin withdrawals: mark-paid dialog shows the bank destination, not "via UPI"', async ({ page }) => {
  const adminToken = await adminLogin()

  const bank = await register({
    name: 'Dialog Bank User',
    email: uniqueEmail('wd-dlg'),
    password: 'userpass1',
  })
  await adminAdjustWallet(adminToken, bank.user.id, 1_000_000, 'credit', 'e2e seed')
  await createWithdrawal(bank.token, {
    amount: 100_000,
    accountName: 'Dialog Bank User',
    accountNumber: '000987654321',
    ifsc: 'ICIC0004321',
  })

  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill('admin@e2e.test')
  await page.getByPlaceholder('Your password').fill('admin123')
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 })

  await page.goto('/admin/withdrawals')
  const row = page.locator('tr').filter({ hasText: 'Dialog Bank User' })
  await expect(row.getByText('000987654321')).toBeVisible({ timeout: 15_000 })
  await row.getByRole('button', { name: /mark paid/i }).click()

  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('000987654321')).toBeVisible()
  await expect(dialog.getByText('ICIC0004321')).toBeVisible()
  await expect(dialog.getByText(/via UPI/i)).toHaveCount(0)
})
```

- [ ] **Step 2: Run the e2e test to verify it fails**

Run (inside `client/`): `npm run e2e -- admin-withdrawal-destination.spec.ts -g "mark-paid dialog"`
Expected: FAIL — the dialog renders "via UPI" with an empty VPA; `000987654321` is not present and the `via UPI` count is 1, not 0.

- [ ] **Step 3: Update the `MarkPaidDialog` body**

In `client/src/pages/admin/AdminWithdrawals.tsx`, inside `MarkPaidDialog`, compute the destination at the top of the component body (immediately after the function signature line `function MarkPaidDialog({ withdrawal, onConfirm, onCancel, isPending }: MarkPaidDialogProps) {`):

```tsx
  const dest = payoutView(withdrawal)
```

Then replace the dialog description paragraph — replace:

```tsx
        <p className="mt-2 text-[13px] text-asm-body">
          Confirm payment of{' '}
          <strong className="font-semibold text-asm-navy">{inr(withdrawal.net)}</strong> to{' '}
          <strong className="font-semibold text-asm-navy">{withdrawal.user.name}</strong> via UPI{' '}
          <span className="font-mono text-asm-navy">{withdrawal.upiId}</span>. This cannot be undone.
        </p>
```

with:

```tsx
        <p className="mt-2 text-[13px] text-asm-body">
          Confirm payment of{' '}
          <strong className="font-semibold text-asm-navy">{inr(withdrawal.net)}</strong> to{' '}
          <strong className="font-semibold text-asm-navy">{withdrawal.user.name}</strong>{' '}
          <span className="font-mono text-asm-navy">{dest.sentence}</span>. This cannot be undone.
        </p>
```

- [ ] **Step 4: Run the e2e test to verify it passes**

Run (inside `client/`): `npm run e2e -- admin-withdrawal-destination.spec.ts`
Expected: PASS — both tests green; the dialog shows `000987654321` and `ICIC0004321`, and no "via UPI" text.

- [ ] **Step 5: Typecheck and lint**

Run (inside `client/`): `npm run build && npm run lint`
Expected: both succeed.

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/admin/AdminWithdrawals.tsx client/tests-e2e/admin-withdrawal-destination.spec.ts
git commit -m "fix(admin): mark-paid dialog shows bank destination for bank payouts"
```

---

### Task 3: Server completion log records the real destination (not a blank UPI)

`completeWithdrawal` logs `upiId: w.upiId`, which is `undefined` for bank payouts — the audit log loses the destination for exactly the case this plan fixes. Reuse the module-local `destinationLabel(dest)` helper (already defined in the service and shaped to read `method` / `upiId` / `accountNumber` — the withdrawal document satisfies it).

**Files:**
- Modify: `server/src/services/withdrawalService.js` (`completeWithdrawal` log call)
- Modify: `server/tests/unit/withdrawal.service.test.js` (add a bank-completion test)

**Interfaces:**
- Consumes: module-local `destinationLabel(dest)` in `withdrawalService.js`.
- Produces: nothing consumed downstream.

- [ ] **Step 1: Write the failing test**

Append to `server/tests/unit/withdrawal.service.test.js` (helpers `makeFundedUser`, `initiateWithdrawal`, `completeWithdrawal`, `Withdrawal`, `adminId` are already imported/defined at the top of that file):

```js
test('complete a bank withdrawal succeeds and clears no upiId', async () => {
  const u = await makeFundedUser(200000)
  const w = await initiateWithdrawal(u, {
    amount: 100000,
    accountName: 'Me',
    accountNumber: '123456789',
    ifsc: 'HDFC0001234',
  })
  const done = await completeWithdrawal(w._id, adminId)
  expect(done.status).toBe('completed')
  expect(done.method).toBe('bank')
  expect(done.upiId).toBeUndefined()
  expect((await Withdrawal.findById(w._id)).status).toBe('completed')
})
```

- [ ] **Step 2: Run the test to verify it passes for the wrong reason, then confirm the log fix is needed by inspection**

Run (inside `server/`): `npm test -- withdrawal.service`
Expected: this new test PASSES even before the log change (completion already works for bank rows). It exists as a **regression guard** so the log edit in Step 3 cannot break the bank-completion path. Confirm it is green before editing.

- [ ] **Step 3: Fix the completion log to use the real destination**

In `server/src/services/withdrawalService.js`, inside `completeWithdrawal`, replace:

```js
  logger.info('Withdrawal completed', {
    withdrawalId: w._id,
    userId: w.user,
    adminId,
    net: w.net,
    upiId: w.upiId,
  })
```

with:

```js
  logger.info('Withdrawal completed', {
    withdrawalId: w._id,
    userId: w.user,
    adminId,
    net: w.net,
    method: w.method,
    destination: destinationLabel(w),
  })
```

- [ ] **Step 4: Run the server test suite to verify it still passes**

Run (inside `server/`): `npm test -- withdrawal.service`
Expected: PASS — all withdrawal-service tests green, including the new bank-completion test.

- [ ] **Step 5: Commit**

```bash
git add server/src/services/withdrawalService.js server/tests/unit/withdrawal.service.test.js
git commit -m "fix(withdrawal): log real payout destination on completion"
```

---

## Self-Review

**1. Spec coverage** — The reported defect ("if the payment is initiated thru bank account then [blank] this UPI id"): the blank destination cell is fixed in Task 1 (table) and Task 2 (confirmation dialog); Task 3 removes the same UPI-only assumption from the audit log. UPI behavior is preserved and explicitly asserted in Task 1's UPI-row check. Search-by-destination is covered in Task 1 Step 5. No masking/reveal, no new payout methods, and no request-side changes — all already implemented in the codebase (`WithdrawPage.tsx`, model, schema) and out of scope.

**2. Placeholder scan** — No TBD/"handle edge cases"/"similar to Task N" placeholders; every code step shows the full code. The one inferred fallback (`method ?? (upiId ? 'upi' : 'bank')`) is real logic for legacy rows, with `'—'` shown for genuinely-missing fields.

**3. Type consistency** — `payoutView(w: PayoutSource): PayoutView` is defined in Task 1 and consumed with the same name and `.primary` / `.secondary` / `.badge` / `.search` / `.sentence` / `.method` fields in Tasks 1 and 2. `createWithdrawal(userToken, body)` is defined once (Task 1) and reused in Task 2. `destinationLabel` is the existing module-local helper reused in Task 3. `AdminWithdrawal` (from `@/services/api/admin`, = `Withdrawal & { user }`) structurally satisfies `PayoutSource`, so passing `wd`/`withdrawal` to `payoutView` typechecks.
