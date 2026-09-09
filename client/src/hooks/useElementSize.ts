import { useEffect, useRef, useState } from 'react'

/**
 * Tracks an element's real rendered pixel size via ResizeObserver. Built for
 * CoinIndexChart, which used to fake a fixed-width viewBox stretched with
 * `preserveAspectRatio="none"` — that made every candle's geometry a
 * function of an arbitrary stretch factor instead of real pixels, so
 * body/wick widths ported from lightweight-charts (which assume a 1:1 SVG
 * unit-to-pixel mapping) came out wrong. Measuring first and rendering a 1:1
 * viewBox is the fix; any other component that needs its own pixel width for
 * layout math should reuse this rather than re-adding a ResizeObserver.
 *
 * Returns `null` until the first measurement lands, so callers can render a
 * skeleton instead of laying out against a guessed width and jumping once
 * the real size arrives.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState<{ width: number; height: number } | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setSize({ width, height })
    })
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return { ref, size }
}
