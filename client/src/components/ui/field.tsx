import React from 'react'
import { cn } from '@/lib/utils'

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}

export function Field({ label, error, hint, children, className, ...props }: FieldProps) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      <label className="text-sm font-semibold leading-none text-asm-navy peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-asm-body">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-asm-red">{error}</p>
      )}
    </div>
  )
}
