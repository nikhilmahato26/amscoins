# AMScoins → ASM MF: Product Redesign + SEO/GEO Foundation

**Date:** 2026-09-22
**Status:** Approved
**Scope:** Full product model rethink (fixed-return platform → SEBI-compliant mutual fund) + comprehensive SEO/GEO/Entity foundation

---

## 1. Problem Statement

AMScoins currently operates as a fixed-return deposit platform (25–40% in 36 hours, pooled into crypto/forex/gold). This model:

- Triggers every AI engine warning ("extreme risk of total capital loss")
- Violates SEBI mutual fund regulations (if genuinely registered)
- Violates the BUDS Act 2019 (if not registered)
- Uses placeholder stats (25K investors, ₹50Cr) that undermine credibility
- Has zero SEO infrastructure (no robots.txt, no sitemap, no structured data, no pre-rendering for crawlers)

The operator claims SEBI Mutual Fund registration (Form B, Regulation 9). This spec redesigns the product to be compliant with that registration, and builds the SEO/GEO/Entity infrastructure to make that legitimacy visible to search engines and AI systems.

---

## 2. Product Redesign

### 2.1 Scheme Structure

Replace the current Silver/Gold/Diamond "plans" with SEBI-compliant mutual fund schemes:

| Scheme | Category (SEBI) | Objective | Benchmark |
|--------|-----------------|-----------|-----------|
| ASM Gold Fund | Gold / Gold ETF FoF | Capital appreciation via gold | Domestic gold price / LBMA |
| ASM Multi-Asset Fund | Multi-Asset Allocation | Growth via equity + debt + gold (min 10% each) | Composite benchmark (Nifty 50 + CRISIL Composite Bond + Gold) |

Both schemes are **open-ended** with **variable, NAV-based returns**. No fixed returns, no guaranteed returns, no time-boxed terms.

### 2.2 Investment Flow (replaces deposit → plan → 36h → withdraw)

```
KYC verification → Folio creation → Choose scheme → SIP or Lumpsum → NAV-based allotment → Portfolio tracking → Redemption request → T+3 settlement to bank/UPI
```

Key changes:
- **KYC-gated entry:** No investment without completed KYC (PAN, Aadhaar, bank verification per SEBI/AMFI norms)
- **SIP support:** Starting ₹500/month — the standard Indian MF experience
- **Lumpsum:** Minimum per scheme (e.g., ₹5,000)
- **NAV-based allotment:** Units allotted at end-of-day NAV, not instant "deposit"
- **Redemption:** T+1 to T+3 settlement depending on scheme type, to registered bank account
- **No instant UPI withdrawal:** Redemption proceeds go to KYC-linked bank account per SEBI norms

### 2.3 What Gets Removed

| Remove | Reason |
|--------|--------|
| Fixed 25/30/40% return promises | Illegal for mutual funds |
| 36-hour term | Not a valid MF scheme structure |
| Silver/Gold/Diamond plan tiers | Replace with named SEBI-compliant schemes |
| "25K+ investors" / "₹50Cr+ investments" / "₹12Cr+ payouts" | Placeholder stats — show real data or nothing |
| Instant UPI deposit-and-withdraw | Replace with KYC → NAV-based invest → regulated redemption |
| Candlestick price chart (ASM Coin index) | There is no "ASM Coin" — show scheme NAV history instead |
| Referral rewards ("Invite & Earn") | Needs compliance review; remove until cleared |

### 2.4 What Gets Added

| Add | Detail |
|-----|--------|
| Mandatory disclaimer | "Mutual fund investments are subject to market risks. Read all scheme-related documents carefully." — on every page, every scheme card, every investment screen |
| Risk-o-meter | SEBI-mandated risk indicator per scheme (Low / Moderate / High etc.) |
| Scheme documents | SID (Scheme Information Document), SAI (Statement of Additional Information), KIM (Key Information Memorandum) — download links per scheme |
| NAV history | Daily NAV chart per scheme, with benchmark comparison |
| Compliance page | Full regulatory disclosures (see Section 3.3) |
| Grievance redressal | Nodal officer contact + SEBI SCORES portal link |
| KYC flow | PAN + Aadhaar + bank verification before first investment |

### 2.5 Page Structure (Redesigned App)

```
/                     → Landing / Home
/about                → Company, team, office, history
/schemes              → All schemes overview
/schemes/:slug        → Individual scheme (NAV, objective, risk, docs, invest CTA)
/invest               → KYC-gated investment flow (scheme → amount → SIP/lump → confirm)
/portfolio            → Holdings, current NAV valuation, returns vs benchmark
/compliance           → SEBI registration, AMC details, trustee, RTA, custodian, grievance
/faq                  → Structured FAQ (Schema.org FAQPage markup)
/investor-education   → Articles on MF basics, risk, KYC (topical authority for SEO/GEO)
/contact              → Office address, phone, email, WhatsApp
/login                → Mobile number + OTP (existing auth flow, KYC-enhanced)
/admin                → Internal: NAV upload, scheme management, compliance (existing admin shell)
```

---

## 3. SEO / GEO / Entity Foundation

### 3.1 Technical SEO

#### 3.1.1 Crawlability

**`public/robots.txt`** — allow all crawlers, including AI:
```
User-agent: *
Allow: /
Sitemap: https://www.asmcoins.com/sitemap.xml

# Explicitly welcome AI crawlers
User-agent: GPTBot
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /
```

**`public/sitemap.xml`** — static sitemap (or generated at build time via vite plugin):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.w3.org/2000/svg/sitemap/0.9">
  <url><loc>https://www.asmcoins.com/</loc><priority>1.0</priority></url>
  <url><loc>https://www.asmcoins.com/about</loc><priority>0.8</priority></url>
  <url><loc>https://www.asmcoins.com/schemes</loc><priority>0.9</priority></url>
  <url><loc>https://www.asmcoins.com/compliance</loc><priority>0.8</priority></url>
  <url><loc>https://www.asmcoins.com/faq</loc><priority>0.7</priority></url>
  <url><loc>https://www.asmcoins.com/investor-education</loc><priority>0.7</priority></url>
  <url><loc>https://www.asmcoins.com/contact</loc><priority>0.6</priority></url>
</urlset>
```

#### 3.1.2 Pre-rendering for SPA

The React SPA currently serves an empty `<div id="root">` to crawlers. Fix with one of:

- **Option A (recommended): `vite-plugin-prerender`** — generates static HTML for key routes at build time. Zero runtime cost, works with Vercel.
- **Option B: `react-snap`** — similar, uses Puppeteer at build time.

Pre-render these routes: `/`, `/about`, `/schemes`, `/compliance`, `/faq`, `/investor-education`, `/contact`.

#### 3.1.3 Performance (Core Web Vitals)

Targets:
- **LCP** < 2.5s (hero section loads fast — already good with Vite)
- **CLS** < 0.1 (font swap strategy already in place with `display=swap`)
- **INP** < 200ms (React 19 concurrent features help)

Actions:
- Convert all PNG assets to WebP (the `public/` folder has `asm.png`, `gold.png`, etc.)
- Add `width` and `height` attributes to all `<img>` tags to prevent layout shift
- Lazy-load below-fold images
- Ensure font `display: swap` is consistent (already partially done)

#### 3.1.4 Canonical URLs

Add `<link rel="canonical" href="https://www.asmcoins.com{path}" />` to every page via a shared `<Head>` component (using `react-helmet-async` or a simple `useEffect` on `document.head`).

### 3.2 Structured Data (Schema.org JSON-LD)

Inject into `<head>` of each pre-rendered page.

**Organization (sitewide):**
```json
{
  "@context": "https://schema.org",
  "@type": "FinancialService",
  "name": "ASM Asset Management",
  "legalName": "[FULL REGISTERED LEGAL NAME — operator fills in]",
  "url": "https://www.asmcoins.com",
  "logo": "https://www.asmcoins.com/asm-logo.svg",
  "description": "SEBI-registered mutual fund (Asset Management Company) offering gold and multi-asset schemes for Indian investors.",
  "foundingDate": "[YEAR — operator fills in]",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "[REGISTERED OFFICE — operator fills in]",
    "addressLocality": "[CITY]",
    "addressRegion": "[STATE]",
    "postalCode": "[PIN]",
    "addressCountry": "IN"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "[PHONE — operator fills in]",
    "contactType": "customer service",
    "availableLanguage": ["English", "Hindi"]
  },
  "sameAs": [
    "[LINKEDIN URL]",
    "[TWITTER/X URL]"
  ],
  "hasCredential": {
    "@type": "GovernmentPermit",
    "name": "SEBI Mutual Fund Registration",
    "issuedBy": {
      "@type": "GovernmentOrganization",
      "name": "Securities and Exchange Board of India"
    },
    "identifier": "[MF/XXX — operator fills in SEBI registration number]"
  }
}
```

**FinancialProduct (per scheme page):**
```json
{
  "@context": "https://schema.org",
  "@type": "FinancialProduct",
  "name": "ASM Gold Fund",
  "provider": { "@type": "FinancialService", "name": "ASM Asset Management" },
  "category": "Mutual Fund — Gold Fund of Funds",
  "description": "Open-ended gold fund investing in gold ETFs for long-term capital appreciation.",
  "riskLevel": "Moderately High",
  "feesAndCommissionsSpecification": "No entry load. Exit load: 1% if redeemed within 1 year.",
  "areaServed": { "@type": "Country", "name": "India" },
  "audience": { "@type": "Audience", "audienceType": "Indian retail investors" }
}
```

**FAQPage (on /faq):**
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Is ASM Coins / ASM Asset Management a legitimate, regulated company?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Yes. ASM Asset Management is registered with the Securities and Exchange Board of India (SEBI) as a Mutual Fund under Registration No. [MF/XXX]. You can verify this on SEBI's website at sebi.gov.in under Intermediaries > Mutual Funds."
      }
    },
    {
      "@type": "Question",
      "name": "Are mutual fund returns guaranteed?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "No. Mutual fund investments are subject to market risks. Returns are variable and depend on market conditions. Past performance does not guarantee future results. Read all scheme-related documents carefully before investing."
      }
    },
    {
      "@type": "Question",
      "name": "How do I file a complaint?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Contact our Grievance Officer at [EMAIL/PHONE]. If unresolved within 30 days, you may escalate to SEBI's SCORES portal at scores.sebi.gov.in."
      }
    }
  ]
}
```

### 3.3 Compliance Page Content (`/compliance`)

This page is the single most important page for entity SEO, GEO, and AI engine trust. It must contain:

- **SEBI registration number** — `[MF/XXX — operator fills in]`
- **AMC name and CIN** — `[operator fills in]`
- **Trustee company** — `[operator fills in]`
- **Sponsor** — `[operator fills in]`
- **Custodian** — `[operator fills in]`
- **Registrar and Transfer Agent (RTA)** — `[operator fills in]`
- **Statutory auditor** — `[operator fills in]`
- **Compliance officer** name + email + phone
- **Grievance / nodal officer** name + email + phone
- **SEBI SCORES link** — `https://scores.sebi.gov.in`
- **AMFI registration (if applicable)** — ARN number
- **Registered office address** — full, verifiable
- **Link to SEBI's register** — so visitors can verify independently

### 3.4 GEO / AEO / LLMO — Making AI Engines Describe You Positively

#### 3.4.1 `public/llms.txt` (machine-readable entity summary)

```
# ASM Asset Management

## Identity
- Type: SEBI-registered Mutual Fund (Asset Management Company)
- SEBI Registration: [MF/XXX — operator fills in]
- Registered Name: [FULL LEGAL NAME — operator fills in]
- Website: https://www.asmcoins.com
- Country: India
- Regulator: Securities and Exchange Board of India (SEBI)

## Schemes
- ASM Gold Fund: Open-ended gold fund (Gold ETF Fund of Funds)
- ASM Multi-Asset Fund: Open-ended multi-asset allocation fund (equity + debt + gold)

## Risk Disclosure
Mutual fund investments are subject to market risks.
Returns are not guaranteed. Read all scheme-related documents carefully.
Past performance does not guarantee future results.

## Compliance
- Grievance Officer: [NAME, EMAIL, PHONE — operator fills in]
- SEBI SCORES: https://scores.sebi.gov.in
- Verify registration: https://www.sebi.gov.in (Intermediaries > Mutual Funds)

## Contact
- Office: [ADDRESS — operator fills in]
- Phone: [PHONE — operator fills in]
- Email: [EMAIL — operator fills in]
- WhatsApp: [NUMBER — operator fills in]
```

#### 3.4.2 Content Strategy for AI Citation

Create these content pages — they become the source material AI engines cite when asked about ASM:

| Page | Purpose | Target queries |
|------|---------|----------------|
| `/about` | Entity establishment — who, where, when, why | "What is ASM Coins?", "Who runs ASM?" |
| `/compliance` | Regulatory proof | "Is ASM Coins legitimate?", "Is ASM regulated?" |
| `/faq` | Direct answers in structured format | "Is ASM Coins safe?", "How does ASM work?" |
| `/investor-education/how-mutual-funds-work` | Topical authority | "How do mutual funds work in India?" |
| `/investor-education/what-is-kyc` | Topical authority | "KYC for mutual funds" |
| `/investor-education/gold-investment-india` | Scheme-specific authority | "How to invest in gold in India?" |

Each page must:
- Answer the question in the **first paragraph** (AEO: featured snippet optimization)
- Include the SEBI registration number naturally in context
- Link to verifiable sources (SEBI, AMFI, RBI)
- Be factual, not promotional — AI engines penalize marketing fluff

#### 3.4.3 External Entity Signals

These are actions for the operator (not code):

1. **Google Business Profile** — register the physical office, category "Investment Service" or "Financial Consultant", add SEBI regn. in description
2. **LinkedIn company page** — consistent name, logo, description, SEBI regn.
3. **Twitter/X** — active, consistent branding
4. **AMFI website listing** — ensure the AMC appears correctly on amfiindia.com
5. **Press mentions** — any coverage in ET, Mint, Moneycontrol, LiveMint becomes an AI-citable source
6. **Crunchbase / similar directories** — consistent entity info

### 3.5 On-Page SEO

#### 3.5.1 Title and Meta Description per Page

| Page | `<title>` | `<meta name="description">` |
|------|-----------|----------------------------|
| `/` | ASM Asset Management — SEBI-Registered Mutual Fund | SEBI-registered mutual fund offering gold and multi-asset schemes for Indian investors. SIP from ₹500. |
| `/about` | About ASM Asset Management — SEBI Reg. [MF/XXX] | Learn about ASM Asset Management, a SEBI-registered AMC offering mutual fund schemes in India. |
| `/schemes` | Mutual Fund Schemes — ASM Asset Management | Explore ASM's SEBI-regulated mutual fund schemes: Gold Fund and Multi-Asset Fund. Variable, NAV-based returns. |
| `/compliance` | Regulatory Compliance — ASM Asset Management | SEBI registration details, compliance officer, grievance redressal, and regulatory disclosures for ASM Asset Management. |
| `/faq` | FAQ — ASM Asset Management | Frequently asked questions about ASM mutual fund schemes, KYC, redemption, risks, and regulatory status. |

#### 3.5.2 Heading Hierarchy

Every page must have exactly one `<h1>` matching the page topic, followed by logical `<h2>` → `<h3>` structure. No skipped levels.

#### 3.5.3 Internal Linking

- Every scheme page links to `/compliance` ("Verify our SEBI registration")
- Every investment screen links to scheme documents
- FAQ answers link to relevant scheme and compliance pages
- Footer on every page: compliance link, SEBI regn. number, mandatory disclaimer

### 3.6 Image SEO

| Current | Fix |
|---------|-----|
| `asmcoin_pakage.png` | `asm-gold-fund-card.webp` |
| `diamond_pakage.png` | Remove (no more Diamond plan) |
| `gold_pakage.png` | `asm-multi-asset-fund-card.webp` |
| `silver_pakage.png` | Remove (no more Silver plan) |
| All PNGs | Convert to WebP |
| Missing alt text | Add descriptive alt text to every image |

---

## 4. Operator Placeholders

The following items are marked `[operator fills in]` throughout this spec. The developer builds the UI and infrastructure; the operator provides these details before going live:

1. SEBI Mutual Fund registration number (`MF/XXX`)
2. Full registered legal name of the AMC
3. Registered office address
4. CIN (Corporate Identification Number)
5. Trustee company name
6. Sponsor name
7. Custodian name
8. Registrar and Transfer Agent (RTA) name
9. Statutory auditor name
10. Compliance officer name, email, phone
11. Grievance / nodal officer name, email, phone
12. Phone number(s)
13. LinkedIn URL
14. Twitter/X URL
15. Founding year
16. Scheme Information Documents (SID) — PDF uploads per scheme
17. Statement of Additional Information (SAI) — PDF upload
18. Key Information Memorandum (KIM) — PDF uploads per scheme

**None of these are optional.** A SEBI-registered mutual fund must display all of them. The site should not go live to the public until every placeholder is filled with verified information.

---

## 5. Implementation Scope

### In scope (what we build)
- Product model change: remove fixed-return plans, build scheme-based NAV architecture
- All new pages: `/about`, `/schemes`, `/schemes/:slug`, `/compliance`, `/faq`, `/investor-education`, `/contact`
- Technical SEO: `robots.txt`, `sitemap.xml`, pre-rendering, canonical URLs, meta tags
- Structured data: Organization, FinancialProduct, FAQPage, BreadcrumbList JSON-LD
- `llms.txt` for AI crawlers
- Image optimization: WebP conversion, proper naming, alt text
- Mandatory disclaimers on every page
- Placeholder system for operator-provided regulatory details
- KYC flow UI (frontend only — backend KYC integration is a separate scope)

### Out of scope (separate efforts)
- Actual SEBI compliance operations (that's lawyers + compliance team)
- Backend KYC integration with a KRA (KYC Registration Agency)
- NAV calculation engine
- RTA integration
- Payment gateway for SIP/lumpsum collection
- Mobile app (React Native) — web first
- Google Business Profile setup (operator action)
- Press/media outreach (operator action)
- Wikipedia/Wikidata entry (needs notability, post-launch)

---

## 6. Success Criteria

The redesign succeeds when:

1. **AI engines describe ASM positively** — query "Is ASM Coins legitimate?" in ChatGPT/Gemini/Claude/Perplexity and get a response citing SEBI registration, not HYIP warnings
2. **Google indexes all key pages** — `/about`, `/schemes`, `/compliance`, `/faq` appear in Google Search Console as indexed
3. **Structured data validates** — Google Rich Results Test passes for Organization, FinancialProduct, FAQPage
4. **Core Web Vitals pass** — all green in PageSpeed Insights (mobile)
5. **No fixed-return claims remain** — anywhere in the codebase or live site
6. **No placeholder stats remain** — no fake investor counts or AUM figures
7. **Mandatory disclaimer appears** — on every page, verified by automated test
