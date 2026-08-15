import { ShieldCheck } from 'lucide-react'

import heroBackdrop from '@/assets/hero-data-clusters.jpg'
import { cn } from '@/lib/utils'

/**
 * Figma "Section - Hero Banner" (2:56). Image backdrop at 60% opacity under a
 * bottom-up scrim, with a badge row and two-line ruby-accented headline.
 */
export function HeroBanner({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'relative flex h-56 w-full flex-col justify-end overflow-hidden rounded-3xl',
        className
      )}
    >
      <img
        src={heroBackdrop}
        alt=""
        className="absolute inset-0 size-full object-cover opacity-60"
        loading="lazy"
      />
      <span
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-surface-nav via-surface-nav/40 to-transparent"
      />

      <div className="relative flex flex-col p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-ruby/30 bg-ruby/20 px-[9px] py-[3px] text-[10px] font-bold leading-[15px] text-ruby">
            36-Hour Cycles
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="size-3 text-gray-300" aria-hidden />
            <span className="text-xs leading-4 text-gray-300">Admin Verified</span>
          </span>
        </div>

        <h2 className="pt-3 text-2xl font-bold leading-[30px]">
          Maximize Your
          <br />
          <span className="text-ruby">Wealth Portfolio</span>
        </h2>
      </div>
    </section>
  )
}
