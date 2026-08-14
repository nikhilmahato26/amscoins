import { cn } from '@/lib/utils'

/**
 * Hero graphic: the mark enlarged inside a light disc, with a rising arrow and
 * a column series, over a faint candlestick field. All geometry — exact shapes,
 * no raster, no sketch styling.
 */
export function HeroMark({ className }: { className?: string }) {
  return (
    <div className={cn('relative', className)} aria-hidden>
      {/* Candlestick field behind the disc */}
      <svg
        viewBox="0 0 220 200"
        className="absolute inset-0 size-full"
        preserveAspectRatio="xMidYMid slice"
      >
        <g stroke="#C9D8F2" strokeWidth="1.4" strokeLinecap="round">
          {[
            [14, 62, 118],
            [34, 40, 140],
            [54, 78, 96],
            [74, 30, 150],
            [94, 66, 126],
            [124, 22, 158],
            [146, 58, 112],
            [168, 36, 146],
            [190, 70, 122],
            [206, 44, 138],
          ].map(([x, top, bottom]) => (
            <line key={x} x1={x} y1={top} x2={x} y2={bottom} />
          ))}
        </g>
        <g fill="#DEE8FA">
          {[
            [10, 78, 26],
            [30, 60, 44],
            [50, 90, 22],
            [70, 52, 52],
            [90, 82, 30],
            [120, 44, 58],
            [142, 74, 28],
            [164, 56, 46],
            [186, 86, 24],
            [202, 64, 40],
          ].map(([x, y, h]) => (
            <rect key={x} x={x} y={y} width="9" height={h} rx="1.5" />
          ))}
        </g>
      </svg>

      {/* Disc */}
      <div className="absolute inset-[8%] rounded-full bg-white shadow-[0_18px_44px_-18px_rgb(16_42_92_/_0.28)]" />
      <div className="absolute inset-[8%] rounded-full ring-1 ring-inset ring-asm-line" />

      {/* Mark, arrow and columns */}
      <svg viewBox="0 0 160 160" className="absolute inset-0 size-full">
        <g transform="translate(22 30)">
          {/* Column series */}
          <g fill="#0B4FD8">
            <rect x="4" y="76" width="11" height="18" rx="2" />
            <rect x="21" y="66" width="11" height="28" rx="2" />
            <rect x="38" y="54" width="11" height="40" rx="2" />
            <rect x="55" y="40" width="11" height="54" rx="2" />
          </g>

          {/* Navy chevron */}
          <path d="M44 4 84 94H68L44 40 30 72H14L44 4Z" fill="#102A5C" />

          {/* Green rising stroke with arrowhead */}
          <path
            d="M52 78 74 34l8 4-22 44-8-4Z"
            fill="#17A34A"
          />
          <path d="M96 12 74 22l7 6.5 5 10.5 10-27Z" fill="#17A34A" />
        </g>
      </svg>
    </div>
  )
}
