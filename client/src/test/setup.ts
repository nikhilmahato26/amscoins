import '@testing-library/jest-dom/vitest'

// jsdom has no ResizeObserver, and never lays elements out (getBoundingClientRect
// is always 0×0), so a component that waits for its first real measurement
// before rendering (useElementSize, used by the full-variant CoinIndexChart)
// would otherwise sit on its measuring skeleton forever in tests. This stub
// fires once, synchronously, with a plausible fixed size on observe() — good
// enough for behavioural assertions, which don't depend on an exact width.
if (typeof window !== 'undefined' && !window.ResizeObserver) {
  window.ResizeObserver = class {
    callback: ResizeObserverCallback
    constructor(callback: ResizeObserverCallback) {
      this.callback = callback
    }
    observe(target: Element) {
      const contentRect = {
        width: 400, height: 160, top: 0, left: 0, right: 400, bottom: 160, x: 0, y: 0,
        toJSON: () => ({}),
      }
      this.callback([{ target, contentRect } as ResizeObserverEntry], this as unknown as ResizeObserver)
    }
    unobserve() {}
    disconnect() {}
  }
}

// jsdom implements no PointerEvent at all (not even a stub class), so
// @testing-library's fireEvent.pointerMove/Down/Up fall back to a plain
// Event that carries none of clientX/clientY/pointerId — needed to exercise
// the full-variant chart's crosshair. A MouseEvent subclass is enough: it
// keeps real clientX/clientY (MouseEvent's constructor honours them) and
// adds the handful of PointerEvent-only fields components typically read.
if (typeof window !== 'undefined' && !window.PointerEvent) {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number
    pointerType: string
    isPrimary: boolean
    constructor(type: string, params: PointerEventInit = {}) {
      super(type, params)
      this.pointerId = params.pointerId ?? 1
      this.pointerType = params.pointerType ?? 'mouse'
      this.isPrimary = params.isPrimary ?? true
    }
  }
  window.PointerEvent = PointerEventPolyfill as unknown as typeof PointerEvent
}
