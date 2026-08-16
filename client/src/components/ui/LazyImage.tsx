import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

/**
 * Lazy-loaded image with native IntersectionObserver.
 *
 * - Renders a tiny transparent placeholder until the element enters the
 *   viewport (with 200px margin so it loads just before scrolling into view).
 * - Fades in smoothly on load via CSS transition.
 * - Always sets `decoding="async"` so the main thread isn't blocked.
 * - Pass `width` and `height` to prevent CLS (layout shift).
 */
export function LazyImage({
  src,
  alt = '',
  className,
  width,
  height,
  ...rest
}: ImgHTMLAttributes<HTMLImageElement>) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [inView, setInView] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const el = imgRef.current
    if (!el) return

    // If IntersectionObserver isn't available (old browsers), load immediately
    if (!('IntersectionObserver' in window)) {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' } // start loading 200px before visible
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <img
      ref={imgRef}
      src={inView ? src : undefined}
      alt={alt}
      width={width}
      height={height}
      decoding="async"
      onLoad={() => setLoaded(true)}
      className={cn(
        'transition-opacity duration-300',
        loaded ? 'opacity-100' : 'opacity-0',
        className
      )}
      {...rest}
    />
  )
}
