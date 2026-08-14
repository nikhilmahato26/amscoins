import type { ReactNode } from 'react'
import { Link } from 'react-router'

import { BenefitsSection } from '@/components/sections/BenefitsSection'
import { CoinMedallion } from '@/components/sections/CoinMedallion'
import { GoldHeader } from '@/components/sections/GoldHeader'
import { GoldPackageCard } from '@/components/sections/GoldPackageCard'
import { HeroBanner } from '@/components/sections/HeroBanner'
import { InvestmentGridGold } from '@/components/sections/InvestmentGridGold'
import { StickyHeader } from '@/components/sections/StickyHeader'
import { SummaryCTA } from '@/components/sections/SummaryCTA'
import { TierPlanCard } from '@/components/sections/TierPlanCard'
import { TierStatusCard } from '@/components/sections/TierStatusCard'
import { TrustBadges } from '@/components/sections/TrustBadges'

const SCREENS: { label: string; node: string; to: string }[] = [
  { label: 'Home', node: '3:15538', to: '/app' },
  { label: 'Package detail', node: '26:10447', to: '/app/invest' },
  { label: 'Payment Method', node: '29:11506', to: '/app/payment' },
  { label: 'Withdraw', node: '29:12283', to: '/app/withdraw' },
  { label: 'Referral', node: '29:12735', to: '/app/referral' },
  { label: 'Plan benefits', node: '28:10938', to: '/app/benefits' },
  { label: 'Desktop plans', node: '26:8496', to: '/plans' },
  { label: 'Hero banner', node: '2:2', to: '/app/dashboard' },
  { label: 'Summary & CTA', node: '26:10329', to: '/app/summary' },
  { label: 'Silver tier card', node: '4:5121', to: '/app/silver-tier' },
]

/**
 * Every Figma section that has no host screen of its own, rendered at its
 * design width alongside its node id. Sections here are built and reviewable
 * but not yet composed into a real screen.
 */
export function GalleryPage() {
  return (
    <div className="min-h-screen bg-night font-jakarta text-white">
      <div className="mx-auto w-full max-w-5xl px-6 py-16">
        <header className="flex flex-col gap-3">
          <h1 className="font-dmserif text-[32px] leading-tight text-frost">Component gallery</h1>
          <p className="max-w-xl text-sm leading-6 text-gray-400">
            Sections built from the Figma file that have no screen to live on yet. Each is rendered
            at its design width with its node id, so it can be reviewed against the frame and
            dropped into a screen later.
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 pt-8">
          {SCREENS.map(({ label, node, to }) => (
            <Link
              key={to}
              to={to}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
            >
              {label} <span className="text-gray-500">{node}</span>
            </Link>
          ))}
        </nav>

        <div className="flex flex-col gap-14 pt-14">
          <Item label="Sticky Header" node="2:34" width={375}>
            <StickyHeader />
          </Item>

          <Item label="Section - Hero Banner" node="2:56" width={335}>
            <HeroBanner />
          </Item>

          <Item label="Header Section (gold)" node="26:10330" width={375}>
            <GoldHeader />
          </Item>

          <Item label="Section - Summary & CTA" node="26:10428" width={375}>
            <SummaryCTA />
          </Item>

          <Item label="Section - Tier Status Card" node="26:10346" width={327}>
            <TierStatusCard />
          </Item>

          <Item label="Section - Investment Grid (gold)" node="26:10368" width={327}>
            <InvestmentGridGold />
          </Item>

          <Item label="Benefits Section" node="26:10400" width={327}>
            <BenefitsSection />
          </Item>

          <Item label="Gold Package" node="26:8431" width={335}>
            <GoldPackageCard />
          </Item>

          <Item label="SilverPackage (fixed ROI)" node="4:5126" width={320}>
            <TierPlanCard />
          </Item>

          <Item label="Coin medallion" node="26:10425" width={192}>
            <CoinMedallion />
          </Item>

          <Item label="Section - Trust Badges" node="2:218" width={335}>
            <TrustBadges />
          </Item>

          <Item label="Section - Visual Hero / Illustration" node="26:10424" width={327}>
            <div className="flex h-60 items-center justify-center rounded-2xl border border-dashed border-white/15 text-xs text-gray-500">
              Empty frame in Figma — nothing to build
            </div>
          </Item>
        </div>
      </div>
    </div>
  )
}

function Item({
  label,
  node,
  width,
  children,
}: {
  label: string
  node: string
  width: number
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="flex items-baseline gap-2 text-sm font-semibold text-gray-300">
        {label}
        <span className="font-mono text-[11px] font-normal text-gray-500">{node}</span>
        <span className="font-mono text-[11px] font-normal text-gray-600">{width}px</span>
      </h2>
      <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-black/40 p-6">
        <div style={{ width }}>{children}</div>
      </div>
    </section>
  )
}
