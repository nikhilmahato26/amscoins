import { Bell, Gem, Settings } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Figma "Sticky Header" (2:34). Ruby-accented logo lockup with a notification
 * button carrying an unread dot, and a settings button.
 */
export function StickyHeader({
  className,
  unread = true,
}: {
  className?: string
  unread?: boolean
}) {
  return (
    <header
      className={cn(
        'flex w-full items-center justify-between border-b border-white/10',
        'bg-surface-nav/80 px-5 pb-[17px] pt-4 backdrop-blur-lg',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className="flex size-10 shrink-0 items-center justify-center rounded-full drop-shadow-[0px_0px_10px_rgba(224,17,95,0.3)]"
          style={{ backgroundImage: 'linear-gradient(135deg, #E0115F 0%, #800020 100%)' }}
        >
          <Gem className="size-[18px] text-white" strokeWidth={2} aria-hidden />
        </span>
        <span className="flex flex-col">
          <span className="text-lg font-bold leading-7 tracking-[-0.45px]">
            ASM <span className="text-ruby">COINS</span>
          </span>
          <span className="text-[10px] uppercase leading-[10px] tracking-[1px] text-gray-400">
            Wealth Redefined
          </span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          aria-label={unread ? 'Notifications, unread' : 'Notifications'}
          className={cn(
            'relative flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5',
            'transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby'
          )}
        >
          <Bell className="h-4 w-3.5" aria-hidden />
          {unread ? (
            <span className="absolute right-2.5 top-2.5 size-2 rounded-full border-2 border-surface-nav bg-ruby" />
          ) : null}
        </button>

        <button
          type="button"
          aria-label="Settings"
          className={cn(
            'flex size-10 items-center justify-center rounded-xl border border-white/10 bg-white/5',
            'transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ruby'
          )}
        >
          <Settings className="size-4" aria-hidden />
        </button>
      </div>
    </header>
  )
}
