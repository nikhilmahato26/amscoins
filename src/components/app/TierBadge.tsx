import { Gem, Medal, Trophy } from 'lucide-react'

import { cn } from '@/lib/utils'

export type Tier = 'silver' | 'gold' | 'diamond'

const TIERS = {
  silver: {
    label: 'Silver',
    surface: 'bg-gradient-to-b from-tier-silver-from to-tier-silver-to',
    ribbon: 'bg-tier-ribbon text-white',
    Icon: Medal,
  },
  gold: {
    label: 'Gold',
    surface: 'bg-gradient-to-b from-tier-gold-from to-tier-gold-to',
    ribbon: 'bg-tier-ribbon text-white',
    Icon: Trophy,
  },
  diamond: {
    label: 'Diamond',
    surface: 'bg-tier-diamond',
    ribbon: 'bg-tier-ribbon-alt text-black/50',
    Icon: Gem,
  },
} as const

/**
 * Tier medal. The Figma original is a stack of masked vector layers with
 * soft-light blends; this is a CSS approximation of the same silhouette —
 * gradient shield, top highlight, ribbon banner.
 */
export function TierBadge({
  tier,
  size = 48,
  showRibbon = true,
  className,
}: {
  tier: Tier
  size?: number
  showRibbon?: boolean
  className?: string
}) {
  const { label, surface, ribbon, Icon } = TIERS[tier]

  return (
    <span
      className={cn('relative inline-block shrink-0', className)}
      style={{ width: size, height: size }}
      aria-label={`${label} tier`}
      role="img"
    >
      <span
        className={cn(
          'absolute inset-0 flex items-start justify-center overflow-hidden shadow-lg shadow-black/40',
          surface
        )}
        style={{ borderRadius: '42% 42% 46% 46% / 38% 38% 54% 54%' }}
      >
        <span className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/60 to-transparent mix-blend-overlay" />
        <Icon
          className="relative text-white/90 drop-shadow"
          style={{ width: size * 0.38, height: size * 0.38, marginTop: size * 0.16 }}
          aria-hidden
        />
      </span>

      {showRibbon ? (
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full',
            'font-jakarta font-bold uppercase leading-none shadow',
            ribbon
          )}
          style={{
            bottom: size * 0.04,
            width: size * 0.63,
            height: size * 0.165,
            fontSize: Math.max(size * 0.086, 4),
            letterSpacing: size * 0.006,
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  )
}
