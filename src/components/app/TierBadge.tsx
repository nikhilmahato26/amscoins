import { cn } from '@/lib/utils'

export type Tier = 'silver' | 'gold' | 'diamond'

const TIER_IMG: Record<Tier, string> = {
  silver:  '/silver_pakage.png',
  gold:    '/gold_pakage.png',
  diamond: '/diamond_pakage.png',
}

const TIER_LABEL: Record<Tier, string> = {
  silver:  'Silver',
  gold:    'Gold',
  diamond: 'Diamond',
}

/**
 * Tier badge rendered from the supplied package PNG assets.
 * Images live in /public and are served at the site root.
 */
export function TierBadge({
  tier,
  size = 48,
  className,
}: {
  tier: Tier
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
