# Track A — Landing Page Premium Redesign

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate the landing page from a functional-but-generic page to a premium, trustworthy fintech product page that converts Indian retail investors.

**Architecture:** All changes are within `client/src/pages/landing/LandingPage.tsx` and `client/src/components/landing/LandingChrome.tsx`. The `asm-*` palette and `theme-light-home` class are already applied — this plan upgrades visual hierarchy, animation, and content layout within the existing structure.

**Tech Stack:** React 19, Framer Motion (already imported), Tailwind 3, Lucide icons, existing `asm-*` palette tokens

## Global Constraints

- Mobile-first: design at 375px base, scale up
- Never fabricate testimonials, stats, or press coverage — use existing placeholder values only
- Add "Figures updated periodically" disclaimer under stats per PRODUCT.md
- Legal disclaimer must remain on every plan-facing surface
- All amounts in ₹ INR format; use `inr()` from `@/lib/format`
- Import type-only with `import type`; no unused imports (TypeScript strict)
- Run `npm run build` inside `client/` after each task to confirm no type errors

---

### Task 1: Hero — Typography scale + CTA hierarchy

**Files:**
- Modify: `client/src/pages/landing/LandingPage.tsx` — hero section

**What's changing:** The hero headline is undersized and the CTA pair has weak hierarchy. We're making the headline dominant and the primary CTA unmistakable.

**Interfaces:**
- Produces: Hero section with 48px+ headline on mobile, primary + secondary CTA pair

- [ ] **Step 1: Locate the hero section**

  In `LandingPage.tsx`, find the section containing the main headline ("Smart Investment, Secure Future") and the CTA buttons. It will be the first major `<section>` after the `LandingHeader`.

- [ ] **Step 2: Upgrade headline typography**

  Find the `h1` (or largest heading) in the hero. Replace its className to:
  ```tsx
  <h1 className="font-jakarta text-[42px] font-extrabold leading-[1.1] tracking-tight text-asm-navy sm:text-[52px] lg:text-[60px]">
    Smart Investment,{' '}
    <span className="text-asm-blue">Secure Future</span>
  </h1>
  ```
  The colour split puts the promise word in brand blue — makes the headline memorable.

- [ ] **Step 3: Tighten the subheadline**

  Find the paragraph below the h1. Replace it with a single crisp line:
  ```tsx
  <p className="mt-3 max-w-[34ch] text-[16px] leading-snug text-asm-body sm:text-[18px]">
    25–40% returns in 36 hours. UPI payout. Human-approved.
  </p>
  ```

- [ ] **Step 4: Fix CTA hierarchy**

  Find the existing CTA button(s). Replace with a primary + secondary pair:
  ```tsx
  <div className="mt-6 flex flex-wrap items-center gap-3">
    <Link
      to="/register"
      className="inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-asm-blue px-6 text-[15px] font-bold text-white shadow-[0_4px_16px_-4px_rgba(11,79,216,0.5)] transition-all hover:bg-asm-blue-dark hover:shadow-[0_6px_20px_-4px_rgba(11,79,216,0.55)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2"
    >
      Start Investing <ArrowRight className="size-4" strokeWidth={2.5} aria-hidden />
    </Link>
    <a
      href="#plans"
      className="inline-flex min-h-[48px] items-center gap-2 rounded-xl border border-asm-line bg-white px-6 text-[15px] font-semibold text-asm-navy transition-colors hover:border-asm-blue hover:text-asm-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
    >
      See Plans
    </a>
  </div>
  ```

- [ ] **Step 5: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 6: Commit**

  ```bash
  git add client/src/pages/landing/LandingPage.tsx
  git commit -m "feat(landing): premium hero — 42px+ headline, blue accent, CTA hierarchy"
  ```

---

### Task 2: Stats bar — count-up animation + disclaimer

**Files:**
- Modify: `client/src/pages/landing/LandingPage.tsx` — stats section

**What's changing:** The platform stats (`25K+ investors`, `₹50Cr+ investments`, `₹12Cr+ payouts`) are currently static text. We add a count-up on scroll-enter and a disclaimer.

**Interfaces:**
- Consumes: framer-motion (`useInView`, `useMotionValue`, `useTransform`, `animate`) — already imported
- Produces: `CountUp` component + upgraded `StatsSection`

- [ ] **Step 1: Add `CountUp` component near the top of LandingPage.tsx**

  Insert this component before the main page function:
  ```tsx
  function CountUp({
    to,
    suffix = '',
    prefix = '',
    duration = 1.8,
  }: {
    to: number
    suffix?: string
    prefix?: string
    duration?: number
  }) {
    const ref = useRef<HTMLSpanElement>(null)
    const inView = useInView(ref, { once: true, margin: '-10% 0px' })
    const motionVal = useMotionValue(0)

    useEffect(() => {
      if (!inView) return
      const controls = animate(motionVal, to, {
        duration,
        ease: [0.16, 1, 0.3, 1],
        onUpdate(v) {
          if (ref.current) ref.current.textContent = `${prefix}${Math.round(v).toLocaleString('en-IN')}${suffix}`
        },
      })
      return controls.stop
    }, [inView, motionVal, to, duration, prefix, suffix])

    return (
      <span ref={ref}>{prefix}0{suffix}</span>
    )
  }
  ```

  Add to imports at top of file:
  ```tsx
  import { useEffect, useRef } from 'react'
  import { useInView, useMotionValue, animate } from 'framer-motion'
  ```
  (Only add what isn't already imported — check existing imports first.)

- [ ] **Step 2: Find or create the stats section**

  Locate the section that displays the platform stats (`25K+`, `₹50Cr+`, `₹12Cr+`). Replace its JSX with:
  ```tsx
  <section aria-label="Platform statistics" className="border-y border-asm-line bg-white py-8">
    <div className="mx-auto max-w-3xl px-4">
      <div className="grid grid-cols-3 divide-x divide-asm-line">
        {[
          { value: 25000, suffix: '+', label: 'Investors' },
          { value: 50, prefix: '₹', suffix: 'Cr+', label: 'Investments' },
          { value: 12, prefix: '₹', suffix: 'Cr+', label: 'Payouts' },
        ].map(({ value, suffix, prefix, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 px-4 text-center">
            <span className="font-jakarta text-[28px] font-extrabold text-asm-navy sm:text-[36px]">
              <CountUp to={value} suffix={suffix} prefix={prefix} />
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-asm-muted">{label}</span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-center text-[11px] text-asm-muted">
        Figures updated periodically. Past performance does not guarantee future returns.
      </p>
    </div>
  </section>
  ```

- [ ] **Step 3: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/landing/LandingPage.tsx
  git commit -m "feat(landing): animated count-up stats bar with disclaimer"
  ```

---

### Task 3: Trust section — regulatory badge, payment logos, human-approval callout

**Files:**
- Modify: `client/src/pages/landing/LandingPage.tsx` — trust section
- Modify: `client/src/components/landing/LandingChrome.tsx` — footer payment marks

**What's changing:** Trust signals are currently inline text or buried. We give them a dedicated visual block.

**Interfaces:**
- Produces: `TrustSection` component (inline, not exported) in LandingPage.tsx

- [ ] **Step 1: Create the trust section component**

  Add this function in `LandingPage.tsx` before the main export:
  ```tsx
  function TrustSection() {
    return (
      <section aria-labelledby="trust-heading" className="bg-asm-tint px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <h2 id="trust-heading" className="mb-6 text-center font-jakarta text-[22px] font-extrabold text-asm-navy sm:text-[28px]">
            Why investors trust ASM Coins
          </h2>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Regulatory */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-asm-line bg-white p-5 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-asm-blue-tint">
                <ShieldCheck className="size-6 text-asm-blue" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-[14px] font-bold text-asm-navy">Registered in India</span>
              <span className="text-[13px] leading-snug text-asm-body">Committed to regulatory compliance. Your investment is documented and protected.</span>
            </div>

            {/* Human approval */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-asm-line bg-white p-5 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-asm-green-tint">
                <Award className="size-6 text-asm-greenInk" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-[14px] font-bold text-asm-navy">Human-Approved Payouts</span>
              <span className="text-[13px] leading-snug text-asm-body">Every withdrawal is manually reviewed and approved by our team — no black-box automation.</span>
            </div>

            {/* UPI speed */}
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-asm-line bg-white p-5 text-center">
              <span className="flex size-12 items-center justify-center rounded-xl bg-amber-50">
                <Zap className="size-6 text-amber-600" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-[14px] font-bold text-asm-navy">Fast UPI Payouts</span>
              <span className="text-[13px] leading-snug text-asm-body">Returns credited directly to your UPI ID. No bank transfer delays, no intermediaries.</span>
            </div>
          </div>

          {/* Payment marks */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">Accepted payment methods</span>
            <div className="flex flex-wrap items-center justify-center gap-4">
              {['UPI', 'Paytm', 'PhonePe', 'Google Pay'].map((method) => (
                <span
                  key={method}
                  className="rounded-lg border border-asm-line bg-white px-3 py-1.5 text-[13px] font-bold text-asm-body shadow-sm"
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    )
  }
  ```

  Add `Award, Zap` to your lucide imports if not already present.

- [ ] **Step 2: Insert TrustSection into the page**

  In the main page return, place `<TrustSection />` after the stats bar and before the plan cards section.

- [ ] **Step 3: Update footer payment marks**

  In `client/src/components/landing/LandingChrome.tsx`, find the footer. Replace any plain-text payment method references with the same pill-style marks:
  ```tsx
  <div className="flex flex-wrap items-center justify-center gap-3 sm:justify-start">
    {['UPI', 'Paytm', 'PhonePe', 'Google Pay'].map((m) => (
      <span key={m} className="rounded-md border border-white/20 px-2.5 py-1 text-[12px] font-semibold text-white/70">
        {m}
      </span>
    ))}
  </div>
  ```

- [ ] **Step 4: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors. `Award` and `Zap` must be imported from lucide-react.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/landing/LandingPage.tsx client/src/components/landing/LandingChrome.tsx
  git commit -m "feat(landing): trust section — regulatory badge, human approval, UPI payment marks"
  ```

---

### Task 4: How It Works — numbered step flow redesign

**Files:**
- Modify: `client/src/pages/landing/LandingPage.tsx` — how-it-works section

**What's changing:** The current how-it-works section is text-based and visually flat. We replace it with a large-numbered step flow that makes the investment process feel simple and concrete.

**Interfaces:**
- Produces: `HowItWorksSection` inline component

- [ ] **Step 1: Create the section component**

  Add this function in `LandingPage.tsx`:
  ```tsx
  const HOW_STEPS = [
    {
      n: '01',
      title: 'Deposit funds',
      body: 'Add money to your ASM Coins wallet via UPI, Paytm, PhonePe, or Google Pay. Minimum ₹1,000.',
      icon: Wallet,
      tone: 'blue' as const,
    },
    {
      n: '02',
      title: 'Pick your plan',
      body: 'Choose Silver (25%), Gold (30%), or Diamond (40%) based on your investment amount.',
      icon: TrendingUp,
      tone: 'green' as const,
    },
    {
      n: '03',
      title: 'Withdraw your return',
      body: 'After 36 hours your principal + return is credited. Withdraw to UPI in minutes.',
      icon: ChartNoAxesCombined,
      tone: 'blue' as const,
    },
  ] as const

  function HowItWorksSection() {
    return (
      <section id="about" aria-labelledby="how-heading" className="px-4 py-12 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="mb-2 text-center text-[12px] font-bold uppercase tracking-[0.12em] text-asm-blue">Simple process</div>
          <h2 id="how-heading" className="mb-8 text-center font-jakarta text-[22px] font-extrabold text-asm-navy sm:text-[28px]">
            Start earning in 3 steps
          </h2>

          <div className="flex flex-col gap-6 sm:flex-row sm:gap-4">
            {HOW_STEPS.map(({ n, title, body, icon: Icon, tone }) => (
              <div key={n} className="relative flex flex-1 flex-col gap-4 rounded-2xl border border-asm-line bg-white p-5">
                {/* Step number — large, light weight, positioned top-right */}
                <span
                  aria-hidden
                  className="absolute right-4 top-3 font-jakarta text-[48px] font-extrabold leading-none text-asm-tint"
                >
                  {n}
                </span>
                <span
                  className={cn(
                    'flex size-11 items-center justify-center rounded-xl',
                    tone === 'blue' ? 'bg-asm-blue-tint' : 'bg-asm-green-tint'
                  )}
                >
                  <Icon
                    className={cn('size-5', tone === 'blue' ? 'text-asm-blue' : 'text-asm-greenInk')}
                    strokeWidth={1.75}
                    aria-hidden
                  />
                </span>
                <div>
                  <h3 className="text-[15px] font-bold text-asm-navy">{title}</h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-asm-body">{body}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 36-hour callout */}
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-asm-blue/20 bg-asm-blue-tint px-4 py-3">
            <Clock className="size-4 text-asm-blue" strokeWidth={2} aria-hidden />
            <span className="text-[13px] font-semibold text-asm-blue">36-hour investment cycles — deposit today, withdraw tomorrow</span>
          </div>
        </div>
      </section>
    )
  }
  ```

- [ ] **Step 2: Replace the existing how-it-works section**

  Find the current how-it-works / "how it works" section in the page JSX and replace it with `<HowItWorksSection />`. Remove the old section entirely.

- [ ] **Step 3: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors. `Clock` must be imported.

- [ ] **Step 4: Commit**

  ```bash
  git add client/src/pages/landing/LandingPage.tsx
  git commit -m "feat(landing): how-it-works — numbered 3-step flow with 36h callout"
  ```

---

### Task 5: Plan cards — numbers front and centre + patriotic strip

**Files:**
- Modify: `client/src/pages/landing/LandingPage.tsx` — plan cards section + patriotic strip

**What's changing:** Plan cards already have the tier accent system (`PLAN_ACCENT`). We ensure the return % is the visually dominant element on each card, and we give the "Our Country, Our Pride" strip proper placement.

**Interfaces:**
- Consumes: `PLAN_ACCENT` object already defined in file; `inr()` from `@/lib/format`
- Produces: updated `PlanCard` + `PatrioticStrip`

- [ ] **Step 1: Find the plan card JSX**

  Locate the card rendering loop that uses `PLAN_ACCENT`. Find where the return percentage is rendered.

- [ ] **Step 2: Make the return % dominant**

  In each plan card, ensure the return figure uses this treatment (adjust the actual className on the return % element):
  ```tsx
  {/* Return % — largest element on the card */}
  <div className="flex flex-col items-center py-4">
    <span className={cn('font-jakarta text-[44px] font-extrabold leading-none', s.figure)}>
      {returns}
    </span>
    <span className="mt-1 text-[13px] font-semibold text-asm-muted">annual equivalent return</span>
  </div>
  ```
  Where `s` is the `PLAN_ACCENT[tier]` object and `s.figure` is the colour class.

- [ ] **Step 3: Add a patriotic strip**

  Find where the patriotic / "Our Country, Our Pride" content is (it exists in the current page). Move it to a visually distinct full-width band positioned just below the hero:
  ```tsx
  function PatrioticStrip() {
    return (
      <div className="overflow-hidden border-y border-asm-blue/10 bg-gradient-to-r from-asm-blue-tint via-white to-asm-green-tint py-3">
        <p className="text-center text-[12px] font-bold tracking-[0.1em] text-asm-navy/70 uppercase">
          🇮🇳 Our Country · Our Pride · Our Strength — Invest in India&apos;s growth
        </p>
      </div>
    )
  }
  ```
  Place `<PatrioticStrip />` immediately after the hero section in the JSX.

- [ ] **Step 4: Build and verify**

  ```bash
  cd client && npm run build
  ```
  Expected: no type errors.

- [ ] **Step 5: Commit**

  ```bash
  git add client/src/pages/landing/LandingPage.tsx
  git commit -m "feat(landing): plan cards return% dominant, patriotic strip above fold"
  ```
