import { ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router'

import bitcoinIcon from '@/assets/market-bitcoin.svg'
import goldIcon from '@/assets/market-gold.png'
import silverIcon from '@/assets/market-silver.png'
import { cn } from '@/lib/utils'

/** Placeholder rows until the price feed is wired up. */
const ROWS = [
  {
    symbol: 'BITCOIN',
    name: 'Nippon Indosari Tbk',
    price: '8,600',
    change: '+50 (+3.23%)',
    up: true,
    icon: bitcoinIcon,
  },
  {
    symbol: 'GOLD',
    name: 'GoTo Gojek Tokopedia',
    price: '2,421',
    change: '-121 (-20,6%)',
    up: false,
    icon: goldIcon,
  },
  {
    symbol: 'SILVER',
    name: 'Airbnb Inc',
    price: '5,300',
    change: '+31 (+2.23%)',
    up: true,
    icon: silverIcon,
  },
]

export function MarketTicker({ className }: { className?: string }) {
  return (
    <section className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm text-[#f2f2f2]">Live Market</h2>
        <button
          type="button"
          className="flex items-center gap-1 rounded-full border border-[#bfbfbf] py-0.5 pl-3 pr-1.5 text-xs font-medium text-[#f2f2f2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
        >
          24 jam
          <ChevronDown className="size-[18px] opacity-70" aria-hidden />
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {ROWS.map(({ symbol, name, price, change, up, icon }) => (
          <li key={symbol} className="flex items-center justify-between p-2">
            <div className="flex items-center gap-2.5">
              <img src={icon} alt="" className="size-6 shrink-0 rounded-full" loading="lazy" />
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-bold leading-none text-[#f2f2f2]">{symbol}</span>
                <span className="text-xs leading-none text-[#bfbfbf]">{name}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-base font-bold leading-none text-[#f2f2f2]">{price}</span>
              <span
                className={cn(
                  'text-xs leading-none',
                  up ? 'text-[#5ECCA3]' : 'text-[#FF7070]'
                )}
              >
                {change}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <Link
        to="/app/market"
        className="flex items-center justify-center py-1.5 text-sm text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      >
        See all
        <ChevronRight className="size-5" aria-hidden />
      </Link>
    </section>
  )
}
