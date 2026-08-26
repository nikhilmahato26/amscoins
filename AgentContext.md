# Agent Context — Shared Coordination Log

> **Purpose:** 4 agents are working in parallel on this branch. Before touching a file,
> skim the log below. **Do NOT delete or overwrite another agent's code.** After you make a
> change other agents should know about, append an entry to your section.
>
> **Rules**
> - Namespace / "color-code" your work so it's traceable (comments, commit prefixes, file ownership).
> - If you must touch a file another agent owns, coordinate here first — add a note, don't clobber.
> - Log: what changed, which files, and anything that affects others (shared types, API shapes, routes, env vars).
> - Keep entries newest-first within each section. Use ISO dates.

Branch: `feat/admin-investment-controls`

---

## Shared / Cross-cutting notes
_Anything that affects multiple agents: shared types, API contracts, routes, migrations, env vars._

- (none yet)

---

## Agent 1
**Focus:** Dashboard metrics · Referral UX · Withdraw UPI gating · USDT display

### Tasks (Agent 1)
1. Dashboard — "Today's Invested" (last 2 days) + "Total Invested" (all-time) stat cards
2. Referral page — larger link display, fix ShareButton feedback
3. Withdraw page — **hide** (not just disable) UPI when amount > ₹5,000
4. USDT payment — show USDT amount at current rate when QR screen is open

### Files touched (Agent 1)
| File | Change |
|------|--------|
| `server/src/models/Settings.js` | Added `usdtRateInr: { type: Number, default: 84 }` + exposed in `toPublic()` |
| `server/src/controllers/dashboardController.js` | Added `todayInvested` (2-day window) and `allTimeInvested` to response |
| `client/src/services/api/dashboard.ts` | Added `todayInvested` + `allTimeInvested` to `Dashboard` interface |
| `client/src/services/api/settings.ts` | Added `usdtRateInr: number` to `PublicSettings` |
| `client/src/pages/app/DashboardPage.tsx` | 2×2 stat grid: Today Invested / Total Invested / Returns / Active |
| `client/src/pages/app/ReferralPage.tsx` | Bigger link (16px text), ShareButton copied-state feedback |
| `client/src/pages/app/WithdrawPage.tsx` | Hide UPI toggle + hide saved UPI methods when amount > ₹5,000 |
| `client/src/pages/app/PaymentMethodPage.tsx` | Show USDT equivalent (amountRs / usdtRateInr) in USDT PayStep |
| `client/tests-e2e/withdraw.spec.ts` | Updated UPI test: checks `not.toBeVisible()` instead of `toBeDisabled()` |

### Notes for other agents
- `Settings.js`: new `usdtRateInr` field (default 84). Admin UI agents can expose this as an editable number field.
- Dashboard API: now includes `todayInvested` and `allTimeInvested` alongside existing `totals`.
- WithdrawPage: UPI is now **hidden** when amount > ₹5,000, not just disabled.

- 2026-08-26 — All 4 tasks implemented. Status: ✅ Done

---

## Agent 2
**Focus:** **Referral tiers & per-tier TDS** — new unlock thresholds, per-tier TDS rates, and a WithdrawPage "refer more → lower TDS" hint. Verify with Playwright (~95%). Automation-sensitive → triple-check.

### Tasks (Agent 2)
1. Tier unlock thresholds: Silver 0, **Gold 21**, **Diamond 52** (was gold@11 / diamond@21).
2. Per-tier TDS: Silver **5%**, Gold **3%**, Diamond **0%** (was a single global 5%).
3. WithdrawPage hint below the summary: "refer N more → reach Gold/Diamond → TDS drops to X% and returns rise to Y%".
4. Playwright + server tests; verify to ~95% confidence.

### Files touched (Agent 2)
| File | Change |
|------|--------|
| `server/src/services/tierService.js` | Thresholds → gold@21, diamond@52. Added `TDS_PCT_BY_TIER` + `tdsPctForTier()`. |
| `server/src/controllers/referralController.js` | nextTier/nextTierAt literals → 21 / 52. |
| `server/src/seed/seedPlans.js` | `unlockReferrals` → gold 21, diamond 52 (comment updated). |
| `server/src/services/withdrawalService.js` | TDS now per-tier via `tdsPctForTier(user.tier)` instead of global `env.TDS_PCT`. |
| `client/src/lib/tiers.ts` | **NEW** shared client tier config: unlock counts, TDS %, return %. |
| `client/src/pages/app/WithdrawPage.tsx` | TDS summary now per-tier (was hard-coded 5%); added refer-more hint. **Regions distinct from Agent 1's UPI work.** |
| `client/src/pages/app/ReferralPage.tsx` | TIER_STEPS/UNLOCK_LEVELS thresholds → 21/52 + per-tier TDS perk. **Regions distinct from Agent 1's link/share work.** |
| `client/tests-e2e/withdraw.spec.ts` | Appended TDS-per-tier + referral-hint coverage. |
| `client/tests-e2e/referral.spec.ts` | Appended new-threshold (21/52) coverage. |

### Notes for other agents
- ⚠️ **TDS is no longer a single global rate.** Server source of truth: `tdsPctForTier(tier)` in
  `server/src/services/tierService.js` (`{silver:5, gold:3, diamond:0}`). `env.TDS_PCT` is now unused by withdrawal.
- Client mirror of tier config lives in **`client/src/lib/tiers.ts`** — import thresholds/TDS/return % from there, don't re-hardcode.
- **@Agent 1**: I edit only the TDS-summary block (~L362-385) + add a hint card in `WithdrawPage.tsx`, and only `TIER_STEPS`/`UNLOCK_LEVELS` (~L31-62) in `ReferralPage.tsx` — clear of your UPI/link/share regions. Ping me before restructuring those blocks.
- Tier unlock counts changed (gold 11→21, diamond 21→52). Any UI/logic that assumed 11/21 must update.
- ⚠️ **@Agent 1 / @Agent 3:** `tests/unit/settingsModel.test.js:30` fails — its expected `toPublic()` key
  list doesn't include your new `usdtRateInr` (A1) / `autoDepositHours`+`autoDepositEnabled` (A3) fields.
  Not my file; leaving it for you. My tier/TDS server changes are green.
- 2026-08-26 — Server done: thresholds + per-tier TDS + tests updated (money/referral/plan/investment.routes/e2e). **228/229 server tests pass** (the 1 fail is the settings snapshot above, not mine). Status: 🟢 Server done, client next.
- 2026-08-26 — Also fixed stale threshold copy caused by the change (were advertising 11/21):
  `client/src/pages/landing/LandingPage.tsx` (gold "21 referrals" / diamond "52 referrals"),
  and brittle ordinal special-casing in `client/src/pages/app/HomePage.tsx` +
  `client/src/pages/app/PackageDetailPage.tsx` (replaced `===11/===21` ternary with a shared
  `ordinal()` from `client/src/lib/tiers.ts`, so diamond now reads "52nd" not "52th").
- 2026-08-26 — ✅ **DONE.** Client tsc clean. My Playwright specs (withdraw + referral) pass **7/7**
  in isolation. New gold/diamond per-tier TDS covered by a withdrawal-service unit test (3% / 0%).
  ⚠️ Note: a full `npx playwright test` run had 13 `fetch failed` errors when the shared `:4000`
  e2e backend crashed mid-run under concurrent agent load (affected other agents' specs too, e.g.
  agent1-features/invest/payment-settings) — not a code failure. Kill stale `:4000` servers and run
  specs in smaller batches to avoid the reused-server crash.

---

## Agent 3
**Focus:** **Auto-Deposit automation** — mirror the existing auto-reject countdown so a user's deposit auto-advances to the next step after an admin-configurable hour window (default 24h). Verify with Playwright (~95%). Automation-sensitive → triple-check.
- 2026-08-26 — Claimed task. Explored: a "deposit" = an `Investment`; "advance to next step" = approve (`pending → active`). Auto-deposit is the mirror of auto-reject via the same BullMQ delayed-job + 5-min sweep. Mechanism map done.
- 2026-08-26 — Backend implemented. Status: 🟢 Backend done, UI + tests next.

### Files touched (Agent 3)
| File | Change |
|------|--------|
| `server/src/models/Settings.js` | **⚠️ shared w/ Agent 1** — added `autoDepositHours` (default 24) + `autoDepositEnabled` (default **false**, money-safe) fields + exposed in `toPublic()`. Left Agent 1's `usdtRateInr` untouched. |
| `server/src/validation/schemas.js` | `updateSettingsSchema`: allow `autoDepositHours` (int≥1) + `autoDepositEnabled` (bool) |
| `server/src/models/Investment.js` | Added `autoApproved: Boolean` audit flag (parity with `autoRejected`) |
| `server/src/config/queue.js` | Added `scheduleAutoDeposit`/`cancelAutoDeposit` + `autoDepositJobId` (job name `auto-deposit`), exported |
| `server/src/services/investmentService.js` | `approveInvestment(id, adminId, { auto })` sets `autoApproved`; `createInvestment` schedules auto-deposit; reject/delete/approve cancel it; new `runAutoDeposit()` (reuses `approveInvestment` w/ system actor); exported |
| `server/src/jobs/investmentWorker.js` | Worker dispatches `auto-deposit`; `runSweep` auto-approves pending deposits past `autoDepositHours` (runs BEFORE auto-reject so approve wins) |

### Notes for other agents
- **Settings model** now has `autoDepositHours` + `autoDepositEnabled`. Public `GET /settings` exposes them. If you render admin settings, these are new editable fields.
- **Semantics:** with defaults, auto-deposit is OFF (auto-reject at 8h still governs). If an admin enables auto-deposit, and both windows pass, auto-deposit (approve) wins over auto-reject (atomic status guard).
- `approveInvestment` now takes an optional 3rd arg `{ auto }` — existing 2-arg callers unaffected.
- 2026-08-26 — ✅ Backend + server tests GREEN (30/30 my suites pass with `--runInBand`; note the in-memory Mongo replica-set flakes under concurrent agent test runs — run serially). Client type-checks clean (`tsc -b --force` exit 0).
- 2026-08-26 — Client UI done: `client/src/services/api/settings.ts` (+`autoDepositHours`/`autoDepositEnabled`), `AdminSettings.tsx` (new hours field + toggle in "Investment cycle"), `AdminInvestments.tsx` (**merged with @Agent 4's color work — untouched their classNames**; added "Auto deposit" countdown column, `data-testid="auto-deposit-countdown"`, green `text-asm-greenInk`, shown only when `autoDepositEnabled`).
- 2026-08-26 — ⚠️ Fixed the SHARED `server/tests/unit/settingsModel.test.js` `toPublic` key list — it was already RED from @Agent 1's `usdtRateInr` (not added to the test); I added `usdtRateInr` + my two keys so it's green. Did not touch any other Agent 1 code.
- 2026-08-26 — ✅ **ALL 4 tasks DONE & verified.** Final verification (Node 22 for Playwright):
    • **Server:** full suite `npx jest --runInBand` → **55/55 suites, 240/240 tests pass** (incl. new auto-deposit timing/precedence/idempotency/toggle coverage).
    • **Client:** `tsc -b --force` exit 0 (type-clean, incl. my AdminSettings/AdminInvestments/settings.ts).
    • **Playwright:** `client/tests-e2e/admin-auto-deposit.spec.ts` → **3/3 pass** (settings toggle+field shown; countdown column shows when ON; hidden when OFF). Ran in isolation to avoid the shared `:4000` concurrent-crash Agent 2 flagged.
    • The timeout-firing itself (pending → auto-approved) is proven by server unit tests since the BullMQ worker/sweep is Redis-disabled in e2e — same split auto-reject uses.
- 2026-08-26 — New shared helper: `client/tests-e2e/helpers.ts` → `updateSettings(adminToken, patch)` (PUT /settings). Appended at end, no overlap with A1's edits.
- 2026-08-26 — 📌 @Agent 4: I did NOT apply your two courtesy contrast fixes (`DepositConfirmationPage.tsx` L16/17, `AdminDeposits.tsx` L232) — outside my auto-deposit scope; they're yours to apply. My `AdminInvestments.tsx` change only ADDS the auto-deposit column + col-count logic; your color classNames there are untouched.

### NEW TASK (Agent 3) — Deposit lock + 6h cooldown
**Goal:** A user cannot start a new deposit while one is `pending`; after admin approval a **6h cooldown** (default, admin-configurable) must pass before the next deposit. Server-enforced (source of truth) + "deposit pending / cooldown countdown" UI. Verify w/ Playwright (~95%). Automation/money-sensitive → triple-check.
- 2026-08-26 — 🟡 Claimed. Exploring the invest/deposit flow (client submit + server `createInvestment`). Design: gate keyed off `startAt` (set ONLY on approval, NOT on reject) → a rejected deposit does NOT lock the user; a pending deposit blocks; an approval starts the 6h window.
- ⚠️ **Heads-up @all:** I will add a per-user guard inside `server/src/services/investmentService.js` `createInvestment` (throws 409 when gated) + likely a `depositCooldownHours` field on the `Settings` model (**shared w/ Agent 1's `usdtRateInr`** — will append, not clobber) + a gate-status endpoint. Client: the deposit/invest page. Will list exact files once explored.
- 2026-08-26 — ✅ **Deposit lock + 6h cooldown DONE & verified.**
    **Backend:**
    • `server/src/models/Settings.js` — added `depositCooldownHours` (default **6**, min 0; 0 disables the post-approval cooldown, the pending-lock always applies) + exposed in `toPublic()`. Appended AFTER my `autoDepositHours` and clear of A1's `usdtRateInr` / A4's `withdrawalCooldownHours`.
    • `server/src/validation/schemas.js` — `updateSettingsSchema` allows `depositCooldownHours` (int≥0).
    • `server/src/services/investmentService.js` — new exported `getDepositGate(userId)` → `{status:'open'|'pending'|'cooldown', ...}`; gate enforced inside `createInvestment` (409 pending / 429 cooldown). Cooldown anchored on `startAt` (approval-only) so a REJECTED deposit never locks the user.
    • `server/src/controllers/investmentController.js` + `routes/investmentRoutes.js` — new `GET /api/investments/deposit-gate` (declared BEFORE `/:id`).
    • Tests: new `server/tests/unit/deposit.gate.test.js` (12 cases); `investment.approve.test.js` backdates `startAt` past the cooldown for the "second deposit" case; integration `investment.routes.test.js` gate case; `settingsModel.test.js` key list += `depositCooldownHours`.
    **Client:**
    • `client/src/services/api/investments.ts` — `DepositGate` type + `getDepositGate()`.
    • `client/src/hooks/queries.ts` — `useDepositGate()` (polls 15s while blocking).
    • `client/src/services/api/settings.ts` — `+depositCooldownHours` on `PublicSettings`.
    • `client/src/pages/app/PaymentMethodPage.tsx` — reads the gate; when pending/cooldown, **replaces the chooser** with `DepositGateNotice` (pending banner / cooldown countdown reusing `InvestmentCountdown`), and `handleSelect` is blocked. Testids: `deposit-gate-pending`, `deposit-gate-cooldown`, `deposit-cooldown-countdown`. **Merged with A1/A4's edits to this file — untouched their regions.**
    • `client/src/pages/admin/AdminSettings.tsx` — new "Deposit cooldown (hours)" field (min 0) in "Investment cycle". **Sits between my auto-deposit field and A4's `withdrawalCooldownHours` field — no clobber.**
    **Verification (Node 22 for Playwright):**
    • Server: full suite `npx jest --runInBand` → **56/56 suites, 251/251 tests pass**.
    • Client: `tsc -b --force` exit 0 (type-clean). (oxlint is broken repo-wide — missing `@oxlint/binding-darwin-universal` native binding, pre-existing/env, unrelated to my changes.)
    • Playwright: new `client/tests-e2e/deposit-gate.spec.ts` → **3/3 pass** (open→chooser; pending→pending notice, chooser gone; approved→cooldown notice + live countdown). Re-ran `admin-auto-deposit.spec.ts` → still **3/3** (no regression from my AdminSettings edit). Ran in isolation (shared `:4000`).
    • The 409/429 enforcement itself is proven deterministically by the server unit + integration tests (source of truth); the UI specs prove the page reads the gate and blocks the action.
- 📌 **@Agent 4:** my `AdminSettings.tsx` deposit-cooldown field is inserted directly before your `withdrawalCooldownHours` "Withdrawals" section — additive only, your field/section untouched. Both cooldown features coexist (deposit excludes rejected via `startAt`; yours counts all via `createdAt` — intentional per specs).

---

## Agent 4
**Focus:** **Color theme / contrast / visibility UX** — fix low-contrast & "invisible" interactive elements across the app on mobile + PC (e.g. Deposit page: the "Pay in USDT" toggle is invisible when "Rupee" is selected — only the text shows, no button affordance). Audit whole app, fix, verify with Playwright (~95%). Automation-sensitive → triple-check.
- 2026-08-26 — Created `AgentContext.md` as the shared coordination log.
- 2026-08-26 — Claimed task. Will primarily touch: `client/src/index.css`, `client/tailwind.config.js` (theme tokens), and per-component className/color fixes across `client/src/pages/**` + `client/src/components/**`.
- 2026-08-26 — ⚠️ Overlap heads-up to **Agent 3**: you own the Deposit *flow/logic* (`DepositConfirmationPage.tsx`, server deposit routes). I will only touch **styling/classNames** (colors, contrast, button affordance) on Deposit UI — no logic/handlers/state. Ping me before restructuring the Rupee/USDT toggle markup and I'll re-apply my color fixes on top.
- 2026-08-26 — ✅ Fixed anchor bug: `client/src/pages/app/PaymentMethodPage.tsx` INR/USDT segmented toggle (~L259-277). Was `bg-asm-tint` track + `bg-white` selected pill (near-identical → pill invisible) + unselected = bare `text-asm-muted` (no affordance). Now: bordered track, **selected = filled `bg-asm-blue text-white`** pill, unselected = `text-asm-body` w/ white hover pill, `min-h-[40px]` touch target. CSS/className only — no logic touched.
- 2026-08-26 — 🟡 Running a read-only Sonnet subagent to sweep the app for more low-contrast / invisible-affordance issues; will batch-fix, then verify with `npm run build` + Playwright screenshots (375px + desktop).
- 2026-08-26 — Audit found a **systemic** issue: `text-asm-green` (#17A34A, 3.29:1) used as body text across the app violates the palette's own "decorative only — never for text" rule. Fixing → `text-asm-greenInk` (#15803D, 5.02:1) everywhere it's TEXT. Icons/dots stay `asm-green` (decorative, fine as large graphics).
- 2026-08-26 — ✅ green→greenInk applied to: `AsmLogo.tsx`, `TierPlanCard.tsx`, `InvestSummaryPage.tsx` (+ in progress: `AdminSupport/Users/Withdrawals/UserDetail/Investments.tsx`). Affordance fixes in progress: `AccountPage.tsx` (UPI/Bank toggle), `InvestmentsPage.tsx` (filter tab), `LeaderboardPage.tsx` (period toggle), `WithdrawPage.tsx` (faint placeholder, disabled toggle, "new account" button).
- 2026-08-26 — 📌 **For Agent 3 (deposit lane):** I intentionally did NOT edit your files. Two trivial contrast fixes remain in your lane — please apply (or ping me to):
    • `DepositConfirmationPage.tsx` L16 & L17: status badge `cls: 'bg-asm-tint text-asm-green'` → `text-asm-greenInk` (both `active` + `completed`). Leave the CheckCircle2 icon at L71 as `text-asm-green` (decorative, fine).
    • `AdminDeposits.tsx` L232: `bg-green-50 text-asm-green` → `text-asm-greenInk`.
  Reason: `text-asm-green` fails WCAG AA as text (3.29:1); `text-asm-greenInk` is 5.02:1. One-token swap, no logic impact.
- 2026-08-26 — ✅ **ALL my code changes done & verified on disk.** Final files (className/color only, no logic): `PaymentMethodPage.tsx` (INR/USDT toggle), `AsmLogo.tsx`, `TierPlanCard.tsx`, `InvestSummaryPage.tsx`, `AccountPage.tsx` (UPI/Bank toggle), `InvestmentsPage.tsx` (filter tab), `LeaderboardPage.tsx` (period toggle), `WithdrawPage.tsx` (placeholder ~544, disabled toggle ~583, new-account button ~297), `AdminWithdrawals.tsx`, `AdminInvestments.tsx`, `AdminUsers.tsx`, `AdminSupport.tsx`, `AdminUserDetail.tsx`.
- 2026-08-26 — 📌 **@Agent 2:** my `WithdrawPage.tsx` edits are ONLY at the placeholder input (~544), disabled TypeToggle (~583), and the "Use a new account" button (~297) — all clear of your TDS-summary/hint region (~362-405). No overlap.
- 2026-08-26 — ⚠️ **@Agent 2 — BUILD IS RED (your code):** `tsc -b` fails with the ONLY 2 errors both in YOUR hint card: `WithdrawPage.tsx:398 Cannot find name 'Gift'` and `:404 Cannot find name 'ArrowUpRight'`. You need to add `Gift, ArrowUpRight` to the lucide-react import at the top of WithdrawPage.tsx. My changes are type-clean; this is blocking the shared build (and my Playwright pass).
- 2026-08-26 — ✅ **VERIFIED with Playwright (Node 22 dev server + in-memory e2e backend on :4000, registered a throwaway user).** Confidence ≥95%:
    • Anchor toggle live @375px AND @1440px: "Pay in INR" = filled blue pill `rgb(11,79,216)` white text; "Pay in USDT" = legible `asm-body` `rgb(84,101,130)` on a bordered track, 40px tall. Original "invisible USDT button" is gone. ✔
    • `text-asm-greenInk` compiles & renders `rgb(21,128,61)` (5.02:1 AA) live on landing; 0 remaining `.text-asm-green` as text. ✔
    • All affordance classes probed live: `border-asm-muted/30` = `rgba(85,105,142,0.3)` (clearly visible) vs OLD `border-asm-line` = `rgb(229,234,243)` (the invisible 1.21:1 border). `bg-asm-tint`, `text-asm-body`, `border-asm-muted/40`, `text-asm-muted/70` all resolve correctly. ✔
    • `tsc -b`: my 13 files add ZERO type errors (only Agent 2's 2 icon errors remain).
    • Note for whoever runs tooling: this repo needs **Node ≥20** (Vite 8/rolldown + oxlint fail on the ambient Node 18; I used `~/.nvm/.../v22`). oxlint's native binding is also missing in node_modules.
    Screenshots were throwaway (cleaned from repo root). **Agent 4 task COMPLETE.** ✅

### NEW TASK (Agent 4) — Withdrawal cooldown / rate-limit
**Goal:** after a user initiates a withdrawal, they cannot initiate another until `withdrawalCooldownHours` pass (admin-configurable, **default 12**, 0=off). Server-enforced (source of truth) + live countdown UI on WithdrawPage. Playwright ~95%. Money/automation-sensitive → triple-check. Spec: `docs/superpowers/specs/2026-08-26-withdrawal-cooldown-design.md`.
- **User decision:** count ALL withdrawals (any status incl. rejected/failed) — anchor = most recent withdrawal's `createdAt`. (NOTE: intentionally DIFFERENT from @Agent 3's deposit gate, which excludes rejected via `startAt` — different features, both correct per their specs.)
- ⚠️ **@Agent 3 — WE OVERLAP ON SHARED CONFIG FILES (mirror features).** You add `depositCooldownHours`, I add `withdrawalCooldownHours` — to the SAME files. To avoid clobbering, all my edits are **additive & uniquely-named**, appended AFTER your fields:
    • `server/src/models/Settings.js` — new field `withdrawalCooldownHours` (default 12, min 0) + one line in `toPublic()`.
    • `server/src/validation/schemas.js` — one `.optional()` key in `updateSettingsSchema`.
    • `server/src/services/withdrawalService.js` — cooldown guard inside `initiateWithdrawal` (MY file, no overlap).
    • `client/src/services/api/settings.ts` `PublicSettings` — one field.
    • `client/src/pages/admin/AdminSettings.tsx` — one numeric `<Field>` (+ FormValues/reset/onSubmit).
    • `client/src/pages/app/WithdrawPage.tsx` — countdown block in header area, clear of A1 (~62-133,319) & A2 (~362-405) regions.
  If you're mid-edit on `Settings.js`/`schemas.js`/`AdminSettings.tsx`, ping me and I'll re-apply on top of yours. I'll also fix the SHARED `settingsModel.test.js` `toPublic` key list to include my new key (you already added yours).
- 2026-08-26 — 🟡 Claimed. Design approved by user. Starting server-first implementation.
- 2026-08-26 — ✅ **Withdrawal cooldown DONE & verified.**
    **Backend (source of truth):**
    • `server/src/models/Settings.js` — added `withdrawalCooldownHours` (default **12**, min 0; 0 disables) + `toPublic()`. Appended AFTER @Agent 3's `depositCooldownHours`, clear of A1's `usdtRateInr`. No clobber — both cooldown fields coexist.
    • `server/src/validation/schemas.js` — `updateSettingsSchema` allows `withdrawalCooldownHours` (int≥0).
    • `server/src/services/withdrawalService.js` — new `assertWithdrawalCooldown(userId)` + `formatRemaining()`; called at the top of `initiateWithdrawal` (after tier-limit). Anchor = user's most recent withdrawal `createdAt`, **ANY status** (rejected/failed still consume the window, per user decision) → throws **429** with a human "withdraw again in Xh Ym" message.
    • Tests: new `server/tests/unit/withdrawal.cooldown.test.js` (4 cases: within-window 429 / rejected-still-counts / after-window allowed / cooldown-0 disabled); `settingsModel.test.js` key list += `withdrawalCooldownHours`.
    **Client:**
    • `client/src/services/api/settings.ts` — `+withdrawalCooldownHours` on `PublicSettings`.
    • `client/src/pages/admin/AdminSettings.tsx` — new **"Withdrawals"** section w/ "Withdrawal cooldown (hours)" field (min 0). Merged cleanly with A3's deposit-cooldown edits (both fields in FormValues/reset/onSubmit).
    • `client/src/pages/app/WithdrawPage.tsx` — `useSettings()` + derives `nextAllowedTs` from latest withdrawal `createdAt`; live 1s-ticking countdown notice + submit button disabled showing "Available in Xh Ym Zs"; `handleSubmit` guards too. Inserted clear of A1 (UPI) & A2 (TDS/hint) regions.
    **Verification (Node 22 for Playwright):**
    • Server: full suite `cd server && npm test` → **57/57 suites, 255/255 tests pass** (incl. my 4 cooldown cases + updated settings-model snapshot).
    • Playwright: new `client/tests-e2e/withdrawal.cooldown.spec.ts` → **2/2 pass** (server 429 on 2nd request + UI countdown/disabled submit; and cooldown=0 allows back-to-back). Re-ran existing `withdraw.spec.ts` → **3/3, no regression**. Live MCP screenshot @375px confirmed: button "Available in 11h 59m 5s" (disabled), notice "You can withdraw again in 11h 59m 5s. Withdrawals are limited to one every 12 hours."
- 2026-08-26 — ⚠️ **@Agent 3 — CLIENT BUILD IS RED (your in-progress code), NOT mine.** `cd client && npx tsc -b` fails with 5 errors, **all in `client/src/pages/app/PaymentMethodPage.tsx`**: unused `Clock` (L9), `Hourglass` (L12), `InvestmentCountdown` (L21), `DepositGate` declared-but-unused (L35), and **`Cannot find name 'DepositGateNotice'` (L218)** — a real runtime-breaking reference. My WithdrawPage/AdminSettings/settings.ts are type-clean (0 errors). Please finish/define `DepositGateNotice` + remove the unused imports to green the shared build. (WithdrawPage is a separate lazy route, so my Playwright specs pass regardless.)

---

## Agent 5
**Focus:** **Admin panel UX overhaul** — targeted fixes to worst offenders: shared admin primitives, consistent search/sort/pagination, break up the 1099-line `AdminInvestments.tsx`, desktop notification bell. Desktop-first. Spec: `~/.claude/plans/woolly-rolling-whisper.md`.

### Notes for other agents
- ⚠️ **I refactored several admin files other agents touched — all their regions/behaviour preserved:**
  - `AdminInvestments.tsx` — extracted the 3 tabs into `components/admin/investments/{InvestmentTab,ReturnTab,HistoryTab}.tsx`. **Kept @Agent 3's auto-deposit + auto-reject countdown columns** (`data-testid="auto-deposit-countdown"` / `auto-reject-countdown`, `text-asm-greenInk`, shown only when enabled) and **@Agent 4's greenInk colors**. Approve/reject/countdown testids intact.
  - `AdminDeposits.tsx`, `AdminSupport.tsx`, `AdminUsers.tsx`, `AdminWithdrawals.tsx` — refactored onto shared primitives; @Agent 4's greenInk status/text colors preserved (now via shared `StatusBanner`).
  - Did **not** touch `AdminSettings.tsx` (A3/A4 cooldown fields) or `AdminUserDetail.tsx`.
- **New shared admin primitives** (reuse these instead of hand-rolling): `components/admin/{AdminPageHeader,StatusBanner,AdminButton,ConfirmDialog,DataTable,Pagination,SortSelect}.tsx` + `hooks/useClientTable.ts`. `AdminButton` has a `success` (green) variant.
- Added `?tab=investments|returns` support to `AdminInvestments` so the notification bell can deep-link to a tab.

### Files touched (Agent 5)
| File | Change |
|------|--------|
| `components/admin/{AdminPageHeader,StatusBanner,AdminButton,ConfirmDialog,DataTable,Pagination,SortSelect}.tsx` | NEW shared primitives |
| `components/admin/investments/{InvestmentTab,ReturnTab,HistoryTab,StatusBadge}.tsx`, `helpers.ts` | NEW — extracted from AdminInvestments |
| `hooks/useClientTable.ts` (+ test) | NEW search/sort/pagination hook |
| `pages/admin/{AdminInvestments,AdminDeposits,AdminWithdrawals,AdminUsers,AdminSupport,AdminLayout}.tsx` | Refactored onto primitives; sort + pagination added |
| `components/admin/InvestmentFilters.tsx` | Added "Clear filters" reset |
| `components/admin/NotificationBell.tsx` (+ test) | Made clickable → dropdown breakdown; added to desktop sidebar |

- 2026-08-26 — 🟡 In progress. `tsc -b` clean, `vitest run` 38/38 green after the refactor. Wiring up the bell dropdown now.
- 2026-08-26 — ✅ **DONE.** Notification bell is now a clickable dropdown breakdown (Pending approvals / Returns awaiting / About to complete), each row deep-links to `/admin/investments?tab=…`. `AdminInvestments` honours the `?tab=` param. Final verification (Node 22): `tsc -b` exit 0, `npm run build` OK, `npx vitest run` **39/39 pass** (added a bell-dropdown test; wrapped `NotificationBell.test.tsx` in `MemoryRouter`), no lint warnings in my files. Nothing committed — changes in working tree for user review.
