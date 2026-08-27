import { ArrowUpFromLine, UserPlus, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { inr } from '@/lib/format'
import type { ActivityEvent } from '@/hooks/queries'

const EVENT_CONFIG = {
  investment_approved:  { icon: CheckCircle,      iconClass: 'text-green-600',  bgClass: 'bg-green-50',        label: 'Investment approved'  },
  investment_rejected:  { icon: XCircle,          iconClass: 'text-asm-red',    bgClass: 'bg-red-50',          label: 'Investment rejected'  },
  withdrawal_approved:  { icon: ArrowUpFromLine,  iconClass: 'text-asm-blue',   bgClass: 'bg-asm-blue-tint',   label: 'Withdrawal approved'  },
  withdrawal_rejected:  { icon: XCircle,          iconClass: 'text-asm-red',    bgClass: 'bg-red-50',          label: 'Withdrawal rejected'  },
  user_registered:      { icon: UserPlus,         iconClass: 'text-violet-600', bgClass: 'bg-violet-50',       label: 'New user registered'  },
} as const

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function ActivityTimeline({ events }: { events: ActivityEvent[] }) {
  if (events.length === 0) return null

  return (
    <section aria-labelledby="activity-heading">
      <h2 id="activity-heading" className="mb-3 text-[13px] font-bold uppercase tracking-[0.08em] text-asm-muted">
        Recent Activity
      </h2>
      <div className="rounded-xl border border-asm-line bg-white divide-y divide-asm-line">
        {events.slice(0, 10).map((ev) => {
          const cfg = EVENT_CONFIG[ev.type]
          const Icon = cfg.icon
          return (
            <div key={ev.id} className="flex items-center gap-3 px-4 py-3">
              <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', cfg.bgClass)}>
                <Icon className={cn('size-4', cfg.iconClass)} strokeWidth={1.75} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[13px] font-semibold text-asm-navy">{ev.userName}</span>
                <span className="mx-1.5 text-asm-muted">·</span>
                <span className="text-[13px] text-asm-body">{cfg.label}</span>
                {ev.amount !== undefined && (
                  <span className="ml-1.5 text-[13px] font-semibold text-asm-navy">{inr(ev.amount)}</span>
                )}
              </div>
              <span className="shrink-0 text-[11px] text-asm-muted">{timeAgo(ev.timestamp)}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
