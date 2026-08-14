import { HeroBanner } from '@/components/sections/HeroBanner'
import { StickyHeader } from '@/components/sections/StickyHeader'

/**
 * Figma 2:2 "Html → Body" — sticky header over a hero banner.
 *
 * The frame stops after the banner, so there is no further content to build;
 * the ruby accent here is a different direction from the violet/amber app
 * shell and hasn't been reconciled with it.
 */
export function DashboardPage() {
  return (
    <div className="min-h-screen bg-night pb-24 font-jakarta text-white">
      <div className="mx-auto w-full max-w-[375px] sm:max-w-[560px] lg:max-w-[880px]">
        <StickyHeader className="sticky top-0 z-20" />
        <main className="px-5 pt-6">
          <HeroBanner className="lg:h-80" />
        </main>
      </div>
    </div>
  )
}
