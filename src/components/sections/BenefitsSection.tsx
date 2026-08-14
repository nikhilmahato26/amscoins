import { ShieldCheck, TrendingUp } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const BENEFITS: { Icon: LucideIcon; title: string; subtitle: string }[] = [
  { Icon: ShieldCheck, title: 'Secured Assets', subtitle: 'Institutional grade vault protection' },
  { Icon: TrendingUp, title: 'Compound Returns', subtitle: 'ROI calculated and paid daily' },
]

/**
 * Figma "Benefits Section" (26:10400) — the standalone 327px variant. Same
 * structure as the one embedded in Package detail, extracted so both can share
 * it once the host screen for this one exists.
 */
export function BenefitsSection({ className }: { className?: string }) {
  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <h3 className="text-lg font-medium leading-7">Exclusive Benefits</h3>
      <div className="flex flex-col gap-3">
        {BENEFITS.map(({ Icon, title, subtitle }) => (
          <div
            key={title}
            className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] p-[17px] backdrop-blur-md"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-gold-antique/20 bg-gold-antique/10">
              <Icon className="size-4 text-gold-antique" aria-hidden />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="text-sm font-semibold leading-5">{title}</span>
              <span className="text-xs leading-4 text-gray-400">{subtitle}</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
