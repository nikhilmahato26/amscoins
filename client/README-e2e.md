# E2E Tests — ASM Coins

Playwright end-to-end tests that run against a **throwaway in-memory MongoDB** (never the real Atlas cluster).

## Quick start

```bash
# From the repo root amscoins/ directory:
cd client
npm run e2e        # headless (auto-starts both servers)
npm run e2e:ui     # Playwright UI explorer
```

## What runs automatically

`npm run e2e` starts two servers via `webServer` in `playwright.config.ts`:

| Server | Command | URL |
|--------|---------|-----|
| Hermetic Express backend | `cd ../server && npm run e2e:server` | http://localhost:4000/api/health |
| Vite dev server | `npm run dev` | http://localhost:5173 |

The backend (`server/e2e-server.js`) boots a fresh `MongoMemoryReplSet`, seeds plans + admin, and listens on port 4000. It **never reads** `server/.env` or the real Atlas URI.

**Admin credentials (e2e only):** `admin@e2e.test` / `admin123`

## Specs

| File | What it tests |
|------|--------------|
| `tests-e2e/auth.spec.ts` | Register via UI, session persists on reload, logout → /login |
| `tests-e2e/invest.spec.ts` | Silver plan selection → payment page (reference code + Telegram link); admin-approve via API → dashboard balance |
| `tests-e2e/withdraw.spec.ts` | Seed balance via admin helper, submit withdrawal, assert TDS breakdown + pending in history |
| `tests-e2e/leaderboard.spec.ts` | Two seeded users, larger investor ranked #1 on Daily tab |
| `tests-e2e/admin.spec.ts` | Admin approves pending deposit via UI, deposit leaves pending list |

## API helpers (`tests-e2e/helpers.ts`)

These call the hermetic e2e server directly (no browser) to arrange state:

- `register({ name, email, password, referralCode? })` — create a user, returns `{ user, token }`
- `adminLogin()` — returns admin token
- `createInvestment(userToken, planKey, amountPaise)` — creates a pending deposit
- `approveDeposit(adminToken, investmentId)` — admin approves a deposit
- `adminAdjustWallet(adminToken, userId, paise, direction?, note?)` — credit/debit wallet
- `uniqueEmail(prefix?)` — generates a unique email per test run

## CI

Set `CI=true` to disable `reuseExistingServer` (Playwright will always start fresh servers).

```bash
CI=true npm run e2e
```

## Safety guarantee

`server/e2e-server.js` sets `process.env.MONGO_URI` to the in-memory replica set URI **before** requiring any server modules. `dotenv.config()` in `server/src/config/env.js` uses `{ quiet: true }` and does NOT override already-set env vars, so the real Atlas URI from `server/.env` is never used.
