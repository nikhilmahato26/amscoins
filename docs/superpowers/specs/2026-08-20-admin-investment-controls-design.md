# Admin Investment Controls + Withdrawal History Fix — Design

Date: 2026-08-20
Branch: `feat/investment-productivity`

## Locked admin-facing vocabulary

These are the ONLY words shown to admins/users for these concepts. Do not
introduce synonyms anywhere in new UI text.

| Concept | Word | Never use |
|---|---|---|
| Money the user put in | **deposit** | principal, credit, amount |
| The extra they earn | **profit** | return, interest, yield |
| What the user receives (deposit + profit) | **payout** | credited amount, settlement |
| Button: pay the user their payout now | **approve** | pay now, release, settle |
| Button: cancel it, user gets nothing back | **reject** | cancel, refund, decline |

"withdrawal" stays as-is. Internal code identifiers (e.g. `approveReturn`,
`expectedReturn`) are NOT renamed — this glossary governs on-screen text only.

Build order: #5, #3, #4, then the withdrawal-history fix. Item #2 (manual
override once auto-pay exists) comes after, in a later pass.

---

## #5 — Two on/off switches for automation

**Goal:** admins can turn each automation on/off from Admin → Settings, next to
the existing hours field. Both default ON (current behaviour unchanged).

**Data** — add to `Settings` model:
- `autoRejectEnabled: Boolean` (default `true`)
- `autoPayEnabled: Boolean` (default `true`)

Expose both in `Settings.toPublic()` and accept them in the settings update path.

**Wiring (the switch must actually gate the action, not just scheduling):**
- Auto-reject: `investmentService.runAutoReject` reads `Settings` and no-ops when
  `autoRejectEnabled === false`. `runSweep` also skips the stale-pending scan when
  off. (Gating the action covers jobs already queued before the switch flipped.)
- Auto-pay: `investmentService.runMature` always transitions the investment to
  the "timer ended" state, but only auto-pays (credits deposit + profit) when
  `autoPayEnabled === true`. When off, it stays waiting for an admin — this is
  the seam #2 will use later. Replaces the hidden `WALLET_AUTO_CREDIT_ON_MATURITY`
  env flag as the source of truth (env may remain as the seed default only).

**UI** — `AdminSettings.tsx`, plain labels:
- "Automatically reject deposits that aren't paid in time" (beside the hours box)
- "Automatically approve payouts when the timer ends"

## #3 — approve / reject a running investment from the user's profile

**Goal:** on a user's profile (`AdminUserDetail`), each running investment gets
two buttons so an admin can act without leaving the page.

- **approve** → pay the user their payout (deposit + profit) now; mark it done.
- **reject** → cancel it; user gets **nothing** back.

**Backend** — two new service functions + endpoints (act on a running or
timer-ended investment):
- `POST /api/admin/investments/:id/approve-payout` → credits deposit + profit,
  cancels any pending auto-pay job, status → returned (idempotent).
- `POST /api/admin/investments/:id/reject-payout` → status → rejected, no credit,
  cancels any pending auto-pay job (idempotent).

These are distinct from the existing pending-stage `approve`/`reject` and the
matured-stage return endpoints; they explicitly allow acting on a **running**
investment. Reuse existing credit logic (mirror `approveReturn`) for correctness
and idempotency (guard on current status inside a transaction).

**UI** — in the `AdminUserDetail` investment list, for a running/timer-ended
investment, render **approve** / **reject** buttons with a one-tap confirm;
refetch on success. Buttons hidden for already-finished rows.

## #4 — show the user's password in the user view

**Goal:** admins can read a user's password to cross-check wallet access.

**Approach — reversible encryption (deliberate tradeoff, acknowledged):**
- Add `passwordEnc: String` to `User` — AES-256-GCM ciphertext of the plaintext
  password. Key from `PASSWORD_ENC_KEY` (32-byte, base64/hex) in env. If the key
  is absent, the feature degrades gracefully (store nothing, show blank).
- New `lib/secretBox.js`: `seal(plaintext) -> string`, `open(ciphertext) -> string`
  (GCM with random IV, authenticated).
- Populate `passwordEnc`:
  - on registration (plaintext available),
  - on password change / reset,
  - **on next successful login** for existing users lacking it (capture-on-login).
- Admin-only: `getUserDetail` decrypts and returns `password` (never in list
  endpoints, never for non-admins).

**UI** — `AdminUserDetail`: show the password with a show/hide toggle; if blank,
show "not captured yet" (fills in once the user next logs in / changes it).

**Security note:** a readable password means DB access = password disclosure.
Chosen deliberately by the product owner for wallet cross-checks; encrypted at
rest via `PASSWORD_ENC_KEY`.

## Withdrawal-history fix — stop showing "settled" before approval

**Bug:** `initiateWithdrawal` debits the wallet immediately; `walletService`
creates the `Transaction` with the schema default `status: 'settled'`, so the
user's history shows a just-requested withdrawal as **settled** before any admin
approves it.

**Fix:**
- `walletService.debit`/`credit` accept `meta.status` (default `'settled'`,
  unchanged for all existing callers).
- `initiateWithdrawal` creates the withdrawal row first, then debits with
  `status: 'pending'` and `ref: withdrawal._id`.
- `completeWithdrawal` and `bulkApproveWithdrawals`: flip the linked debit
  transaction to `'settled'`.
- `rejectWithdrawal`: flip the linked debit transaction to `'rejected'` (the
  existing refund credit stays, showing the money returned).

Held-balance behaviour is unchanged; only the displayed status becomes truthful.

---

## Testing

TDD, server-side (Jest + in-memory Mongo):
- Settings toggles: auto-reject off = stale pending stays; auto-pay off = timer-
  ended investment waits (no credit); both on = current behaviour.
- approve-payout / reject-payout: correct credit / no credit, idempotency,
  status guards.
- Password: seal/open round-trip; capture on register + on login; admin detail
  returns password; list endpoints never leak it.
- Withdrawal: request → history entry is `pending`; approve → `settled`;
  reject → `rejected` + refunded.

Then re-run: full `npm test`, `npm run e2e:automation` (real Redis), and the
client `npm run build` (Node 22).
