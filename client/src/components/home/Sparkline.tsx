import { useId } from 'react'

import { cn } from '@/lib/utils'

function createSmoothPath(points: readonly (readonly [number, number])[]): string {
  if (points.length < 2) return ''
  let d = `M${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`

  for (let i = 0; i < points.length - 1; i++) {
    const pPrev = points[Math.max(0, i - 1)]
    const pCurr = points[i]
    const pNext = points[i + 1]
    const pAfter = points[Math.min(points.length - 1, i + 2)]

    const cp1x = pCurr[0] + (pNext[0] - pPrev[0]) / 6
    const cp1y = pCurr[1] + (pNext[1] - pPrev[1]) / 6
    const cp2x = pNext[0] - (pAfter[0] - pCurr[0]) / 6
    const cp2y = pNext[1] - (pAfter[1] - pCurr[1]) / 6

    d += ` C${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${pNext[0].toFixed(2)} ${pNext[1].toFixed(2)}`
  }

  return d
}

/**
 * Trend line drawn from an actual series, not a decorative squiggle. Pass the
 * closing values; the path is derived with smooth cubic Bézier splines.
 */
export function Sparkline({
  values,
  positive = true,
  className,
  width = 80,
  height = 28,
}: {
  values: number[]
  positive?: boolean
  className?: string
  width?: number
  height?: number
}) {
  const gradientId = useId()

  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const stepX = width / (values.length - 1)
  const pad = 3

  const points = values.map((value, index) => {
    const x = index * stepX
    const y = pad + (1 - (value - min) / span) * (height - pad * 2)
    return [x, y] as const
  })

  const line = createSmoothPath(points)
  const lastX = points[points.length - 1][0]
  const firstX = points[0][0]
  const area = `${line} L${lastX.toFixed(2)} ${height} L${firstX.toFixed(2)} ${height} Z`
  const stroke = positive ? '#17A34A' : '#DC2626'

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={cn('overflow-visible shrink-0', className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}
