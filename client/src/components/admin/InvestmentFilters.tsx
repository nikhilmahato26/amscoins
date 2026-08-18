import { useRef } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import type { AdminInvestmentParams, InvestmentSortKey } from '@/services/api/admin'
import { paisaToRupees, rupeesToPaise } from '@/lib/filters'
import { cn } from '@/lib/utils'

const TIERS = ['silver', 'gold', 'platinum'] as const
const SORT_OPTIONS: { label: string; value: InvestmentSortKey }[] = [
  { label: 'Newest first', value: '-createdAt' },
  { label: 'Oldest first', value: 'createdAt' },
  { label: 'Amount ↑', value: 'amount' },
  { label: 'Amount ↓', value: '-amount' },
  { label: 'Matures soonest', value: 'maturesAt' },
  { label: 'Matures latest', value: '-maturesAt' },
  { label: 'Tier A–Z', value: 'tier' },
  { label: 'Tier Z–A', value: '-tier' },
]

interface InvestmentFiltersProps {
  params: AdminInvestmentParams
  onChange: (params: AdminInvestmentParams) => void
}

export function InvestmentFilters({ params, onChange }: InvestmentFiltersProps) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function setParam<K extends keyof AdminInvestmentParams>(key: K, value: AdminInvestmentParams[K]) {
    onChange({ ...params, [key]: value || undefined })
  }

  function handleSearch(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setParam('q', value || undefined), 300)
  }

  function toggleTier(tier: string) {
    const current = params.tier ? params.tier.split(',') : []
    const next = current.includes(tier)
      ? current.filter((t) => t !== tier)
      : [...current, tier]
    setParam('tier', next.length ? next.join(',') : undefined)
  }

  function handleAmountMin(e: React.ChangeEvent<HTMLInputElement>) {
    const rupees = parseFloat(e.target.value)
    setParam('amountMin', isNaN(rupees) ? undefined : rupeesToPaise(rupees))
  }

  function handleAmountMax(e: React.ChangeEvent<HTMLInputElement>) {
    const rupees = parseFloat(e.target.value)
    setParam('amountMax', isNaN(rupees) ? undefined : rupeesToPaise(rupees))
  }

  const activeTiers = params.tier ? params.tier.split(',') : []
  const inputCls = cn(
    'rounded-lg border border-asm-line bg-white px-3 py-2 text-[13px] text-asm-navy',
    'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1',
    'placeholder:text-asm-muted',
  )

  return (
    <div className="rounded-xl border border-asm-line bg-white p-4 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]">
      <div className="flex items-center gap-2 mb-3">
        <SlidersHorizontal className="size-4 text-asm-muted" strokeWidth={1.5} />
        <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">Filters</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          defaultValue={params.q ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="invest-REF, user-ID, name or email"
          className={cn(inputCls, 'min-w-[220px] flex-1')}
          aria-label="Search investments"
        />

        <select
          value={params.sort ?? '-createdAt'}
          onChange={(e) => setParam('sort', e.target.value as InvestmentSortKey)}
          className={cn(inputCls, 'cursor-pointer')}
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <input
          type="number"
          min="0"
          step="1"
          placeholder="Min ₹"
          defaultValue={params.amountMin != null ? paisaToRupees(params.amountMin) : ''}
          onChange={handleAmountMin}
          className={cn(inputCls, 'w-24')}
          aria-label="Minimum amount in rupees"
        />

        <input
          type="number"
          min="0"
          step="1"
          placeholder="Max ₹"
          defaultValue={params.amountMax != null ? paisaToRupees(params.amountMax) : ''}
          onChange={handleAmountMax}
          className={cn(inputCls, 'w-24')}
          aria-label="Maximum amount in rupees"
        />

        <input
          type="date"
          value={params.dateFrom ?? ''}
          onChange={(e) => setParam('dateFrom', e.target.value || undefined)}
          className={cn(inputCls)}
          aria-label="From date"
        />

        <input
          type="date"
          value={params.dateTo ?? ''}
          onChange={(e) => setParam('dateTo', e.target.value || undefined)}
          className={cn(inputCls)}
          aria-label="To date"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-asm-muted self-center">Tier:</span>
        {TIERS.map((tier) => {
          const active = activeTiers.includes(tier)
          return (
            <button
              key={tier}
              type="button"
              onClick={() => toggleTier(tier)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition-colors',
                active
                  ? 'bg-asm-blue text-white'
                  : 'border border-asm-line bg-white text-asm-body hover:border-asm-blue hover:text-asm-blue',
              )}
              aria-pressed={active}
            >
              {tier}
            </button>
          )
        })}
      </div>
    </div>
  )
}
