import type { AdminInvestment } from '@/services/api/admin'
import { cn } from '@/lib/utils'

export type InvStatus = AdminInvestment['status']

const STATUS_STYLES: Record<InvStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  active: 'bg-asm-blue-tint text-asm-blue',
  matured: 'bg-purple-50 text-purple-700',
  returned: 'bg-green-50 text-asm-greenInk',
  rejected: 'bg-red-50 text-asm-red',
  deleted: 'bg-zinc-200 text-zinc-600 line-through',
}

export function StatusBadge({ status }: { status: InvStatus }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold capitalize',
        STATUS_STYLES[status],
      )}
    >
      {status}
    </span>
  )
}
