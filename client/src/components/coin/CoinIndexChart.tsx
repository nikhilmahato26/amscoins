import { useId } from 'react'

import { cn } from '@/lib/utils'
import type { CoinPoint } from '@/services/api/coin'

/**
 * The ASM Coin index line. Hand-rolled SVG, following the Sparkline pattern
 * already in this codebase — a charting library would cost more bundle than
 * this entire feature.
 *
 * The chart is decorative and aria-hidden: the price and change are announced
 * as live text by CoinPriceTicker, so a screen reader gets the information
 * without having to interpret a path.
 */
export function CoinIndexChart({
  series,
  positive = true,
  height = 160,
  className,
  showDot = true,
}: {
  series: CoinPoint[]
  positive?: boolean
  height?: number
  className?: string
  showDot?: boolean
}) {
  const gradientId = useId()

  if (series.length < 2) return null

  // A fixed viewBox with preserveAspectRatio="none" lets the SVG stretch to any
  // container width without recalculating on resize.
  const width = 600
  const pad = 6

  const values = series.map((point) => point.p)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (series.length - 1)

  const points = values.map((value, index) => {
    const x = index * stepX
    const y = pad + (1 - (value - min) / span) * (height - pad * 2)
    return [x, y] as const
  })

  const line = points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L${width} ${height} L0 ${height} Z`

  const stroke = positive ? '#17A34A' : '#DC2626'
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn('w-full overflow-visible', className)}
      style={{ height }}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />

      {showDot && (
        <g>
          {/* The pulse is what makes the chart read as live. CSS-driven
              (see .coin-chart-pulse in index.css) so that
              prefers-reduced-motion can reliably disable it — SMIL
              <animate> does not consistently honor CSS `display: none`. */}
          <circle
            cx={lastX}
            cy={lastY}
            r="6"
            fill={stroke}
            opacity="0.28"
            className="coin-chart-pulse"
          />
          <circle cx={lastX} cy={lastY} r="4" fill={stroke} />
        </g>
      )}
    </svg>
  )
}
