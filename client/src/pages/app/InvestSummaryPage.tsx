import { GoldHeader } from '@/components/sections/GoldHeader'
import { SummaryCTA } from '@/components/sections/SummaryCTA'

/**
 * Figma 26:10329 "Html → Body" — gold header with a summary and CTA pinned to
 * the bottom. The frame's 280px main region is empty in the design, so the
 * body here is a spacer rather than invented content.
 */
export function InvestSummaryPage() {
  return (
    <div className="min-h-screen bg-surface-nav font-jakarta text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[375px] flex-col sm:max-w-[560px] lg:max-w-[720px]">
        <GoldHeader className="sticky top-0 z-20" />
        <main className="min-h-[280px] flex-1" />
        <SummaryCTA className="sticky bottom-0" />
      </div>
    </div>
  )
}
