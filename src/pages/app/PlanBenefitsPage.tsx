import { Gem, Medal, ShieldCheck, Trophy, Unlock, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { AppHeader } from '@/components/app/AppHeader'
import { BottomNav } from '@/components/app/BottomNav'
import { type Tier } from '@/components/app/TierBadge'
import { cn } from '@/lib/utils'

/**
 * Figma's card background is an eight-stop 150deg gradient; kept verbatim
 * rather than approximated because it carries the whole card treatment.
 */
const CARD_GRADIENT =
  'linear-gradient(150.2deg, rgba(200,216,236,0.08) 6.17%, rgba(118,130,146,0.134) 11.65%, rgba(83,93,108,0.189) 17.13%, rgba(52,60,73,0.298) 28.09%, rgba(37,45,57,0.406) 39.04%, rgba(28,36,48,0.515) 50%, rgba(19,26,38,0.733) 71.91%, rgba(14,21,32,0.95) 93.83%)'

const TIER_ICONS: Record<Tier, LucideIcon> = {
  silver: Medal,
  gold: Trophy,
  diamond: Gem,
}

/**
 * All three cards carry identical stat values in Figma, which looks like
 * placeholder content rather than intent.
 */
const STATS: { label: string; value: string; Icon: LucideIcon }[] = [
  { label: 'Level Unlock', value: 'Instant', Icon: Unlock },
  { label: 'Referral Benefits', value: 'Available', Icon: Users },
  { label: 'Payout', value: 'Instant', Icon: Zap },
  { label: 'Secure Investment', value: '100%', Icon: ShieldCheck },
]

const PLANS: { tier: Tier; name: string; description: string }[] = [
  { tier: 'silver', name: 'Silver', description: 'Start your journey with Silver package' },
  { tier: 'gold', name: 'Gold', description: 'Accelerate returns with Gold package' },
  { tier: 'diamond', name: 'Diamond', description: 'Maximum growth with Diamond package' },
]

export function PlanBenefitsPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-black font-jakarta text-white">
      {/* Ambient glows (Figma 28:10948-10950) */}
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <span className="absolute -top-10 left-20 size-[600px] rounded-full bg-sheen/[0.04] blur-[120px]" />
        <span className="absolute -left-36 top-[628px] size-[500px] rounded-full bg-brand/[0.07] blur-[120px]" />
        <span className="absolute -left-5 top-[475px] size-[400px] rounded-full bg-sheen/[0.03] blur-[100px]" />
      </div>

      <AppHeader backTo="/app" />

      <main className="relative mx-auto w-full max-w-[393px] px-6 pb-28 pt-[104px]">
        <header className="flex flex-col items-center">
          <span className="flex items-center gap-2 rounded-full border-[0.677px] border-gold-warm/20 bg-gold-warm/10 px-4 py-[5px]">
            <span className="size-1.5 rounded-full bg-gold-warm" />
            <span className="text-[11px] font-semibold uppercase leading-[16.5px] tracking-[1.65px] text-gold-warm">
              Plan Benefits
            </span>
          </span>

          <h1 className="pt-4 font-dmserif text-[26px] leading-[39px] tracking-[-0.26px] text-frost">
            Everything Included
          </h1>

          <p className="pt-2.5 text-center text-sm leading-[21px] text-haze/45">
            Every plan comes with the features you need to grow confidently.
          </p>
        </header>

        <div className="flex flex-col gap-4 pt-14">
          {PLANS.map((plan) => (
            <FeatureCard key={plan.tier} {...plan} />
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

function FeatureCard({
  tier,
  name,
  description,
}: {
  tier: Tier
  name: string
  description: string
}) {
  const Icon = TIER_ICONS[tier]

  return (
    <article
      className={cn(
        'relative overflow-hidden rounded-[20px] border-[0.677px] border-sheen/[0.18]',
        'px-7 py-6 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.3)]'
      )}
      style={{ backgroundImage: CARD_GRADIENT }}
    >
      {/* Hairline highlight along the top edge */}
      <span
        aria-hidden
        className="pointer-events-none absolute left-7 top-0 h-px w-[287px] bg-gradient-to-r from-transparent via-sheen/[0.27] to-transparent"
      />

      <div className="flex items-center gap-[18px]">
        <BenefitBadge Icon={Icon} />
        <div className="flex min-w-0 flex-col">
          <h2 className="text-[22px] font-bold uppercase leading-[33px] tracking-[1.32px] text-frost">
            {name}
          </h2>
          <p className="pt-1 text-[13px] leading-[19.5px] text-haze/50">{description}</p>
        </div>
      </div>

      <div className="pt-[22px]">
        <span className="block h-px w-full bg-gradient-to-r from-sheen/[0.18] to-transparent" />
      </div>

      <div className="grid grid-cols-4 gap-2 pt-5">
        {STATS.map(({ label, value, Icon: StatIcon }) => (
          <div
            key={label}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl px-2 py-3.5',
              'border-[0.677px] border-white/5 bg-white/[0.02]'
            )}
          >
            <StatIcon className="size-7 text-sheen/70" strokeWidth={1.5} aria-hidden />
            <span className="flex flex-col items-center">
              <span className="text-center text-[10px] leading-[13px] tracking-[0.5px] text-haze/45">
                {label}
              </span>
              <span className="pt-[3px] text-[13px] font-semibold leading-[19.5px] tracking-[0.26px] text-green-400">
                {value}
              </span>
            </span>
          </div>
        ))}
      </div>
    </article>
  )
}

/** Circular tier emblem: dark well, glowing rim, diagonal gloss. */
function BenefitBadge({ Icon }: { Icon: LucideIcon }) {
  return (
    <span className="relative size-16 shrink-0" aria-hidden>
      <span className="absolute inset-0 rounded-full p-0.5">
        <span className="block size-full rounded-full bg-abyss" />
      </span>
      <span
        className={cn(
          'absolute inset-1 flex items-center justify-center rounded-full',
          'shadow-[0px_0px_16px_0px_rgba(200,216,236,0.27),inset_0px_1px_0px_0px_rgba(255,255,255,0.25),inset_0px_-1px_0px_0px_rgba(0,0,0,0.3)]'
        )}
      >
        <Icon className="size-[26px] text-sheen" strokeWidth={1.5} />
      </span>
      <span
        className="absolute inset-1 rounded-full"
        style={{
          backgroundImage:
            'linear-gradient(135deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0) 55%)',
        }}
      />
    </span>
  )
}
