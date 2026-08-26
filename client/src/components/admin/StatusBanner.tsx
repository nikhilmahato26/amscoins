import { cn } from '@/lib/utils'

type StatusTone = 'success' | 'error'

interface StatusBannerProps {
  /** The message to announce and display. Empty/falsy renders only the live-region announcer. */
  message: string
  /** Override auto-detection (default: error when the message reads like a failure). */
  tone?: StatusTone
}

const FAILURE_RE = /\b(fail|failed|error|unable|could ?n['’]?t|invalid)\b/i

/**
 * Shared admin feedback banner. Renders an sr-only polite announcer plus a
 * visible, tone-styled banner so success/error colours are consistent everywhere.
 */
export function StatusBanner({ message, tone }: StatusBannerProps) {
  const resolved: StatusTone = tone ?? (FAILURE_RE.test(message) ? 'error' : 'success')

  return (
    <>
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {message}
      </p>
      {message && (
        <p
          className={cn(
            'rounded-lg px-4 py-3 text-[13px] font-medium',
            resolved === 'error' ? 'bg-red-50 text-asm-red' : 'bg-green-50 text-asm-greenInk',
          )}
        >
          {message}
        </p>
      )}
    </>
  )
}
