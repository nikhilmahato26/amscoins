import { cn } from '@/lib/utils'

type Status =
  | 'pending'
  | 'approved'
  | 'active'
  | 'rejected'
  | 'matured'
  | 'completed'
  | 'cancelled'
  | 'paid'

const CONFIG: Record<Status, { label: string; className: string }> = {
  pending:   { label: 'Pending',   className: 'bg-amber-50  text-amber-700  border-amber-200'  },
  approved:  { label: 'Approved',  className: 'bg-green-50  text-green-700  border-green-200'  },
  active:    { label: 'Active',    className: 'bg-green-50  text-green-700  border-green-200'  },
  rejected:  { label: 'Rejected',  className: 'bg-red-50    text-asm-red    border-red-200'    },
  matured:   { label: 'Matured',   className: 'bg-asm-blue-tint text-asm-blue border-asm-blue/20' },
  completed: { label: 'Completed', className: 'bg-asm-blue-tint text-asm-blue border-asm-blue/20' },
  cancelled: { label: 'Cancelled', className: 'bg-asm-tint  text-asm-muted  border-asm-line'  },
  paid:      { label: 'Paid',      className: 'bg-green-50  text-green-700  border-green-200'  },
}

export function StatusBadge({ status }: { status: string }) {
  const key = status.toLowerCase() as Status
  const cfg = CONFIG[key] ?? { label: status, className: 'bg-asm-tint text-asm-muted border-asm-line' }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize',
        cfg.className
      )}
    >
      {cfg.label}
    </span>
  )
}
