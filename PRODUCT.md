# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Indian retail investors — primarily on mobile phones (almost all traffic is mobile). Users register with a mobile number and complete verification once. Two roles exist: `user` (investor) and `admin` (payout operator). The primary user is a first-time or early-stage retail investor looking for a simple, transparent way to put idle savings to work for a short, defined period.

## Product Purpose

ASM Coins is a time-boxed investment platform for India. Users deposit money, choose a plan, watch it run for a 36-hour term, and withdraw to their UPI account when the term closes. The admin role reviews and triggers each payout — returns are not automated. The product makes the full cycle (deposit → plan selection → tracking → withdrawal) straightforward on a phone, with support available on WhatsApp and email every day.

## Positioning

Defined plan terms with a stated duration and rate, paired with UPI-native withdrawal and daily human support — positioned against platforms that are opaque about when and how money is returned. India-only.

## Operating Context

- **Device:** Mobile-first (375 px base); responsive to tablet and desktop.
- **Payments:** UPI, Paytm, PhonePe, Google Pay.
- **Support:** WhatsApp + email, every day.
- **Regulatory:** ASM Coins is registered in India and commits to regulatory compliance; this claim appears in the auth flow.
- **Status:** Pre-launch. Landing page figures (25K+ investors, ₹50 Cr+ investments, ₹12 Cr+ payouts) and market snapshot prices are placeholder values from the Figma mockup — not yet real data.

## Capabilities and Constraints

**Investment plans (Figma mockup terms — need commercial sign-off before launch):**
| Plan    | Return | Duration | Min     | Max        |
|---------|--------|----------|---------|------------|
| Silver  | 25%    | 36 hours | ₹1,000  | ₹50,000    |
| Gold    | 30%    | 36 hours | ₹3,000  | ₹5,000     |
| Diamond | 40%    | 36 hours | ₹5,000  | ₹5,00,000  |

**Features confirmed in codebase:**
- Auth: mobile number registration + login, plan pre-selection carried through registration
- Dashboard: portfolio overview
- Plans gallery: browsable plan cards
- Package detail and plan benefits pages
- Investment summary
- UPI withdrawal flow
- Referral program ("Invite & Earn") — exact reward structure undecided
- Market snapshot (indicative rates, not a live feed — labeled as such)
- Silver tier loyalty tracking
- Payment method management
- Admin shell (placeholder; human-approved payout operations)
- 404 / not-found handling

**Constraints:**
- Returns are plan terms, not guarantees; a legal disclaimer appears on every plan-facing surface.
- Market data is never represented as live until a real feed is wired up.
- Pre-launch stats must not be presented as factual until verified by the business.

## Brand Commitments

- **Name:** ASM Coins (legal entity name undecided; short form used everywhere).
- **Tagline:** Invest · Grow · Prosper
- **Hero line:** Smart Investment, Secure Future
- **India framing:** "Our Country, Our Pride, Our Strength" — patriotic positioning anchored to the flag and map motif.
- **Voice:** Direct, plain, accessible; no financial jargon. Trust is earned through clarity, not vocabulary.
- **Payment marks:** UPI, Paytm, PhonePe, Google Pay — appear in footer as accepted methods.
- **Logo:** Triangular "A" mark with a green upward-arrow / chart motif. SVG favicon at `/favicon.svg`.
- **Binding visual constraint:** The light home theme (`theme-light-home`) — white background, navy primary text, `asm-blue` (#0B4FD8) primary action color, green profit accent — is the authoritative visual direction for the whole product. This covers the landing page, auth surfaces, and the app shell (the current dark app shell is to be redesigned to this theme). The dark shell is not a second intentional mode; it is pending migration.

## Evidence on Hand

- Figma mockup: source of truth for landing page layout, app screens (mobile 375 px frames), and investment plan cards.
- Landing page implemented at `src/pages/landing/LandingPage.tsx`; app shell at `src/components/app/AppShell.tsx`.
- Auth layout at `src/pages/auth/AuthLayout.tsx`.
- Mock data in `src/mocks/` (coins, ledger, users) — no backend connection wired.
- No real testimonials, case studies, or press coverage in the repository. Future work must not fabricate them.

## Product Principles

1. **Terms before transactions.** Every plan states its rate, duration, minimum, and maximum before the user commits. No surprises.
2. **Mobile is the product.** Design decisions start at 375 px; desktop is an extension, not the target.
3. **UPI is the exit.** Withdrawal to UPI is a core promise — the fastest credible path to money back in the user's hands.
4. **Human accountability.** Admin-approved payouts mean a person is responsible for each settlement. Lean into that trust signal rather than hiding it.
5. **Honesty in data.** Indicative market rates are labeled as such. Placeholder stats are never shipped as real figures.

## Accessibility & Inclusion

- `aria-live`, `role="status"`, and `sr-only` loading announcements are in place for route transitions.
- `prefers-reduced-motion` is respected inside `.theme-light-home` via a `@media` block.
- `viewport-fit=cover` with `env(safe-area-inset-bottom)` for notched / dynamic-island phones.
- No formal WCAG level declared; aim for AA on interactive elements.
- Future: consider Hindi-language support given the India-only audience.
