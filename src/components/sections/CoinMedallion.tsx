import coinImage from '@/assets/coin-medallion.jpg'
import { cn } from '@/lib/utils'

/**
 * Figma 26:10425 — the 3D coin render sitting inside a gold blur halo.
 * Used as the visual for "Section - Visual Hero / Illustration" (26:10424),
 * which is an empty frame in the file.
 */
export function CoinMedallion({
  size = 192,
  className,
}: {
  size?: number
  className?: string
}) {
  return (
    <div
      className={cn('relative flex items-center justify-center', className)}
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-gold-antique/20 blur-[30px]"
      />
      <img src={coinImage} alt="" className="relative size-full object-contain" loading="lazy" />
    </div>
  )
}
