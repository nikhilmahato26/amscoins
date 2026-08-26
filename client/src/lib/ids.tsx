import { useState } from 'react'
import { cn } from '@/lib/utils'

export function formatInvestId(referenceCode: string): string {
  return `invest-${referenceCode}`
}

export function formatUserId(publicId: string | null): string {
  if (!publicId) return '—'
  return `user-${publicId}`
}

export function formatSupportId(id: string): string {
  return `support-${id}`
}

interface IdChipProps {
  label: string
  className?: string
}

export function IdChip({ label, className }: IdChipProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(label)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
        'font-mono text-[10px] text-asm-blue bg-asm-tint border border-asm-line',
        'hover:border-asm-blue transition-colors cursor-pointer',
        className,
      )}
    >
      {label}
      <span className="text-[9px] text-asm-muted">{copied ? '✓' : '⎘'}</span>
    </button>
  )
}
