# ASM Coins — Backend API

Node.js/Express + MongoDB backend for ASM Coins: tiered investment plans,
member-count referral unlocks (Silver → Gold → Diamond), admin-credited
deposits (via manual Telegram/QR), and admin-approved withdrawals with 5% TDS
and email notifications.

## Stack
Express 5 · Mongoose 9 (MongoDB) · JWT (`jsonwebtoken`) · `bcryptjs` · Zod ·
Nodemailer (Gmail SMTP). Tests: Jest + Supertest + `mongodb-memory-server`.

Function-based MVC: **routes → validate (zod) → controller → service → model**.
All money is stored as **integer paise**. Wallet + referral + withdrawal
mutations run inside MongoDB transactions.

## Setup
```bash
cd server
npm install
cp .env.example .env      # then edit values
```

### Environment (`.env`)
| Var | Notes |
|-----|-------|
| `MONGO_URI` | A **replica set** is required for transactions (Atlas, or `mongod --replSet`). |
| `JWT_SECRET` | Sign/verify tokens. |
| `TELEGRAM_LINK` | Deep link users are sent to for the QR/payment. |
| `TDS_PCT` | Withdrawal TDS percent (default `5`). |
| `SMTP_HOST/PORT/USER/PASS` | Gmail SMTP. For `bhaveshsolminde@gmail.com` create a **Gmail App Password** (Google Account → Security → 2-Step Verification → App passwords) and use it as `SMTP_PASS` — a normal account password will not work. |
| `MAIL_FROM` | From header, e.g. `"ASM Coins <bhaveshsolminde@gmail.com>"`. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | Bootstrapped admin account on server start. |

## Run
```bash
npm run seed     # upsert the three investment plans
npm run dev      # start API with --watch (also seeds plans + admin on boot)
npm test         # full test suite (in-memory Mongo; no external services)
```

## Domain rules
- **Tiers by referral count:** Silver `0–10`, Gold `11–20`, Diamond `21+`.
  Gold unlocks at the 11th credited member, Diamond at the 21st.
- **Returns (plan terms):** Silver 25% · Gold 30% · Diamond 40% · 36-hour term.
  Return crediting is **not automated** (pending business decision).
- **Referral credit:** a member is credited to the referrer only when that
  referred user's **first** deposit is admin-approved. Idempotent.
- **Withdrawal:** gross debited immediately; `net = gross − 5% TDS`; admin
  `complete` pays out, admin `reject` re-credits the gross. Emails on each step.

## API
Auth header: `Authorization: Bearer <token>` unless noted.

### Auth
| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/register` | `{ name, email, password, referralCode? }` → `{ user, token }` |
| POST | `/api/auth/login` | `{ email, password }` → `{ user, token }` |
| GET | `/api/auth/me` | current user |

### User
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/plans` | plans with per-user `unlocked` flag |
| POST | `/api/investments` | `{ planKey, amount, referralCode? }` → `{ investment, telegramLink }` |
| GET | `/api/investments` | your investments |
| GET | `/api/wallet` | `{ balance, transactions }` |
| GET | `/api/referral` | code, link, count, tier, next-tier progress, referred users |
| POST | `/api/withdrawals` | `{ amount, upiId }` → withdrawal (immediate debit) |
| GET | `/api/withdrawals` | your withdrawals |

### Admin (`role: admin`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/api/admin/investments?status=pending` | list deposits |
| POST | `/api/admin/investments/:id/approve` | credit wallet + referral |
| POST | `/api/admin/investments/:id/reject` | mark rejected |
| GET | `/api/admin/withdrawals?status=pending` | list withdrawals |
| POST | `/api/admin/withdrawals/:id/complete` | mark paid + email |
| POST | `/api/admin/withdrawals/:id/reject` | refund + email |
| GET | `/api/admin/users` | list users |
| POST | `/api/admin/users/:id/freeze` · `/unfreeze` | toggle status |
| POST | `/api/admin/wallets/:userId/adjust` | `{ amount, direction, note }` manual credit/debit |

## Notes / deferred
- Return accrual ("every 2 days?") and a 3-hour auto-refund cron are **not**
  built — refunds are admin-triggered. `emailService` is the seam for adding SMS.
- Plan ₹ limits in `src/seed/seedPlans.js` are placeholders pending sign-off.
