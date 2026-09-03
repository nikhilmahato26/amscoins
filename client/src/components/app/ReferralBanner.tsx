import { Link } from 'react-router'

import giftImage from '@/assets/referral-gift.png'
import { cn } from '@/lib/utils'

/**
 * "Invite & Earn" promo banner. Appears on Home and Package detail
 * (Figma "Section - Referral Banner").
 */
export function ReferralBanner({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'flex items-center gap-4 overflow-hidden rounded-2xl border border-asm-line p-[25px]',
        'bg-gradient-to-br from-asm-blue-tint to-asm-green-tint',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-lg font-bold leading-[22.5px] text-asm-navy">
          Earn <span className="text-asm-greenInk">3% cash</span> per referral
        </h3>
        <p className="pt-1 text-xs leading-[19.5px] text-asm-body">
          Get 3% of every friend&apos;s first deposit, straight to your wallet — plus unlock Gold (upto 35%) and Diamond tiers with higher limits.
        </p>
        <Link
          to="/app/referral"
          className={cn(
            'mt-3 inline-flex min-h-[44px] w-fit items-center justify-center rounded-lg bg-asm-blue px-4 py-2',
            'text-[11px] font-bold uppercase leading-[16.5px] tracking-[0.06em] text-white',
            'transition-colors hover:bg-asm-blue-dark active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-2'
          )}
        >
          Invite Friends
        </Link>
      </div>

      <img
        src={giftImage}
        alt=""
        className="h-[114px] w-32 shrink-0 object-contain"
        loading="lazy"
        decoding="async"
      />
    </section>
  )
}
