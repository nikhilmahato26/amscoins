import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AdminButton } from './AdminButton'
import type { AdminButtonVariant } from './AdminButton'

interface ConfirmDialogProps {
  title: string
  /** Body copy / details. */
  body: ReactNode
  confirmLabel: string
  /** Label shown while the mutation is pending (defaults to confirmLabel + "…"). */
  pendingLabel?: string
  confirmVariant?: Extract<AdminButtonVariant, 'primary' | 'danger' | 'success'>
  cancelLabel?: string
  /** When true, shows an optional note textarea whose value is passed to onConfirm. */
  withNote?: boolean
  noteLabel?: string
  notePlaceholder?: string
  isPending?: boolean
  onConfirm: (note?: string) => void
  onCancel: () => void
}

/**
 * Generic admin confirmation modal. Replaces the many near-identical approve/reject
 * dialogs. Constrains height so it never overflows on small screens.
 */
export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  pendingLabel,
  confirmVariant = 'primary',
  cancelLabel = 'Cancel',
  withNote = false,
  noteLabel = 'Note (optional)',
  notePlaceholder = 'Add a note…',
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const titleId = useId()
  const [note, setNote] = useState('')

  /* Escape cancels when not mid-request. */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isPending) onCancel()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isPending, onCancel])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/30 p-4 backdrop-blur-sm"
      onClick={() => !isPending && onCancel()}
    >
      <div
        className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-asm-line bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="text-[15px] font-bold text-asm-navy">
          {title}
        </h2>
        <div className="mt-2 text-[13px] text-asm-body">{body}</div>

        {withNote && (
          <label className="mt-4 block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-asm-muted">
              {noteLabel}
            </span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder={notePlaceholder}
              className={cn(
                'mt-1.5 w-full resize-none rounded-lg border border-asm-line bg-asm-tint px-3 py-2',
                'text-[13px] text-asm-navy placeholder:text-asm-muted',
                'focus:border-asm-blue focus:outline-none focus:ring-2 focus:ring-asm-blue focus:ring-offset-1',
              )}
            />
          </label>
        )}

        <div className="mt-5 flex justify-end gap-2.5">
          <AdminButton variant="outline" size="sm" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </AdminButton>
          <AdminButton
            variant={confirmVariant}
            size="sm"
            onClick={() => onConfirm(withNote ? note : undefined)}
            disabled={isPending}
          >
            {isPending ? (pendingLabel ?? `${confirmLabel}…`) : confirmLabel}
          </AdminButton>
        </div>
      </div>
    </div>
  )
}
