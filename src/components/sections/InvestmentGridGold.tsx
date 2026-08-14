import { useState } from 'react'
import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

/**
 * Figma "Section - Investment Grid" (26:10368) — the gold-themed 327px variant.
 * Differs from the one on Package detail: each option carries an estimated
 * monthly earning, and the selected card gets a gold border plus glow.
 */
const OPTIONS: {
  id: string
  label: string
  amount: string
  earning: string
  popular?: boolean
}[] = [
  { id: 'entry', label: 'Entry', amount: '₹1,000', earning: 'Earn ~₹125/mo' },
  { id: 'starter', label: 'Starter', amount: '₹5,000', earning: 'Earn ~₹625/mo' },
  { id: 'premium', label: 'Premium', amount: '₹10,000', earning: 'Earn ~₹1,300/mo' },
  { id: 'elite', label: 'Elite', amount: '₹25,000', earning: 'Earn ~₹3,400/mo', popular: true },
]

export function InvestmentGridGold({ className }: { className?: string }) {
  const [selected, setSelected] = useState('entry')

  return (
    <section className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-end justify-between">
        <h3 className="text-lg font-medium leading-7">Select Investment</h3>
        <button
          type="button"
          className="text-xs leading-4 text-gold-antique underline decoration-solid underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-antique"
        >
          Custom Amount
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {OPTIONS.map(({ id, label, amount, earning, popular }) => {
          const isSelected = selected === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => setSelected(id)}
              aria-pressed={isSelected}
              className={cn(
                'relative flex h-[121px] flex-col justify-center rounded-2xl border px-6 text-left backdrop-blur-md',
                'bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-antique',
                isSelected
                  ? 'border-gold-antique/40 shadow-[0px_0px_15px_0px_rgba(212,175,55,0.3)]'
                  : popular
                    ? 'border-white/5'
                    : 'border-white/[0.08] hover:border-white/20'
              )}
            >
              <span className="text-xs leading-4 text-gray-400">{label}</span>
              <span className="text-xl font-bold leading-7">{amount}</span>
              <span className="pt-1 text-[10px] font-medium leading-[15px] text-gold-antique">
                {earning}
              </span>

              {isSelected ? (
                <Check
                  className="absolute right-2 top-3 size-4 text-gold-antique"
                  strokeWidth={3}
                  aria-hidden
                />
              ) : null}

              {popular && !isSelected ? (
                <span className="absolute -right-1 -top-2 rounded-full bg-gold-antique px-2 py-0.5 text-[8px] font-bold uppercase leading-3 tracking-[-0.4px] text-surface-nav">
                  Popular
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setSelected('whale')}
        aria-pressed={selected === 'whale'}
        className={cn(
          'flex h-[62px] w-full items-center justify-center gap-3 rounded-2xl border backdrop-blur-md',
          'bg-white/[0.03] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-antique',
          selected === 'whale'
            ? 'border-gold-antique/40 shadow-[0px_0px_15px_0px_rgba(212,175,55,0.3)]'
            : 'border-white/5 hover:border-white/20'
        )}
      >
        <span className="text-xl font-bold leading-7">₹50,000</span>
        <span className="text-xs leading-4 text-gray-400">Whale Tier</span>
      </button>
    </section>
  )
}
