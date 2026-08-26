# Withdrawal Cooldown (rate-limit) — Design

**Date:** 2026-08-26 · **Owner:** Agent 4 · **Branch:** `feat/admin-investment-controls`

## Problem
Users can initiate withdrawals repeatedly ("again and again"). We want an admin-configurable
cooldown: after a user initiates a withdrawal, they cannot initiate another until N hours pass.

## Decisions (approved by user)
- **Cooldown window:** admin setting `withdrawalCooldownHours`, default **12**, `min 0`. `0` = disabled.
- **What counts:** **ALL** withdrawals, any status (pending/processing/completed/failed/rejected).
  The anchor is the user's **most recent withdrawal's `createdAt`**, regardless of outcome.
  (A rejected/failed withdrawal still consumes the window — strictest anti-spam, per user.)
- **Enforcement:** server-side is the source of truth. Client mirrors it with a live countdown + disabled submit.
- **UX:** when in cooldown, WithdrawPage shows a ticking "You can withdraw again in Xh Ym" and disables submit.

## Server (source of truth)
1. `server/src/models/Settings.js`
   - Field: `withdrawalCooldownHours: { type: Number, default: 12, min: 0 }`
   - `toPublic()`: add `withdrawalCooldownHours: this.withdrawalCooldownHours`
2. `server/src/validation/schemas.js` `updateSettingsSchema`
   - `withdrawalCooldownHours: z.number().int().min(0).optional()`
3. `server/src/services/withdrawalService.js` `initiateWithdrawal(user, body)`
   - Early guard (after tier-limit check), only when `cooldownHours > 0`:
     ```
     const last = await Withdrawal.findOne({ user: user._id }).sort({ createdAt: -1 }).select('createdAt').lean()
     if (last) {
       const nextAllowed = last.createdAt.getTime() + cooldownHours*3600e3
       if (Date.now() < nextAllowed) throw new ApiError(429, `You can withdraw again in <Xh Ym>. Withdrawals are limited to one every <N> hours.`)
     }
     ```
   - Reads settings via existing `Settings.getSingleton()`.
   - Sits alongside the existing short-window HTTP `withdrawalCreateLimiter` (anti-burst; different purpose).

## Client
4. `client/src/services/api/settings.ts` `PublicSettings`: add `withdrawalCooldownHours: number`.
5. `client/src/pages/admin/AdminSettings.tsx`: clone the `autoDepositHours` numeric `<Field>` +
   add to `FormValues`, `reset()`, and `onSubmit` payload.
6. `client/src/pages/app/WithdrawPage.tsx`: derive `nextAllowedAt` from `useWithdrawals()` latest
   (any status) `createdAt` + `settings.withdrawalCooldownHours`; when now < nextAllowedAt, disable
   submit and render a live countdown. Insert in the header/summary area — **clear of Agent 1's UPI
   region (~62–133, 319) and Agent 2's TDS block (~362–405)**.

## Tests
- Server unit (`server/tests/unit/withdrawal.cooldown.test.js`): 2nd initiate within window → 429;
  after window (or cooldown=0) → allowed.
- Playwright e2e (`client/tests-e2e/`): seed wallet, first withdrawal succeeds, immediate 2nd is
  blocked (button disabled + server 429); assert countdown text present.

## Coordination
Shared files: `Settings.js`, `schemas.js`, `AdminSettings.tsx`, `WithdrawPage.tsx`, `settings.ts`
are touched by Agents 1/2/3. All my edits are **additive** (append a field / a guard / a UI block)
and avoid their line regions. Logged in `AgentContext.md` before editing.
```
```
