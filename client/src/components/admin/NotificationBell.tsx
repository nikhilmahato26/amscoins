import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Bell, CheckCircle2, ChevronRight } from 'lucide-react'
import { useInvestmentStats } from '@/hooks/queries'
import { cn } from '@/lib/utils'

interface NotificationItem {
  label: string
  count: number
  /** Investments-tab deep link the row navigates to. */
  to: string
  tone: 'red' | 'amber' | 'muted'
}

export function NotificationBell({ align = 'end' }: { align?: 'start' | 'end' }) {
  const { data } = useInvestmentStats()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const pendingApprovals = data?.pendingApprovals ?? 0
  const returnsAwaiting = data?.returnsAwaiting ?? 0
  const aboutToComplete = data?.aboutToComplete ?? 0
  const count = pendingApprovals + returnsAwaiting + aboutToComplete

  const items: NotificationItem[] = [
    { label: 'Pending approvals', count: pendingApprovals, to: '/admin/investments?tab=investments', tone: 'red' },
    { label: 'Returns awaiting', count: returnsAwaiting, to: '/admin/investments?tab=returns', tone: 'amber' },
    { label: 'About to complete', count: aboutToComplete, to: '/admin/investments?tab=returns', tone: 'muted' },
  ]

  /* Close on outside click or Escape. */
  useEffect(() => {
    if (!open) return
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function go(to: string) {
    setOpen(false)
    void navigate(to)
  }

  const toneDot = { red: 'bg-asm-red', amber: 'bg-amber-500', muted: 'bg-asm-muted' } as const

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${count > 0 ? ` — ${count} action${count !== 1 ? 's' : ''} needed` : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(
          'relative flex size-9 items-center justify-center rounded-lg transition-colors',
          'text-asm-muted hover:bg-asm-tint hover:text-asm-navy',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
          (count > 0 || open) && 'text-asm-navy',
        )}
      >
        <Bell className="size-5" strokeWidth={1.5} />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-[18px] items-center justify-center rounded-full bg-asm-red px-1 text-[10px] font-bold text-white">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Pending admin actions"
          className={cn(
            'absolute top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-asm-line bg-white shadow-[0_12px_40px_-8px_rgba(16,42,92,0.22)]',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          <div className="flex items-center justify-between border-b border-asm-line px-4 py-2.5">
            <span className="text-[12px] font-bold uppercase tracking-[0.07em] text-asm-muted">Needs attention</span>
            {count > 0 && (
              <span className="rounded-full bg-asm-red px-1.5 py-0.5 text-[10px] font-bold text-white">{count}</span>
            )}
          </div>

          {count === 0 ? (
            <div className="flex flex-col items-center gap-1.5 px-4 py-8 text-center">
              <CheckCircle2 className="size-6 text-asm-greenInk" strokeWidth={1.5} aria-hidden />
              <p className="text-[13px] font-semibold text-asm-navy">All caught up</p>
              <p className="text-[11px] text-asm-muted">Nothing needs your attention right now.</p>
            </div>
          ) : (
            <ul className="p-1.5">
              {items.map((item) => (
                <li key={item.label}>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => go(item.to)}
                    disabled={item.count === 0}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue',
                      item.count > 0 ? 'hover:bg-asm-tint' : 'cursor-default opacity-45',
                    )}
                  >
                    <span className={cn('size-2 shrink-0 rounded-full', toneDot[item.tone])} aria-hidden />
                    <span className="flex-1 text-[13px] font-medium text-asm-navy">{item.label}</span>
                    <span className="font-mono text-[13px] font-bold tabular-nums text-asm-navy">{item.count}</span>
                    {item.count > 0 && <ChevronRight className="size-4 text-asm-muted" aria-hidden />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
