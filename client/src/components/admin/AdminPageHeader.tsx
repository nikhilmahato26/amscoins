import type { ReactNode } from 'react'

interface AdminPageHeaderProps {
  title: string
  subtitle?: string
  /** Optional right-aligned actions (buttons, export, etc.). */
  actions?: ReactNode
}

/** Standard admin page header — title + subtitle with an optional actions slot. */
export function AdminPageHeader({ title, subtitle, actions }: AdminPageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] xl:text-[26px] font-bold tracking-tight text-asm-navy">{title}</h1>
        {subtitle && <p className="mt-0.5 text-[13px] xl:text-[14px] text-asm-muted">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  )
}
