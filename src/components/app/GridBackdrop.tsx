import { cn } from '@/lib/utils'

const GRID_SIZE = '57.3px'
const LINE = 'rgba(11,79,216,0.038)'

/**
 * Faint grid-line wash for the light app shell.
 * Converted from the original dark-theme version (white lines on black)
 * to a barely-there blue-tinted grid on the asm-tint background.
 */
export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="absolute -left-24 top-13 h-[772px] w-[548px]"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, ${LINE} 0 1px, transparent 1px ${GRID_SIZE}), repeating-linear-gradient(to bottom, ${LINE} 0 1px, transparent 1px ${GRID_SIZE})`,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 55%, transparent 100%)',
        }}
      />
      {/* Soft blue ambient blob replacing the dark-theme violet glow */}
      <div className="absolute -left-20 -top-32 h-[420px] w-[520px] rounded-full bg-asm-blue/[0.06] blur-3xl" />
    </div>
  )
}
