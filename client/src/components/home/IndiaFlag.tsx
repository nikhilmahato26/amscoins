/**
 * The tricolour, drawn to the official 3:2 ratio with the chakra's 24 spokes.
 * Decorative here, so it carries no accessible name — the adjacent "India"
 * label is the text.
 */
export function IndiaFlag({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 90 60" className={className} aria-hidden focusable="false">
      <rect width="90" height="20" fill="#FF9933" />
      <rect y="20" width="90" height="20" fill="#FFFFFF" />
      <rect y="40" width="90" height="20" fill="#138808" />

      <g transform="translate(45 30)">
        <circle r="8.6" fill="none" stroke="#000088" strokeWidth="1" />
        <circle r="1.7" fill="#000088" />
        {Array.from({ length: 24 }, (_, i) => (
          <line
            key={i}
            x1="0"
            y1="0"
            x2="0"
            y2="-8.6"
            stroke="#000088"
            strokeWidth="0.5"
            transform={`rotate(${i * 15})`}
          />
        ))}
      </g>
    </svg>
  )
}
