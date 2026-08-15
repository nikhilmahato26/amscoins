import { CheckCircle2, Lock, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

const BADGES: { label: string; Icon: LucideIcon }[] = [
  { label: '256-bit SSL', Icon: Lock },
  { label: 'Admin Verified', Icon: CheckCircle2 },
  { label: 'Direct UPI', Icon: Wallet },
]

/**
 * Figma "Section - Trust Badges" (2:218). Rendered at 50% opacity with
 * desaturated marks, so it reads as a quiet footer strip.
 */
export function TrustBadges({ className }: { className?: string }) {
  return (
    <section
      className={cn(
        'flex items-center justify-center gap-[54px] border-t border-white/10 px-7 pb-6 pt-[25px]',
        className
      )}
    >
      {BADGES.map(({ label, Icon }) => (
        <span key={label} className="flex flex-col items-center gap-2 opacity-50">
          <Icon className="size-6" strokeWidth={1.75} aria-hidden />
          <span className="whitespace-nowrap text-[8px] font-bold uppercase leading-3">
            {label}
          </span>
        </span>
      ))}
    </section>
  )
}
