import { Bell } from 'lucide-react'
import { useInvestmentStats } from '@/hooks/queries'
import { cn } from '@/lib/utils'

export function NotificationBell() {
  const { data } = useInvestmentStats()

  const count = data
    ? data.pendingApprovals + data.returnsAwaiting + data.aboutToComplete
    : 0

  return (
    <button
      type="button"
      aria-label={`Notifications${count > 0 ? ` — ${count} action${count !== 1 ? 's' : ''} needed` : ''}`}
      className={cn(
        'relative flex size-9 items-center justify-center rounded-lg',
        'text-asm-muted hover:bg-asm-tint hover:text-asm-navy transition-colors',
        count > 0 && 'text-asm-navy',
      )}
    >
      <Bell className="size-5" strokeWidth={1.5} />
      {count > 0 && (
        <span
          className={cn(
            'absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center',
            'rounded-full px-1 text-[10px] font-bold text-white',
            'bg-asm-red',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      )}
    </button>
  )
}
