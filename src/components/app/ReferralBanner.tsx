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
        'flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 p-[25px]',
        'bg-gradient-to-r from-blue-600/20 to-[#E0115F]/20',
        className
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <h3 className="text-lg font-bold leading-[22.5px]">Invite &amp; Earn 2%</h3>
        <p className="pt-1 text-xs leading-[19.5px] text-gray-400">
          Earn instant commissions on every direct referral investment.
        </p>
        <Link
          to="/app/referral"
          className={cn(
            'mt-3 inline-flex w-fit items-center justify-center rounded-lg bg-white px-4 py-2',
            'text-[11px] font-bold uppercase leading-[16.5px] text-surface-nav',
            'transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand'
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
      />
    </section>
  )
}
