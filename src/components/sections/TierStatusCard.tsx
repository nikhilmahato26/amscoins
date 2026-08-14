import { Crown } from 'lucide-react'

import { cn } from '@/lib/utils'

const GOLD_FILL = 'linear-gradient(135deg, #D4AF37 0%, #F3E2B3 50%, #AA8A2E 100%)'

/**
 * Figma "Section - Tier Status Card" (26:10346). Current tier, rewards rate and
 * a gold-filled progress bar toward the next tier.
 */
export function TierStatusCard({
  tier = 'Silver',
  rate = '+12.5%',
  nextTier = 'Gold',
  progress = 65,
  className,
}: {
  tier?: string
  rate?: string
  nextTier?: string
  progress?: number
  className?: string
}) {
  return (
    <section
      className={cn(
        'relative flex flex-col gap-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] p-[21px] backdrop-blur-md',
        className
      )}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 size-32 rounded-full bg-gold-antique/5 blur-[32px]"
      />

      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-[2.5px] pt-1.5">
          <span className="text-[10px] font-semibold uppercase leading-[15px] tracking-[1px] text-gray-500">
            Current Tier
          </span>
          <span className="flex items-center gap-4">
            <span className="font-playfair text-2xl font-bold leading-8">
              {tier}
              <br />
              Member
            </span>
            <Crown className="size-6 text-gold-antique" aria-hidden />
          </span>
        </div>

        <div className="flex flex-col items-end gap-[2.5px] pt-1.5">
          <span className="text-[10px] font-semibold uppercase leading-[15px] tracking-[1px] text-gray-500">
            Rewards Rate
          </span>
          <span className="text-right text-lg font-bold leading-7 text-gold-antique">
            {rate}
            <br />
            APY
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between text-xs leading-4">
          <span className="text-gray-400">
            Progress to <span className="text-gold-pale">{nextTier}</span>
          </span>
          <span>{progress}%</span>
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progress to ${nextTier}`}
        >
          <span
            className="block h-full rounded-full shadow-[0px_0px_15px_0px_rgba(212,175,55,0.3)]"
            style={{ width: `${progress}%`, backgroundImage: GOLD_FILL }}
          />
        </div>
      </div>
    </section>
  )
}
