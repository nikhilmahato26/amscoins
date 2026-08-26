import { ArrowUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SortSelectProps {
  value: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
}

/** Compact sort dropdown used in admin list-page toolbars. */
export function SortSelect({ value, onChange, options }: SortSelectProps) {
  return (
    <div className="relative">
      <ArrowUpDown
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-asm-muted"
        aria-hidden
      />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Sort by"
        className={cn(
          'cursor-pointer rounded-lg border border-asm-line bg-white py-2 pl-9 pr-3 text-[13px] text-asm-navy',
          'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue',
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}
