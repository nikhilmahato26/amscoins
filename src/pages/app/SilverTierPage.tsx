import { AppShell } from '@/components/app/AppShell'
import { TierPlanCard } from '@/components/sections/TierPlanCard'

/**
 * Figma 4:5121 "Convert Card to Silver Packages" — a 375x852 frame whose only
 * content is the fixed-ROI plan card. App chrome added so the screen is
 * navigable; the frame itself has none.
 */
export function SilverTierPage() {
  return (
    <AppShell backTo="/app" contentClassName="px-7 pt-[140px]">
      <TierPlanCard className="lg:mx-auto lg:max-w-[420px]" />
    </AppShell>
  )
}
