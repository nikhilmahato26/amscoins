# UI/UX Overhaul — Premium & Trustworthy Design

**Date:** 2026-08-27  
**Status:** Approved  
**Approach:** Parallel implementation across three surfaces simultaneously

---

## Problem

**Who:** Indian retail investors (users) + admin operators  
**Situation:** Users compare the logged-in app against competitors (Groww, Zerodha); admin uses the panel daily for payout operations  
**Pain:**
- Users: After a trustworthy white/blue landing page, they hit a dark purple app shell that reads as crypto/DeFi — not a stable investment platform. Trust breaks at login.
- Admin: Stat cards and tables use unstyled shadcn defaults — no visual hierarchy, key numbers don't stand out, the tool doesn't feel operationally serious.

**Evidence:** Direct feedback from both admin operator and end users  
**Outcome:** Users feel confident depositing money; admin operates efficiently without visual friction

---

## Risk Assessment

```
Value:       LOW  — Both audiences explicitly asked for this; no assumption to test
Usability:   LOW  — Migration stays within the existing asm-* token system; no new patterns invented
Feasibility: LOW  — All palette tokens already defined; dark shell migration is a well-scoped find-and-replace + restyling task
Viability:   LOW  — No new infrastructure; pure frontend styling work
Critical assumption: The asm-tint surface (#F4F7FE) feels sufficiently distinct from the white landing page to give the app its own identity without feeling like two different products
```

---

## Design Identity (shared across all surfaces)

### Palette — what stays, what gets retired

**Active tokens (all three surfaces use these):**

| Role             | Token          | Hex       |
|------------------|----------------|-----------|
| Page background  | `asm-tint`     | `#F4F7FE` |
| Card surface     | white          | `#FFFFFF` |
| Primary action   | `asm-blue`     | `#0B4FD8` |
| Primary text     | `asm-navy`     | `#102A5C` |
| Body text        | `asm-body`     | `#546582` |
| Muted text       | `asm-muted`    | `#55698E` |
| Dividers         | `asm-line`     | `#E5EAF3` |
| Profit accent    | `asm-green`    | `#15803D` |
| Danger           | `asm-red`      | `#C81E1E` |
| Tier: Silver     | `bluesteel`    | gradient  |
| Tier: Gold       | `gold-light`   | `#FFF5C2` |
| Tier: Diamond    | `asm-blue-tint`| `#EDF3FF` |

**Retired from all user-facing surfaces:**
- `brand` / `brand-deep` (purple `#8A33D7`) — removed from app pages
- `surface`, `surface-2`, `surface-nav` (dark blacks) — removed from app pages
- `paper` as foreground text — replaced with `asm-navy` / `asm-body`
- `GridBackdrop` component — deleted entirely
- `glass-panel` utility — replaced by white cards with `border-asm-line`

### Typography discipline

| Level       | Size (mobile) | Weight    | Color       | Usage                        |
|-------------|---------------|-----------|-------------|------------------------------|
| Page h1     | 22–28px       | 700       | `asm-navy`  | One per page                 |
| Section h2  | 18–20px       | 600       | `asm-navy`  | Section headers              |
| Body        | 14px          | 400       | `asm-body`  | Paragraphs, labels           |
| Muted label | 13px          | 400       | `asm-muted` | Secondary info, timestamps   |
| Data/numbers| 14px mono     | tabular   | `asm-navy`  | Amounts, IDs (`font-data`)   |
| Hero number | 32–40px       | 700       | `asm-navy`  | Portfolio value, stat counts |

### Elevation model

Two levels only:
- **Default card:** `bg-white border border-asm-line rounded-xl` — no shadow
- **Interactive card (hover):** adds `shadow-sm` on `hover:` — subtle lift
- No glass, no dark overlays, no blur on card surfaces

### Spacing

- Page padding: `p-4` mobile → `sm:p-6` → `lg:p-8`
- Card internal padding: `p-4` uniformly (no ad-hoc values)
- Section gaps: `gap-4` between cards, `gap-6` between sections

---

## Surface 1 — Landing Page

The palette is already correct. Changes are to content hierarchy, plan card design, and trust signals.

### Hero

- Headline: "Smart Investment, Secure Future" — 48–56px on mobile, bold, `asm-navy`. Key differentiator word in `asm-blue`.
- Subheadline: one punchy line, remove filler copy
- CTA pair: "Start Investing" (asm-blue filled, primary) + "See Plans" (outlined, secondary) — clear hierarchy
- Hero visual: replace decorative element with a clean rendered plan card or portfolio value display — show the product, not decoration
- Patriotic strip ("Our Country, Our Pride"): keep as a subtle full-width band with flag motif, positioned prominently — not buried

### Stats Bar

- Three stats: 25K+ investors, ₹50Cr+ investments, ₹12Cr+ payouts
- Animate with count-up on scroll-enter (framer-motion)
- Layout: horizontal band, large bold numbers, smaller label below, `asm-line` dividers between stats
- Disclaimer line: "Figures updated periodically" — per PRODUCT.md honesty constraint

### Plan Cards (Silver / Gold / Diamond)

Each card gets tier-specific color treatment:
- **Silver:** `bluesteel` border + steel-tinted icon container
- **Gold:** `gold-light` (#FFF5C2) border + amber icon container
- **Diamond:** `asm-blue` border + `asm-blue-tint` icon container

Card anatomy:
1. Tier medallion PNG (already in `/src/assets/plans/`)
2. Plan name (16px semibold, asm-navy)
3. Return % — large bold green (28px) — the most important number
4. Duration badge
5. Min / Max range
6. "Invest Now" CTA button

No bullet-list feature cards. These are financial instruments — numbers front and center.

### Trust Section

- **Regulatory badge:** "Registered in India" with ShieldCheck icon — dedicated visual block, not inline text
- **Payment marks:** Actual UPI, Paytm, PhonePe, Google Pay brand marks in a clean horizontal row
- **Human-approved payouts callout:** Feature block explaining the admin-review model — this is a genuine differentiator, give it real estate

### How It Works (3-step flow)

- Steps: Deposit → Pick Plan → Withdraw
- Large step numbers (48px, light weight, asm-blue), one-line description, icon
- Add 36-hour countdown visual hint — makes the time-box concrete

### Footer

- Payment marks row (actual logos, not text)
- Links: Plans, Support, About, Terms
- "Invest · Grow · Prosper" tagline
- Regulatory disclaimer line
- WhatsApp support link visible

---

## Surface 2 — User App Shell & Pages

The core migration: dark purple shell → premium light identity.

### AppShell

**Removals:**
- `GridBackdrop` component — delete the file and all usages
- All `glass-panel`, `bg-surface`, `bg-surface-2`, `bg-surface-nav` usages
- All `brand` (purple) color usages from app-facing components
- Dark `:root` shadcn tokens no longer applied to app shell wrapper

**AppShell wrapper:** `bg-asm-tint` page background

**AppHeader (mobile top bar):**
- `bg-white/95 backdrop-blur-md border-b border-asm-line`
- Logo left, notification bell right
- `text-asm-navy`

**BottomNav (mobile):**
- `bg-white border-t border-asm-line`
- Active icon + label: `asm-blue`
- Inactive: `asm-muted`
- Safe area inset preserved (`pb-safe`)

**SideNav (desktop):**
- `bg-white border-r border-asm-line`
- Same nav link styles as admin (`navLinkClass` pattern — already proven)
- Active: `bg-asm-blue-tint text-asm-blue`
- Inactive: `text-asm-body hover:bg-asm-tint hover:text-asm-navy`

**Mobile drawer:**
- White panel, spring animation preserved (motion is good, just recolored)
- `bg-asm-navy/30 backdrop-blur-[3px]` overlay stays

### HomePage

**Portfolio value card:**
- Full-width white card, `border border-asm-line rounded-xl p-4`
- Label: "Total Portfolio" — 12px, asm-muted
- Value: 36–40px bold, asm-navy — dominates the screen
- Profit badge: "+₹X.XX (X%)" — green pill

**Quick actions row:**
- "Invest", "Withdraw", "History" — icon + label pill cards, white background, asm-blue icon, asm-navy label

**Active investment card:**
- Plan name + tier badge, amount invested, countdown timer to maturity, expected return
- This information must be immediately visible — it's what users check most

**Plan gallery cards:**
- Tier color treatment (Silver/Gold/Diamond) — same system as landing page
- Return % prominent and green

### DashboardPage

- Transaction ledger: date, type (color-coded badge), amount (green credit / red debit), status
- Filter tabs: "All / Investments / Withdrawals / Rewards" — asm-blue underline active style

### PackageDetailPage

- Full-bleed tier color header band
- Plan terms as definition list: Return %, Duration, Min, Max — each row has label + value
- Legal disclaimer: bordered callout block, not hidden footnote
- "Invest Now" sticky bottom bar (same pattern as WithdrawPage)

### WithdrawPage / DepositConfirmationPage

- Recolor from dark to light — no structural changes
- Form inputs: `bg-white border border-asm-line`, focus ring `ring-asm-blue`

### ReferralPage

- Referral code: large monospace display, copyable white card, asm-blue copy button
- Tier progress: progress bar — asm-blue fill, asm-line track, label showing referrals to next tier

### AccountPage / SupportPage

- White cards, `border-b border-asm-line` row separators, chevron for navigable items
- Support: WhatsApp CTA prominent with green brand color

---

## Surface 3 — Admin Panel Content & Hierarchy

The admin shell (sidebar, header, theme) is already correct. Changes are to page content.

### AdminDashboard

**Stat cards — new anatomy:**
- Colored icon container: `bg-asm-blue-tint` with asm-blue icon (or green-tint for revenue metrics, amber-tint for pending)
- Metric value: 32px bold, asm-navy
- Label: 12px, asm-muted
- Delta badge: "+12 this week" — green or red pill

**Pending Actions strip** (new, high-value addition):
- Positioned below stat cards
- Shows: investments awaiting approval (count), withdrawals pending (count), open support tickets (count)
- Each count is a clickable chip that deep-links to the relevant filtered table
- Chip style: white card, amber left border, count in bold, label in asm-muted

**Recent activity timeline** (new):
- Last 10 actions: approved investment, rejected withdrawal, new user registration
- Each row: timestamp (asm-muted, 12px) | action type badge | user name | amount
- Makes the dashboard feel live and operational

### AdminInvestments / AdminWithdrawals

**Table:**
- Sticky header: `bg-white border-b border-asm-line`
- Column hierarchy: amount and status get more visual weight (bold values)
- Status badges (consistent across all admin tables):
  - `Pending` — amber background, amber text
  - `Approved` / `Active` — green background, green text
  - `Rejected` — red background, red text
  - `Matured` / `Completed` — asm-blue-tint background, asm-blue text
- Row actions: "Approve / Reject" inline (small outlined buttons) — no modal required for common case
- Bulk action bar: sticky bottom, asm-navy background, white action buttons (already built — restyled)
- Filter/search bar: white input with asm-line border, status filter as segmented control

### AdminUsers

**User row:**
- Avatar initial circle: `bg-asm-blue-tint text-asm-blue` (initials from name)
- Name + phone number
- Join date (asm-muted)
- Total invested amount (bold, asm-navy)
- Status + tier badge

**AdminUserDetail:**
- Sections: Profile, Investment History, Withdrawal History, Referrals
- Each section as a white card with `AdminPageHeader`-style h2

### AdminWithdrawals / AdminDeposits

- UPI ID: copyable monospace chip — one-click copy, critical for admin workflow
- Amount: large bold — most important field in a payout decision
- "Approved by" field: visible in history rows — accountability trail

### AdminSettings

Group into labeled sections:
- Plan Toggles (toggle switches per plan tier)
- Deposit Gate (on/off + config)
- Withdrawal Cooldown (duration input)
- Platform Config (misc settings)

Each setting: label (14px, asm-navy bold) + description (13px, asm-muted) + control (toggle or input)  
Destructive settings: red-tinted section header (`text-asm-red border-l-2 border-asm-red`)

### AdminPageHeader (universal component)

Standardize across all admin pages:
```
h1 (22–26px bold, asm-navy) + subtitle (13px, asm-muted) + optional primary action button (asm-blue, top-right)
```
All admin pages must use this component — currently inconsistent.

---

## Implementation Strategy

Parallel tracks — no shared state or sequential dependencies between them:

**Track A — Landing Page**
- Hero, stats bar, plan cards, trust section, how-it-works, footer
- Files: `LandingPage.tsx`, `LandingChrome.tsx`, related section components

**Track B — User App Shell & Pages**
- AppShell migration, all `pages/app/**` pages
- Delete: `GridBackdrop`; remove all dark token usages from app pages
- Files: `AppShell.tsx`, `AppHeader.tsx`, `BottomNav.tsx`, `SideNav.tsx`, all `pages/app/**`

**Track C — Admin Panel Content**
- Dashboard, tables, stat cards, settings, AdminPageHeader
- Files: `AdminDashboard.tsx`, `AdminInvestments.tsx`, `AdminWithdrawals.tsx`, `AdminUsers.tsx`, `AdminUserDetail.tsx`, `AdminSettings.tsx`, `AdminPageHeader.tsx`

Tracks A and B touch no shared components. Track C is entirely within `pages/admin/` and `components/admin/`. All three can be built in parallel.

---

## Success Signal

- A first-time user can go from landing → login → app without a visual identity break
- The app shell's color palette matches competitors in the "trustworthy Indian fintech" category (Groww, Zerodha aesthetic — light, clean, blue/green accents)
- Admin can identify the 3 most important pending actions within 5 seconds of opening the dashboard
- Zero purple (`#8A33D7`) or dark surface colors in any user-facing page after implementation

## Open Questions / Flags

1. The `GridBackdrop` component — confirm it is only used in `AppShell` before deleting the file
2. **Critical — token inheritance:** The dark shadcn tokens live in `:root` globally. The landing page and admin escape them via `theme-light-home` class on their root div. The AppShell wrapper div currently has no such class — shadcn primitives (Button, Input, Card) will render dark unless `theme-light-home` is added to the AppShell wrapper. This is the single most important implementation detail for Track B.
3. Some app pages may additionally use inline dark utility classes (`bg-surface`, `text-paper`, `bg-surface-nav`) that need a find-and-replace pass — grep for these before starting Track B.
4. Landing page hero visual: a rendered mockup of a plan card would be ideal but requires an asset — confirm whether to use existing medallion PNGs or create a new composite
5. Admin "Pending Actions" strip counts require API endpoints that may not exist yet — implement as static UI initially with `useAdminStats` data where available
