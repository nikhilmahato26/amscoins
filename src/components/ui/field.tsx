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
      <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-mist">
        {label}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-mist">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-rust font-medium">{error}</p>
      )}
    </div>
  )
}
