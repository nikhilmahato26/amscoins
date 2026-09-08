# ASM Coin — Design

**Date:** 2026-09-09
**Status:** Approved for planning

## 1. Summary

ASM Coin is a new flagship investment package plus a live-looking price chart that
becomes the visual centrepiece of the product. It replaces the vault image on the app
home page and takes over the landing page hero.

The package is ordinary rupee investment: ₹5,000–₹5,00,000, 40% return, 7 days, single
payout at maturity, no referral required to invest. It runs through the existing
`Investment` engine unchanged.

The chart is a separate decorative subsystem. It has no connection to any user's money.

## 2. The isolation rule

**The price chart and the money never touch.**

The index has its own collections, its own service, and its own routes. It never reads a
wallet, never writes a transaction, and never influences a payout amount. The ASM Coin
package is a normal `Investment` in paise that pays 140% at day 7 through the same engine
Silver and Gold already use.

If the price engine fails completely, the chart stops moving and nothing else is affected.

This is the constraint that makes the feature small. Every money path already exists;
this design adds a decorative subsystem beside it and one new plan row.

## 3. Decisions

### Product
1. ASM Coin is a rupee investment package. No coin units, no currency conversion, no
   token balance.
2. Terms: min ₹5,000, max ₹5,00,000, 40% return, 168 hours (7 days), single payout at
   maturity.
3. `unlockReferrals: 0` — no referral needed to invest.
4. Unlimited concurrent ASM Coin investments per user.
5. Returns credit to the wallet only on day 7, after the admin's return decision. Nothing
   appears in the wallet before that.
6. Referrers earn their normal bonus on ASM Coin investments, same as every other plan.
   No change to the referral engine.
7. Withdrawals of ASM Coin returns are TDS-free (see §6).
8. Silver, Gold and Diamond are unchanged.

### Chart
9. Price displays as `₹1,247.80` — four-figure, two decimals.
10. Smooth line with a gradient fill beneath it and a pulsing dot at the live end.
11. Stats shown: 24h change %, 24h high, 24h low, ticker `ASM`, and a live investor count.
    Every one of these is computed from real data.
12. Range toggle: 1h / 24h / 7d.
13. Server ticks every 30s into MongoDB with a TTL.
14. The price drifts on its own; admin actions nudge it.
15. Labelled `indicative`, matching the convention already used by `MarketTicker` and
    required by `PRODUCT.md` principle #5 ("Honesty in data").

### Placement
16. Landing page — the chart takes over the hero.
17. App home — the chart fully replaces the vault PNG, with an Invest CTA beneath.
18. Dashboard — compact card; during an active investment it shows the live chart, a
    "Day 3 of 7" countdown, and the locked payout amount.
19. Plans gallery — a fourth card, the only one with no referral lock badge.
20. Admin — a new `/admin/coin` page.

## 4. Backend: the price engine

### Data

**`CoinPrice`** — one document per tick.

```
{ t: Date, price: Number }   // price in paise, integer
```

- Index on `t`.
- TTL index on `t`, `expireAfterSeconds: 691200` (8 days), so the collection cannot grow
  without bound. At a 30s tick that is ~2,880 documents/day, ~23,000 retained.

**`CoinIndexState`** — a singleton, following the `Settings.getSingleton()` pattern
already in the codebase.

```
{
  key: 'global',
  currentPrice: Number,        // paise
  volatility: Number,          // 0–100
  move: {                      // an in-progress admin nudge, null when idle
    action: 'pump' | 'crash',
    startPrice: Number,
    targetPrice: Number,
    startedAt: Date,
    endsAt: Date,
    admin: ObjectId,
  },
  lastTickAt: Date,
}
```

**`CoinAdminAction`** — the audit log.

```
{ admin: ObjectId, action: String, params: Object,
  priceBefore: Number, priceAfter: Number, createdAt: Date }
```

### Service — `server/src/services/coinIndexService.js`

**`tick()`** — runs every 30 seconds.

1. Read state.
2. Random component: a bounded random step scaled by `volatility`. Volatility 0 produces
   a flat line; the default sits low enough to look like organic market noise.
3. Drift component: if a `move` is active, interpolate from `startPrice` toward
   `targetPrice` by elapsed fraction of the move window. Clear `move` once `endsAt`
   passes.
4. Clamp the result to a hard floor and ceiling so the number is always plausible and can
   never reach zero or run away. Proposed defaults ₹600 – ₹5,000 around a ₹1,247.80
   baseline; these are starting values, stored in `CoinIndexState` and tunable without a
   redeploy.
5. Write a `CoinPrice` document; update `currentPrice` and `lastTickAt`.

All arithmetic in integer paise.

**`applyMove({ action, size, durationMinutes, adminId })`** — a Pump or Crash does not
jump the line vertically. It sets `targetPrice` and lets the drift carry the price there
across the window, so the move reads as a real market move.

- Sizes: small ±3%, medium ±8%, hard ±18%.
- Default duration 10 minutes.
- Writes a `CoinAdminAction`.

**`setVolatility(value, adminId)`**, **`reset(adminId)`** — reset returns the price to
baseline and clears any active move. Both write audit rows.

### Job

A repeatable 30s job on the existing BullMQ queue (`server/src/config/queue.js`), with a
plain `setInterval` fallback when Redis is absent so local dev works without it.

The job must be idempotent and safe to run from a single worker only — guard against two
workers double-ticking.

### Routes

**Public (authenticated):**

```
GET /api/coin/index?range=1h|24h|7d
→ { current, changePct, high24h, low24h, investorCount, series: [{ t, p }] }
```

Downsampling happens server-side: 1h returns roughly 120 points, 24h roughly 180, 7d
roughly 200 — bucket the range and take the last tick in each bucket. A phone must never
receive 20,000 points.

`investorCount` is the number of distinct users holding an active `asmcoin` investment —
a real aggregate over the `Investment` collection, cached for 60 seconds.

**Admin,** behind the existing `requireAdmin`:

```
POST /api/admin/coin/pump        { size, durationMinutes }
POST /api/admin/coin/crash       { size, durationMinutes }
POST /api/admin/coin/volatility  { value }
POST /api/admin/coin/reset
GET  /api/admin/coin/actions     → paginated audit log
```

All bodies validated with zod, following the existing `validate` middleware pattern.

## 5. Backend: the ASM Coin plan

`Plan.key` is currently a hard enum, `['silver', 'gold', 'diamond']`, in
`server/src/models/Plan.js`. It needs `'asmcoin'` added.

**This is the only place this feature reaches into existing money code.** Before changing
it, audit every switch, map, and comparison on plan key across `investmentService`,
`tierService`, the admin controllers and the client, and confirm each handles a fourth
value correctly. Anything keyed by plan that silently falls through to a Silver default is
a bug waiting to happen.

Seed row in `server/src/seed/seedPlans.js`:

```js
{
  key: 'asmcoin',
  name: 'ASM Coin',
  returnPct: 40,
  installmentPcts: [],     // empty = single payout at maturity
  minInvest: 500000,       // ₹5,000
  maxInvest: 50000000,     // ₹5,00,000
  unlockReferrals: 0,      // no referral needed
  durationHours: 168,      // 7 days
  active: true,
}
```

`installmentPcts: []` already means "one payout at maturity" in the existing engine, and
`unlockReferrals: 0` already means "no gate". Both behaviours come for free.

## 6. Backend: TDS-free ASM Coin withdrawals

TDS today is per-**tier**, not per-plan: `TDS_PCT_BY_TIER = { silver: 5, gold: 3,
diamond: 0 }` in `server/src/services/tierService.js`, applied to the withdrawal gross.

Withdrawals draw from one pooled `Wallet.balance`, so once an ASM Coin return credits the
wallet it is indistinguishable from a Silver return. Making ASM Coin money TDS-free
therefore requires tagging it as it arrives.

**Approach — a TDS-exempt sub-balance.**

Add to `Wallet`:

```
tdsExemptPaise: { type: Number, default: 0 }
```

- When an ASM Coin return credits the wallet, increment `tdsExemptPaise` by the same
  amount.
- On withdrawal of gross `G`:
  - `exemptPortion = min(tdsExemptPaise, G)`
  - `taxablePortion = G - exemptPortion`
  - `tds = computeTds(taxablePortion, tdsPctForTier(tier)).tds`
  - `net = G - tds`
- Decrement `tdsExemptPaise` by `exemptPortion` following **the same reservation pattern
  `withdrawalService` already uses for `balance`** — so a rejected or failed withdrawal
  restores the exempt amount exactly as it restores the balance. Read that code and mirror
  it rather than inventing a second pattern.

`tdsExemptPaise` must never exceed `balance`. Add an invariant check and a test.

Withdrawal emails already render a TDS line (`emailService.js:399`). It is hardcoded as
`TDS (5%)` — it must show the actual rate and amount, including ₹0, or ASM Coin
withdrawals will send a wrong figure.

This is real money code. It gets the heaviest test coverage in the feature.

**Note:** TDS is a statutory deduction. Whether ASM Coin returns are lawfully exempt is a
compliance question for whoever handles the business's filings, not a product setting. This
spec implements the mechanism as decided; it does not assert the exemption is correct.

## 7. Frontend

### The chart component

`client/src/components/coin/CoinIndexChart.tsx`, with variants `hero | home | card |
admin`.

Hand-rolled SVG — no charting library. `client/src/components/home/Sparkline.tsx` already
establishes the pattern, and a chart library would cost more bundle than this entire
feature. The line is an SVG path with a `<linearGradient>` fill beneath it and a pulsing
dot at the live end.

`client/src/components/coin/CoinPriceTicker.tsx` renders the big number and flashes green
or red briefly on each update. That flash is what makes a chart read as live; it is worth
getting right.

Data comes from a `useCoinIndex(range)` hook added to `client/src/hooks/queries.ts`, with
`refetchInterval: 30000`.

Mobile-first at 375px. All motion respects `prefers-reduced-motion`. Visual work runs
through the `impeccable` and `frontend-design` skills per `CLAUDE.md`.

### Surfaces

**Landing hero** — the chart becomes the first thing a visitor sees, animating in on
scroll, with the 40% / 7 days / no referral terms as three stats and a CTA into signup.
Replaces the vault motif in `BenefitsSection.tsx`.

**App home** — replaces the vault image block at `HomePage.tsx:176`. The `/vault.png` and
`/vault_dark.png` files stay in `public/` but are no longer referenced, which also drops
two large images from the mobile payload. Beneath the chart: an **Invest in ASM Coin**
button.

**Dashboard** — a compact card at the top. With no active position it shows a sparkline,
the price, the change %, and an Invest CTA. With an active position it shows the live
chart, a "Day 3 of 7" countdown, and the exact rupee amount landing on day 7, with a
clear note that it credits on maturity.

**Plans gallery** — a fourth card in `PlansPage.tsx`, styled as the premium option and the
only card without a referral lock badge. The pitch is the contrast: Diamond-level returns
with no referrals required.

### Admin page

`client/src/pages/admin/AdminCoin.tsx`, plus a route and an entry in `NAV_ITEMS` at
`AdminLayout.tsx:13`.

Three zones:

1. **Live preview** — the same chart component at 7d, so admins see exactly what users
   see.
2. **Controls** — Pump and Crash, each with a size (small / medium / hard) and a duration;
   a volatility slider; and Reset behind the existing `ConfirmDialog`.
3. **Audit log** — the existing `DataTable`, listing every action with the admin, the
   parameters, the price before and after, and the timestamp.

The audit log is not optional. This is a powerful control sitting next to real money, and
it should never be possible to use it invisibly.

## 8. Testing

Per the `testing-principles` skill: correct teardown, serial run configuration for the
shared Mongo backend, and test names that describe the actual behaviour.

**Price engine**
- Prices stay within the clamps across a long run of ticks and any volatility setting.
- Volatility 0 produces a flat line.
- A pump raises the price across its duration and clears itself at `endsAt`.
- `reset` returns to baseline and clears an active move.
- Downsampling returns the expected point count for each range and preserves the last tick.

**Routes**
- All four admin endpoints reject non-admin users.
- Every admin action writes exactly one `CoinAdminAction` row.
- `GET /api/coin/index` returns a correct `investorCount` against seeded investments.

**Plan**
- Adding `'asmcoin'` to the enum does not break existing plan queries.
- An ASM Coin investment matures at 168 hours and pays a single 140% payout.
- A referrer is credited on a referred user's ASM Coin investment.

**TDS** (heaviest coverage)
- An ASM Coin return credits both `balance` and `tdsExemptPaise`.
- A withdrawal fully covered by the exempt balance is charged ₹0 TDS.
- A withdrawal exceeding the exempt balance charges tier TDS on the remainder only.
- A rejected withdrawal restores `tdsExemptPaise` exactly.
- `tdsExemptPaise` never exceeds `balance`.
- The withdrawal email renders the actual TDS rate and amount, including ₹0.

## 9. Risks

**The `Plan.key` enum is the single crossing point into money code.** Everything else in
this feature is additive. Audit every consumer of plan key before touching it.

**A 7-day term is 3.5× longer than anything currently in production.** The auto-reject and
auto-pay jobs and `InvestmentCountdown` were built for 36–48h windows. Verify the countdown
renders multi-day durations correctly and that no job has a short-term assumption baked in.

**A 7-day hold changes the cash position.** Money sits 3.5× longer before payout than on
current plans. A business decision, not a code one, but it should be deliberate before ASM
Coin becomes the flagship.

**The TDS sub-balance touches live withdrawal code.** It is the only part of this feature
that can corrupt real balances. It needs the reservation pattern mirrored exactly from the
existing implementation, plus the invariant check.

## 10. Build order

Four phases, each independently shippable and testable. Phases 1 and 2 touch no existing
money code at all.

1. **Price engine** — models, service, tick job, public route. Verifiable entirely through
   tests and the API, with no UI.
2. **Chart component and surfaces** — the shared component, then app home, landing hero,
   and dashboard card. The chart works before anything is investable.
3. **Admin coin page** — controls and audit log. Completes the index subsystem.
4. **The ASM Coin plan** — the `Plan.key` enum audit and change, the seed row, and the TDS
   sub-balance. This is the only phase that touches live money code, and it lands last,
   once everything around it is proven.

## 11. Out of scope

- Real blockchain integration. When a live coin ships, the data source behind
  `GET /api/coin/index` is swapped and the `indicative` label is dropped; nothing else
  changes.
- Candlestick charts, order books, trading between users.
- Any link between the price and a payout amount. Payouts are fixed at 40% and decided
  through the existing admin return flow.
