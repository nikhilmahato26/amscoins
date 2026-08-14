import { cn } from '@/lib/utils'

const GRID_SIZE = '57.3px'
const LINE = 'rgba(255,255,255,0.045)'

/**
 * The faint grid-line wash sitting behind every app screen (Figma "Group 31").
 * Rebuilt with CSS gradients instead of the exported SVG so it scales to any
 * viewport height and costs nothing to load.
 */
export function GridBackdrop({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}>
      <div
        className="absolute -left-24 top-13 h-[772px] w-[548px]"
        style={{
          backgroundImage: `repeating-linear-gradient(to right, ${LINE} 0 1px, transparent 1px ${GRID_SIZE}), repeating-linear-gradient(to bottom, ${LINE} 0 1px, transparent 1px ${GRID_SIZE})`,
          maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.5) 55%, transparent 100%)',
        }}
      />
      <div className="absolute -left-20 -top-32 h-[463px] w-[541px] rounded-full bg-brand/10 blur-3xl" />
    </div>
  )
}
