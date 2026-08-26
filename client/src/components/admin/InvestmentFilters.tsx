import { useRef, useState } from 'react'
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react'
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
  const [resetKey, setResetKey] = useState(0)
  const [panelOpen, setPanelOpen] = useState(false)

  function setParam<K extends keyof AdminInvestmentParams>(key: K, value: AdminInvestmentParams[K]) {
    onChange({ ...params, [key]: value || undefined })
  }

  // Active = any filter beyond the default sort.
  const hasActiveFilters =
    !!params.tier || params.amountMin != null || params.amountMax != null ||
    !!params.dateFrom || !!params.dateTo || (!!params.sort && params.sort !== '-createdAt')

  function clearFilters() {
    onChange({ q: params.q })
    setResetKey((k) => k + 1)
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
    <div className="flex flex-col gap-2">
      {/* ── Top row: search + filter button ── */}
      <div className="flex gap-2">
        <input
          key={`q-${resetKey}`}
          type="search"
          defaultValue={params.q ?? ''}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by ref, user ID, name or email…"
          className={cn(inputCls, 'h-10 flex-1')}
          aria-label="Search investments"
        />
        <button
          type="button"
          onClick={() => setPanelOpen((o) => !o)}
          aria-expanded={panelOpen}
          aria-controls="investment-filter-panel"
          className={cn(
            'relative flex h-10 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[13px] font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
            panelOpen || hasActiveFilters
              ? 'border-asm-blue bg-asm-blue-tint text-asm-blue'
              : 'border-asm-line bg-white text-asm-body hover:border-asm-blue hover:text-asm-blue',
          )}
        >
          <SlidersHorizontal className="size-4 shrink-0" strokeWidth={1.5} />
          <span>Filters</span>
          {hasActiveFilters && (
            <span className="flex size-4 items-center justify-center rounded-full bg-asm-blue text-[9px] font-bold text-white">
              ✓
            </span>
          )}
          <ChevronDown
            className={cn('size-3.5 shrink-0 transition-transform', panelOpen && 'rotate-180')}
            strokeWidth={2}
          />
        </button>
      </div>

      {/* ── Collapsible filter panel ── */}
      {panelOpen && (
        <div
          id="investment-filter-panel"
          className="rounded-xl border border-asm-line bg-white p-4 shadow-[0_1px_4px_-1px_rgba(16,42,92,0.06)]"
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-[0.07em] text-asm-muted">Filter & Sort</span>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold text-asm-muted transition-colors hover:bg-asm-tint hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
              >
                <X className="size-3.5" strokeWidth={2} aria-hidden />
                Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
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
              key={`min-${resetKey}`}
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
              key={`max-${resetKey}`}
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

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-asm-muted">Tier:</span>
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
      )}
    </div>
  )
}
