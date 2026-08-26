import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type AdminButtonVariant = 'primary' | 'danger' | 'success' | 'outline' | 'ghost'
export type AdminButtonSize = 'sm' | 'md'

const BASE = cn(
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-semibold transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
  'disabled:cursor-not-allowed disabled:opacity-50',
)

const VARIANTS: Record<AdminButtonVariant, string> = {
  primary: 'bg-asm-blue text-white hover:bg-asm-blue-dark focus-visible:ring-asm-blue',
  danger: 'bg-asm-red text-white hover:opacity-90 focus-visible:ring-asm-red',
  success: 'bg-asm-green text-white hover:opacity-90 focus-visible:ring-asm-green',
  outline:
    'border border-asm-line bg-white text-asm-body hover:bg-asm-tint hover:text-asm-navy focus-visible:ring-asm-blue',
  ghost: 'text-asm-body hover:bg-asm-tint hover:text-asm-navy focus-visible:ring-asm-blue',
}

const SIZES: Record<AdminButtonSize, string> = {
  sm: 'min-h-[36px] px-3 py-1.5 text-[12px]',
  md: 'min-h-[40px] px-3.5 py-2 text-[13px]',
}

interface AdminButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AdminButtonVariant
  size?: AdminButtonSize
}

/** Shared admin action button — replaces the many hand-rolled inline button styles. */
export function AdminButton({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: AdminButtonProps) {
  // `type` defaults to "button"; callers pass "submit" for form dialogs.
  return <button type={type} className={cn(BASE, VARIANTS[variant], SIZES[size], className)} {...props} />
}
