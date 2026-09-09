import { cn } from '@/lib/utils'
import type { PlanKey, Tier } from '@/types'

// Re-exported for backward compatibility — a user's loyalty tier is unrelated
// to this component's own widened prop type below (a plan can be ASM Coin,
// which is a plan but never a tier; see client/src/lib/tiers.ts).
export type { Tier }

const TIER_IMG: Record<PlanKey, string> = {
  silver:  '/silver_pakage.png',
  gold:    '/gold_pakage.png',
  diamond: '/diamond_pakage.png',
  asmcoin: '/asm.png',
}

const TIER_LABEL: Record<PlanKey, string> = {
  silver:  'Silver',
  gold:    'Gold',
  diamond: 'Diamond',
  asmcoin: 'ASM Coin',
}

/** Display label for a plan key — e.g. "ASM Coin" rather than a raw/capitalized key. */
export function planLabel(key: PlanKey): string {
  return TIER_LABEL[key]
}

/**
 * Plan/tier badge rendered from the supplied package PNG assets.
 * Images live in /public and are served at the site root.
 *
 * Accepts any PlanKey (not just a loyalty Tier) because it is also used to
 * badge a user's investments, which can be in the ungated ASM Coin plan.
 */
export function TierBadge({
  tier,
  size = 48,
  className,
}: {
  tier: PlanKey
  size?: number
  /** showRibbon is unused — labels are baked into the PNG assets */
  showRibbon?: boolean
  className?: string
}) {
  return (
    <img
      src={TIER_IMG[tier]}
      alt={`${TIER_LABEL[tier]} tier`}
      width={size}
      height={size}
      className={cn('shrink-0 object-contain drop-shadow-md', className)}
      loading="lazy"
      decoding="async"
    />
  )
}
