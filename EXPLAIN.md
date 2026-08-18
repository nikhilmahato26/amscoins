# AMScoins — How It Works

A time-boxed investment platform for Indian retail investors. Users deposit money, pick a plan, wait 36 hours, and withdraw via UPI. Every payout is human-approved by an admin — nothing is automated.

---

## Investor Flow (User Journey)

```
Register → Browse Plans → Deposit → Confirm → Wait 36h → Admin approves return → Withdraw to UPI
```

### Step-by-step

**1. Register / Login**
- `GET /` → landing page with plan teasers
- `GET /register` → email + password; optionally pre-select a plan (carried through)
- `GET /login` → email/password or Google OAuth (`/auth/callback`)
- JWT stored in `localStorage`; `AuthContext` exposes `user` everywhere

**2. Browse Plans**
- `GET /plans` → plan cards: Silver (25%), Gold (30%), Diamond (40%) — all 36-hour terms
- `GET /app/benefits` → plan benefits detail
- `GET /gallery` → full gallery

**3. Deposit**
- `GET /app/invest` → select plan + enter amount (within plan min/max)
- `GET /app/summary` → review: amount, expected return, TDS if any
- `POST /api/investments` → server creates investment in `pending` status + generates `referenceCode`
- Navigate to `GET /app/invest/confirm/:id` with WhatsApp/Telegram links in router state

**4. Deposit Confirmation Page** (`/app/invest/confirm/:id`)
- Shows `referenceCode` (e.g. `invest-REF001`), amount, expected return, return %
- Polls `GET /api/investments/:id` every 30 seconds while status is `pending`
- WhatsApp/Telegram deep-link buttons for payment proof (conditionally shown from router state)
- Status badge: Awaiting Approval → Active → Completed / Rejected
- "Track Status" CTA → `/app/dashboard`

**5. Dashboard** (`/app/dashboard`)
- Portfolio summary: wallet balance, active investments, total returned
- Recent investments list
- Quick links to withdraw, referral, leaderboard

**6. Withdrawal** (`/app/withdraw`)
- `POST /api/withdrawals` → creates withdrawal in `pending` status
- Admin sees it → approves → user gets email + wallet credited
- Payout methods (UPI or Bank) saved at `/app/payment`

---

## Admin Workflow

All admin routes live under `/admin` (frontend) and `/api/admin` (backend). Every request requires `role: 'admin'` JWT.

### Investments (`/admin/investments`)

The busiest admin screen. The header shows **6 live stat cards** (refreshed every 30s):

| Card | Meaning | Urgency color |
|---|---|---|
| Pending Approvals | Investments waiting for admin approval | Red |
| Returns Awaiting | Matured investments to be paid out | Red |
| About to Complete | Maturing within 1 hour | Yellow |
| Capital Under Mgmt | Total active investment in ₹ | Neutral |
| Approval Rate | % of approved vs. rejected | Green |
| Revenue This Month | Month-to-date returns paid | Neutral |

**Tabs:**
- **Investments** — badge turns red when `pendingApprovals > 0`
- **Returns** — badge turns red when `returnsAwaiting > 0`, yellow when `aboutToComplete > 0`

**Filters (URL-synced, debounced 300ms):**
- Search by name, email, reference code
- Tier filter: Bronze / Silver / Gold / Platinum chips (multi-select, toggle)
- Amount range: enter rupees, sent as paise to API
- Date range: from / to
- Sort: 8 options (newest, oldest, amount asc/desc, return asc/desc, status)

**Actions per investment:**
- Approve → `POST /api/admin/investments/:id/approve` (sets status `active`, starts 36h timer)
- Reject → `POST /api/admin/investments/:id/reject`
- Approve Return → `POST /api/admin/investments/:id/return/approve` (credits wallet)
- Reject Return → `POST /api/admin/investments/:id/return/reject` (with reason)

### Withdrawals (`/admin/withdrawals`)

Shows all withdrawal requests filterable by status (`pending` / `completed` / `rejected`).

**Status machine:**
```
pending → processing → completed
         ↓
         failed → pending (Retry)
pending → rejected
```

- **Bulk select**: checkboxes appear on `pending` rows; "Select All" selects all pending
- **Bulk Approve**: `POST /api/admin/withdrawals/bulk-approve` with `{ ids: [...] }` — atomic, skips non-pending
- **Individual approve**: `POST /api/admin/withdrawals/:id/complete`
- **Reject**: `POST /api/admin/withdrawals/:id/reject`
- **Retry (failed)**: `POST /api/admin/withdrawals/:id/retry` — resets to `pending`
- `processing` rows show an **animated pulsing dot**
- `failed` rows show the `failureReason` and a **Retry button**

### Users (`/admin/users`)

- All users with: name, email, tier, total invested (₹), status, join date
- Toggle: All / Investors / Non-investors
- "Total Invested" column is sortable (click header)
- Actions per user: Freeze / Unfreeze; drill into detail page

### Reports (`/admin/reports`)

4 report types, each with optional date range (`from` / `to`):

| Type | Returns |
|---|---|
| `monthly` | Array of `{ month, count, totalInvested, totalReturned }` |
| `conversion` | `{ pending, active, returned, rejected, conversionRate }` |
| `roi` | `{ expectedReturn, actualReturn, roiPct }` |
| `performance` | Per-plan breakdown array |

- **Export button** on the Investments tab → downloads a CSV of the current filtered view (client-side, no server round-trip)
- Reports link in left sidebar

### Notification Bell

Appears in the mobile admin header. Badge count = `pendingApprovals + returnsAwaiting + aboutToComplete`. Capped at "99+". Red badge only.

---

## API Reference

All API routes are under `http://localhost:5000/api`.

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/auth/register` | Create account |
| POST | `/auth/login` | Get JWT |
| POST | `/auth/forgot-password` | Send OTP |
| POST | `/auth/verify-otp` | Verify OTP |
| POST | `/auth/reset-password` | Reset with new password |
| GET | `/auth/google` | OAuth redirect |
| GET | `/auth/callback` | OAuth callback |

### Investments (user)
| Method | Path | Description |
|---|---|---|
| POST | `/investments` | Create investment (pending) |
| GET | `/investments` | My investments list |
| GET | `/investments/:id` | Single investment (ownership-guarded) |

### Withdrawals (user)
| Method | Path | Description |
|---|---|---|
| POST | `/withdrawals` | Request withdrawal |
| GET | `/withdrawals` | My withdrawal history |

### Admin — Investments
| Method | Path | Description |
|---|---|---|
| GET | `/admin/investments` | All investments (filterable) |
| GET | `/admin/investments/stats` | 6 stat cards |
| POST | `/admin/investments/:id/approve` | Approve investment |
| POST | `/admin/investments/:id/reject` | Reject investment |
| POST | `/admin/investments/:id/return/approve` | Approve return payout |
| POST | `/admin/investments/:id/return/reject` | Reject return with reason |

### Admin — Withdrawals
| Method | Path | Description |
|---|---|---|
| GET | `/admin/withdrawals` | All withdrawals |
| POST | `/admin/withdrawals/bulk-approve` | Bulk approve `{ ids: string[] }` |
| POST | `/admin/withdrawals/:id/retry` | Reset failed → pending |
| POST | `/admin/withdrawals/:id/complete` | Mark paid |
| POST | `/admin/withdrawals/:id/reject` | Reject |

### Admin — Users
| Method | Path | Description |
|---|---|---|
| GET | `/admin/users` | All users (filterable, sortable) |
| GET | `/admin/users/:id` | User detail |
| POST | `/admin/users/:id/freeze` | Freeze account |
| POST | `/admin/users/:id/unfreeze` | Unfreeze account |

### Admin — Reports
| Method | Path | Description |
|---|---|---|
| GET | `/admin/reports/:type` | `type` = monthly / conversion / roi / performance |
| | | Query params: `from=YYYY-MM-DD&to=YYYY-MM-DD` |

### Admin — Other
| Method | Path | Description |
|---|---|---|
| GET | `/admin/stats` | Dashboard overview stats |
| POST | `/admin/wallets/:userId/adjust` | Manual wallet credit/debit |
| GET | `/admin/support` | Support tickets |
| POST | `/admin/support/:id/resolve` | Resolve ticket |

---

## Running the Project

```bash
# Terminal 1 — Backend
cd server
cp .env.example .env       # fill in MONGO_URI, JWT_SECRET, etc.
npm install
npm run dev                 # starts on :5000

# Terminal 2 — Frontend
cd client
npm install
npm run dev                 # starts on :5173
```

**Seed plans** (required before any investment can be created):
```bash
cd server && npm run seed
```

**Tests:**
```bash
# Server (Jest + Supertest, in-memory MongoDB)
cd server && npm test

# Client (Vitest — requires Node 20+)
cd client && nvm use 20 && npx vitest run

# E2E (Playwright — requires Node 22+)
nvm use 22
```

---

## Key Concepts for Developers

### Money is always in paise (integer)
- `amount: 10000` = ₹100
- All DB fields store paise: `Investment.amount`, `Investment.expectedReturn`, `Withdrawal.gross`, `Withdrawal.net`
- Display with `inr(amount)` from `@/lib/format` — handles paise→rupees + Indian locale formatting
- Never store or compare floats — use integer paise throughout

### ID Chips
Every reference ID in the UI uses `IdChip` from `@/lib/ids.tsx`:
- Investment: `formatInvestId(referenceCode)` → `invest-REF001`
- User: `formatUserId(publicId)` → `user-ASM-8F3K2Q`
- Support: `formatSupportId(id)` → `support-abc123`
- All chips have copy-to-clipboard built in

### Design Tokens — ASM brand colors only
Never use raw Tailwind palette utilities (`bg-blue-500`, `text-red-600`, etc.). Use only:

| Token | Usage |
|---|---|
| `asm-navy` | Primary headings, dark text |
| `asm-blue` | Primary action color, links, active states |
| `asm-blue-dark` | Hover states on blue elements |
| `asm-green` | Profit, success, positive indicators |
| `asm-red` | Urgency, errors, rejection, negative |
| `asm-muted` | Secondary text, warnings (yellow-equivalent) |
| `asm-body` | Body text |
| `asm-line` | Borders, dividers |
| `asm-tint` | Light surface / chip backgrounds |

### React Query patterns
- All server state via `@tanstack/react-query`
- Hooks in `client/src/hooks/queries.ts`
- In tests: mock at `vi.mock('@/services/api/admin')` — never at the hook layer
- Stats bar and notification bell refetch every 30 seconds (`refetchInterval: 30_000`)

### User Tiers
`silver` | `gold` | `diamond` — stored on the User model. Affects which plans users can access and referral rewards. Admin filter chips use bronze/silver/gold/platinum (the API filter key is `tier`).

### Investment Lifecycle
```
pending → active (admin approves, 36h timer starts)
active  → matured (timer fires via BullMQ job)
matured → returned (admin approves return, wallet credited)
matured → rejected (admin rejects return with reason)
pending → rejected (admin rejects initial deposit)
```

### Withdrawal Lifecycle
```
pending → processing → completed (admin marks paid, email sent, cache cleared)
          processing → failed    (with failureReason)
failed  → pending               (admin clicks Retry)
pending → rejected
```
