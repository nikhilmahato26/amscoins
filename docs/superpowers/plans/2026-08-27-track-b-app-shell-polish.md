# Track B — User App Shell & Pages Polish

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate the remaining dark holdovers in the user-facing app and upgrade visual hierarchy so the experience feels premium and consistent with the landing page.

**Architecture:** The AppShell wrapper already applies `theme-light-home bg-asm-tint`. Navigation components (AppHeader, BottomNav, SideNav) are already light-themed. The remaining issues are: `GalleryPage` uses dark section headers (`bg-surface-nav/80`), and the home page hero and active investment cards lack visual hierarchy. This plan fixes those specific gaps.

**Tech Stack:** React 19, Framer Motion, Tailwind 3, `asm-*` palette tokens, Lucide icons

## Global Constraints

- Mobile-first: 375px base
- Never use `bg-surface`, `bg-surface-2`, `bg-surface-nav`, `text-paper`, or `brand-*` classes anywhere in app pages
- All card surfaces: `bg-white border border-asm-line rounded-xl` or `rounded-2xl`
- Page backgrounds: `bg-asm-tint` (set by AppShell — don't set it again on page roots)
- `import type` for type-only imports; no unused vars (TypeScript strict)
- Run `npm run build` inside `client/` to confirm no type errors after each task

---

### Task 1: GalleryPage — migrate StickyHeader and GoldHeader from dark to light

**Files:**
- Modify: `client/src/components/sections/StickyHeader.tsx`
- Modify: `client/src/components/sections/GoldHeader.tsx`

**What's changing:** Both components use `bg-surface-nav/80` (nearly black `#0A0A0A`). Replace with the light asm palette.

**Interfaces:**
- Produces: `StickyHeader` and `GoldHeader` with light-themed backgrounds

- [ ] **Step 1: Read StickyHeader.tsx**

  Open `client/src/components/sections/StickyHeader.tsx`. Find the line containing `bg-surface-nav/80`.

- [ ] **Step 2: Replace the dark background in StickyHeader**

  Change `bg-surface-nav/80` (and any associated dark text classes like `text-paper`, `text-white`) to:
  ```
  bg-white/95 backdrop-blur-md border-b border-asm-line
  ```
  Replace any `text-paper` or `text-white` heading text with `text-asm-navy`.
  Replace any `text-mist` or light-on-dark body text with `text-asm-body`.

- [ ] **Step 3: Read GoldHeader.tsx**

  Open `client/src/components/sections/GoldHeader.tsx`. Find the line containing `bg-surface-nav/80`.

- [ ] **Step 4: Replace the dark background in GoldHeader**

  Apply the same substitution as StickyHeader:
  - `bg-surface-nav/80` → `bg-white/95 backdrop-blur-md border-b border-asm-line`
  - `text-paper` / `text-white` heading text → `text-asm-navy`
  - Any gold/amber accent that was readable on dark may need darkening on light — use `text-amber-700` instead of `text-amber-400`

- [ ] **Step 5: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors. Confirm no remaining `bg-surface-nav` in either file:
  ```bash
  grep -n 'surface-nav\|text-paper\|text-white' client/src/components/sections/StickyHeader.tsx client/src/components/sections/GoldHeader.tsx
  ```
  Expected: no output.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/components/sections/StickyHeader.tsx client/src/components/sections/GoldHeader.tsx
  git commit -m "feat(app): migrate GalleryPage section headers from dark to light theme"
  ```

---

### Task 2: HomePage — hero visual hierarchy and active investment card

**Files:**
- Modify: `client/src/pages/app/HomePage.tsx`

**What's changing:** The hero section shows a greeting and portfolio grid but lacks a dominant "portfolio value" number. Active investment cards exist but the countdown to maturity is not visible. We add a prominent portfolio value display and a visible maturity countdown on active investment cards.

**Interfaces:**
- Consumes: `dash.balance`, `dash.totals.invested`, `dash.activeInvestments` from `useDashboard()`
- Consumes: `walletQuery.data?.balance` from `useWallet()`
- Produces: `PortfolioHero` card with dominant balance display; `ActiveInvestmentCard` with countdown

- [ ] **Step 1: Add a PortfolioHero card**

  In `HomePage.tsx`, find the portfolio snapshot section (the `grid grid-cols-3` with Balance, Active, and other stat cards). ABOVE this grid, add a dominant portfolio value card:
  ```tsx
  {/* Portfolio hero — the number users came to see */}
  <div className="mb-3 rounded-2xl border border-asm-line bg-white px-5 py-5 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]">
    <span className="text-[12px] font-bold uppercase tracking-[0.1em] text-asm-muted">Total Portfolio Value</span>
    <div className="mt-1.5 flex items-end gap-3">
      <span className="font-jakarta text-[38px] font-extrabold leading-none tabular-nums text-asm-navy">
        {displayBalance !== null ? inr(displayBalance) : '—'}
      </span>
      {totalInvested !== null && totalInvested > 0 && (
        <span className="mb-1 rounded-full bg-asm-green-tint px-2.5 py-0.5 text-[12px] font-bold text-asm-greenInk">
          ₹{inr(totalInvested)} active
        </span>
      )}
    </div>
  </div>
  ```
  Place this BEFORE the `grid grid-cols-3` stats row.

- [ ] **Step 2: Add maturity countdown to active investment cards**

  Find the active investment rendering loop (the `activeInvests.map(...)` section). Each active investment card should show time remaining. Add a `TimeRemaining` helper:

  ```tsx
  function TimeRemaining({ maturesAt }: { maturesAt: string }) {
    const [label, setLabel] = useState('')
    useEffect(() => {
      function tick() {
        const diff = new Date(maturesAt).getTime() - Date.now()
        if (diff <= 0) { setLabel('Matured'); return }
        const h = Math.floor(diff / 3_600_000)
        const m = Math.floor((diff % 3_600_000) / 60_000)
        setLabel(`${h}h ${m}m remaining`)
      }
      tick()
      const id = setInterval(tick, 60_000)
      return () => clearInterval(id)
    }, [maturesAt])
    return <span className="text-[11px] font-semibold text-asm-blue">{label}</span>
  }
  ```

  Add `useState` to React imports if not already present.

  Then in the active investment card JSX, add below the amount display:
  ```tsx
  {inv.maturesAt && <TimeRemaining maturesAt={inv.maturesAt} />}
  ```
  (`inv` is the iteration variable — adjust the field name to match the actual API response field for maturity time.)

- [ ] **Step 3: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors. `useState` imported if used.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/app/HomePage.tsx
  git commit -m "feat(app/home): portfolio hero card with dominant balance, active investment countdown"
  ```

---

### Task 3: App-wide dark class audit and cleanup

**Files:**
- Modify: any app page that still contains dark token classes (identified by grep below)

**What's changing:** A systematic pass to remove any remaining `bg-surface*`, `text-paper`, `bg-brand*`, or `glass-panel` from all user app pages.

- [ ] **Step 1: Run the dark class audit**

  ```bash
  grep -rn 'bg-surface\|text-paper\|bg-surface-nav\|bg-brand\|text-brand\|glass-panel\|bg-ink-2\|bg-ink ' \
    client/src/pages/app/ client/src/components/app/ \
    --include='*.tsx' --include='*.ts'
  ```

  If output is empty: all clear — skip to Step 4.
  If there are matches: proceed to Step 2.

- [ ] **Step 2: Fix each match**

  For each file and line reported:
  - `bg-surface` / `bg-surface-2` → `bg-white`
  - `bg-surface-nav` → `bg-asm-tint`
  - `text-paper` → `text-asm-navy` (headings) or `text-asm-body` (body)
  - `bg-brand` / `text-brand` → `bg-asm-blue` / `text-asm-blue`
  - `glass-panel` → `bg-white border border-asm-line`

- [ ] **Step 3: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Confirm zero matches remain:
  ```bash
  grep -rn 'bg-surface\|text-paper\|bg-surface-nav\|bg-brand\|glass-panel' \
    client/src/pages/app/ client/src/components/app/ \
    --include='*.tsx'
  ```
  Expected: no output.

- [ ] **Step 4: Commit**

  ```bash
  git add -p  # stage only the changed app page files
  git commit -m "fix(app): remove all remaining dark surface/brand token usages from app pages"
  ```

---

### Task 4: PackageDetailPage and PlanBenefitsPage — tier-coloured hero bands

**Files:**
- Modify: `client/src/pages/app/PackageDetailPage.tsx`
- Modify: `client/src/pages/app/PlanBenefitsPage.tsx`

**What's changing:** Package detail pages likely have a header area. Add a tier-coloured hero band (matching the tier accent system from the landing page) so the Silver/Gold/Diamond identity is consistent.

**Interfaces:**
- Consumes: `tier` param from URL (`useSearchParams` or `useParams`) — check which is used in existing code
- Produces: tier-coloured `<header>` band at top of page

- [ ] **Step 1: Read PackageDetailPage.tsx**

  Open `client/src/pages/app/PackageDetailPage.tsx`. Find:
  1. How the tier/plan is determined (URL param? prop?)
  2. Where the page header / top section is rendered

- [ ] **Step 2: Define tier accent colours for the app**

  Near the top of `PackageDetailPage.tsx`, add:
  ```tsx
  const TIER_BAND = {
    silver:  { bg: 'bg-gradient-to-br from-[#CED5E1] to-[#9CA8B8]', text: 'text-asm-navy' },
    gold:    { bg: 'bg-gradient-to-br from-[#F4C506] to-[#E8A000]', text: 'text-white'    },
    diamond: { bg: 'bg-gradient-to-br from-asm-blue to-[#1E93FE]',   text: 'text-white'    },
  } as const
  ```

- [ ] **Step 3: Add the tier hero band**

  At the top of the page content (before plan details), add:
  ```tsx
  {tier && TIER_BAND[tier as keyof typeof TIER_BAND] && (
    <div className={cn('px-5 py-8 text-center', TIER_BAND[tier as keyof typeof TIER_BAND].bg)}>
      <span className={cn('font-jakarta text-[13px] font-bold uppercase tracking-[0.12em] opacity-80',
        TIER_BAND[tier as keyof typeof TIER_BAND].text)}>
        {tier.charAt(0).toUpperCase() + tier.slice(1)} Plan
      </span>
      <div className={cn('mt-1 font-jakarta text-[48px] font-extrabold leading-none',
        TIER_BAND[tier as keyof typeof TIER_BAND].text)}>
        {RETURN_BY_TIER[tier as keyof typeof RETURN_BY_TIER]}
      </div>
      <div className={cn('mt-1 text-[14px] font-semibold opacity-80',
        TIER_BAND[tier as keyof typeof TIER_BAND].text)}>
        return in 36 hours
      </div>
    </div>
  )}
  ```
  Where `RETURN_BY_TIER` is:
  ```tsx
  const RETURN_BY_TIER = { silver: '25%', gold: '30%', diamond: '40%' } as const
  ```
  Adjust `tier` variable name to match the page's existing code.

- [ ] **Step 4: Apply same treatment to PlanBenefitsPage**

  Repeat Steps 2–3 in `client/src/pages/app/PlanBenefitsPage.tsx` using the same `TIER_BAND` and `RETURN_BY_TIER` constants.

- [ ] **Step 5: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/pages/app/PackageDetailPage.tsx client/src/pages/app/PlanBenefitsPage.tsx
  git commit -m "feat(app): tier-coloured hero bands on package detail and plan benefits pages"
  ```

---

### Task 5: ReferralPage — referral code card + tier progress bar

**Files:**
- Modify: `client/src/pages/app/ReferralPage.tsx`

**What's changing:** The referral code should be displayed in a prominent copyable card. The progress to next tier should have a visual progress bar.

- [ ] **Step 1: Read ReferralPage.tsx**

  Open `client/src/pages/app/ReferralPage.tsx`. Find:
  1. Where the referral code is displayed
  2. Where tier progress is shown (if at all)
  3. What data comes from the API (`useReferral()` or similar hook)

- [ ] **Step 2: Style the referral code card**

  Find the referral code display. Replace or wrap it with:
  ```tsx
  <div className="rounded-2xl border border-asm-blue/20 bg-asm-blue-tint p-5">
    <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-asm-blue">Your referral code</span>
    <div className="mt-2 flex items-center justify-between gap-3">
      <span className="font-mono text-[24px] font-extrabold tracking-[0.08em] text-asm-navy">
        {referralCode}
      </span>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(referralCode)}
        className="flex items-center gap-1.5 rounded-lg bg-asm-blue px-3 py-2 text-[13px] font-bold text-white transition-colors hover:bg-asm-blue-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1"
        aria-label="Copy referral code"
      >
        <Copy className="size-4" strokeWidth={2} aria-hidden /> Copy
      </button>
    </div>
  </div>
  ```
  Import `Copy` from lucide-react.

- [ ] **Step 3: Add tier progress bar**

  Below the referral code card, add a progress bar showing referrals toward the next tier unlock. Adapt `referralCount` and `nextTierThreshold` to the actual data field names from the hook:
  ```tsx
  {nextTierThreshold > 0 && (
    <div className="mt-4 rounded-xl border border-asm-line bg-white p-4">
      <div className="flex items-center justify-between text-[12px] font-semibold">
        <span className="text-asm-body">{referralCount} referrals</span>
        <span className="text-asm-muted">{nextTierThreshold} to unlock next tier</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-asm-tint">
        <div
          className="h-full rounded-full bg-asm-blue transition-all duration-700"
          style={{ width: `${Math.min(100, (referralCount / nextTierThreshold) * 100)}%` }}
        />
      </div>
    </div>
  )}
  ```

- [ ] **Step 4: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors. `Copy` imported.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/app/ReferralPage.tsx
  git commit -m "feat(app/referral): prominent copyable code card, tier progress bar"
  ```
