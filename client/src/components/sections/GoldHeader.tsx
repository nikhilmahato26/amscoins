import { Bell, Gem } from 'lucide-react'

import { cn } from '@/lib/utils'

/** Gold-foil wordmark gradient from Figma 26:10338. */
const FOIL =
  'linear-gradient(90deg, #BF953F 0%, #FCF6BA 25%, #B38728 50%, #FBF5B7 75%, #AA771C 100%)'

/**
 * Figma "Header Section" (26:10330). Antique-gold lockup with a metallic
 * gradient wordmark and an "Elite Asset Management" tagline.
 */
export function GoldHeader({ className }: { className?: string }) {
  return (
    <header
      className={cn(
        'flex w-full items-center justify-between border-b border-asm-line bg-white/95 px-6 pb-4 pt-8 backdrop-blur-md',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full drop-shadow-[0px_0px_7.5px_rgba(212,175,55,0.3)]"
          style={{ backgroundImage: 'linear-gradient(135deg, #D4AF37 0%, #AA8A2E 100%)' }}
        >
          <Gem className="size-[18px] text-asm-navy" strokeWidth={2} aria-hidden />
        </span>
        <span className="flex flex-col">
          <span
            className="bg-clip-text text-xl font-bold leading-7 tracking-[-1px] text-transparent"
            style={{ backgroundImage: FOIL }}
          >
            ASM COINS
          </span>
          <span className="text-[10px] uppercase leading-[15px] tracking-[2px] text-amber-700/60">
            Elite Asset Management
          </span>
        </span>
      </div>

      <button
        type="button"
        aria-label="Notifications"
        className={cn(
          'flex size-10 items-center justify-center rounded-full border border-asm-line bg-asm-tint backdrop-blur-md',
          'transition-colors hover:bg-asm-blue-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700'
        )}
      >
        <Bell className="h-4 w-3.5 text-asm-navy" aria-hidden />
      </button>
    </header>
  )
}
