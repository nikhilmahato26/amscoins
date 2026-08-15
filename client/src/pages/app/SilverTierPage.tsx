import { AppShell } from '@/components/app/AppShell'
import { TierPlanCard } from '@/components/sections/TierPlanCard'
import { usePlans } from '@/hooks/queries'
import { inr } from '@/lib/format'

/**
 * Figma 4:5121 "Convert Card to Silver Packages" — a 375x852 frame whose only
 * content is the fixed-ROI plan card. Now feeds real silver plan data from the
 * API into TierPlanCard.
 */
export function SilverTierPage() {
  const { data: plans, isLoading } = usePlans()
  const silver = plans?.find((p) => p.key === 'silver')

  const tierLabel = silver ? `${silver.name} Tier` : 'Silver Tier'
  const rate = silver ? `${silver.returnPct}%` : '—'
  const duration = silver ? `${silver.durationHours} Hours` : '—'
  const minInvestment = silver ? inr(silver.minInvest) : '—'
  // Total ROI is the returnPct (single term)
  const roi = silver ? `${silver.returnPct}% Fixed` : '—'

  return (
    <AppShell backTo="/app" contentClassName="px-5 pt-[140px]">
      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          aria-label="Loading Silver plan"
          className="h-[280px] animate-pulse rounded-2xl bg-white/70 ring-1 ring-asm-line lg:mx-auto lg:max-w-[420px]"
        />
      ) : (
        <TierPlanCard
          tierLabel={tierLabel}
          rate={rate}
          period="Per Term"
          duration={duration}
          minInvestment={minInvestment}
          roi={roi}
          to="/app/invest?plan=silver"
          className="lg:mx-auto lg:max-w-[420px]"
        />
      )}
    </AppShell>
  )
}
