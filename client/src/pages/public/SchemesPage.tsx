import { ArrowRight, TrendingUp } from 'lucide-react'
import { Link } from 'react-router'

import { PageMeta } from '@/components/seo/PageMeta'
import { MutualFundDisclaimer } from '@/components/seo/MutualFundDisclaimer'

import { PublicLayout } from './PublicLayout'

interface Scheme {
  name: string
  category: string
  objective: string
  benchmark: string
  riskLevel: string
  riskColor: string
  minSip: string
  minLump: string
  exitLoad: string
  highlights: string[]
}

const SCHEMES: Scheme[] = [
  {
    name: 'ASM Gold Fund',
    category: 'Gold — Fund of Funds (Open-ended)',
    objective:
      'To provide long-term capital appreciation by investing in units of gold ETFs and gold-related instruments.',
    benchmark: 'Domestic Gold Price (LBMA AM Fixing)',
    riskLevel: 'Moderately High',
    riskColor: 'text-amber-600 dark:text-amber-400',
    minSip: '₹500 / month',
    minLump: '₹5,000',
    exitLoad: '1% if redeemed within 1 year',
    highlights: [
      'Exposure to gold without holding physical metal',
      'Ideal for portfolio diversification and inflation hedging',
      'NAV-based, market-linked returns',
      'No storage, purity, or security concerns',
    ],
  },
  {
    name: 'ASM Multi-Asset Fund',
    category: 'Multi-Asset Allocation (Open-ended)',
    objective:
      'To generate long-term capital appreciation through a diversified portfolio of equity, debt, and gold, with a minimum 10% allocation to each asset class.',
    benchmark: 'Composite (Nifty 50 + CRISIL Composite Bond + Gold)',
    riskLevel: 'High',
    riskColor: 'text-red-600 dark:text-red-400',
    minSip: '₹500 / month',
    minLump: '₹5,000',
    exitLoad: '1% if redeemed within 1 year',
    highlights: [
      'Balanced exposure to equity, debt, and gold',
      'Professional rebalancing by the fund manager',
      'Diversification reduces concentration risk',
      'Suitable for investors seeking balanced growth',
    ],
  },
]

function SchemeCard({ scheme }: { scheme: Scheme }) {
  const schemeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FinancialProduct',
    name: scheme.name,
    provider: {
      '@type': 'FinancialService',
      name: 'ASM Asset Management',
    },
    category: `Mutual Fund — ${scheme.category}`,
    description: scheme.objective,
    riskLevel: scheme.riskLevel,
    feesAndCommissionsSpecification: `No entry load. Exit load: ${scheme.exitLoad}.`,
    areaServed: { '@type': 'Country', name: 'India' },
  }

  return (
    <>
      {/* Inject per-scheme structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemeJsonLd) }}
      />
      <article className="overflow-hidden rounded-2xl border border-skin-line bg-skin-surface">
        {/* Header */}
        <div className="border-b border-skin-line bg-skin-tint px-5 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="size-5 text-skin-accent" aria-hidden />
            <h2 className="font-jakarta text-[18px] font-extrabold text-skin-text">
              {scheme.name}
            </h2>
          </div>
          <p className="mt-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-skin-muted">
            {scheme.category}
          </p>
        </div>

        <div className="p-5">
          {/* Objective */}
          <h3 className="text-[13px] font-bold uppercase tracking-[0.08em] text-skin-muted">
            Investment Objective
          </h3>
          <p className="mt-1 text-[14px] leading-relaxed text-skin-body">
            {scheme.objective}
          </p>

          {/* Key Details */}
          <div className="mt-5 grid grid-cols-2 gap-3">
            {[
              { label: 'Benchmark', value: scheme.benchmark },
              {
                label: 'Risk Level',
                value: scheme.riskLevel,
                className: scheme.riskColor,
              },
              { label: 'Min SIP', value: scheme.minSip },
              { label: 'Min Lumpsum', value: scheme.minLump },
              { label: 'Exit Load', value: scheme.exitLoad },
              { label: 'Entry Load', value: 'Nil' },
            ].map(({ label, value, className }) => (
              <div key={label}>
                <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-skin-muted">
                  {label}
                </dt>
                <dd
                  className={`mt-0.5 text-[13px] font-semibold ${className ?? 'text-skin-text'}`}
                >
                  {value}
                </dd>
              </div>
            ))}
          </div>

          {/* Highlights */}
          <h3 className="mb-2 mt-5 text-[13px] font-bold uppercase tracking-[0.08em] text-skin-muted">
            Key Highlights
          </h3>
          <ul className="space-y-1.5">
            {scheme.highlights.map((h) => (
              <li
                key={h}
                className="flex items-start gap-2 text-[13px] leading-relaxed text-skin-body"
              >
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-skin-accent" />
                {h}
              </li>
            ))}
          </ul>

          {/* CTA */}
          <div className="mt-6 flex gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 rounded-lg bg-skin-accent px-4 py-2.5 text-[13px] font-bold text-skin-on-accent transition-colors hover:bg-skin-accent-hover"
            >
              Start Investing
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            <Link
              to="/compliance"
              className="inline-flex items-center gap-1.5 rounded-lg border border-skin-line px-4 py-2.5 text-[13px] font-bold text-skin-text transition-colors hover:bg-skin-tint"
            >
              Scheme Documents
            </Link>
          </div>
        </div>
      </article>
    </>
  )
}

export function SchemesPage() {
  return (
    <PublicLayout>
      <PageMeta
        title="Mutual Fund Schemes"
        description="Explore ASM Asset Management's SEBI-regulated mutual fund schemes — Gold Fund and Multi-Asset Fund. NAV-based, variable returns. SIP from ₹500."
      />

      <section className="bg-skin-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-skin-accent">
            Our Schemes
          </p>
          <h1 className="mt-1 font-jakarta text-[32px] font-extrabold leading-tight text-skin-text sm:text-[40px]">
            Mutual Fund Schemes
          </h1>
          <p className="mt-4 text-base leading-relaxed text-skin-body">
            Professionally managed, SEBI-regulated schemes designed for Indian
            retail investors. All returns are variable and NAV-based — we never
            promise fixed or guaranteed returns.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {SCHEMES.map((scheme) => (
            <SchemeCard key={scheme.name} scheme={scheme} />
          ))}
        </div>
      </section>

      {/* Risk Disclaimer */}
      <section className="bg-skin-surface px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-xl border border-amber-500/20 bg-amber-50/50 p-5 dark:bg-amber-950/20">
          <h2 className="text-[14px] font-bold text-amber-800 dark:text-amber-300">
            ⚠️ Important Risk Information
          </h2>
          <ul className="mt-2 space-y-1 text-[13px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
            <li>• Mutual fund investments are subject to market risks.</li>
            <li>• Read all scheme-related documents carefully before investing.</li>
            <li>• Past performance does not guarantee future results.</li>
            <li>• The NAV of a scheme can go up or down based on market factors.</li>
            <li>• There is no assurance that a scheme's objective will be achieved.</li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 pb-8 pt-2">
        <MutualFundDisclaimer />
      </div>
    </PublicLayout>
  )
}
