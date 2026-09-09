import { useState } from 'react'
import type { ComponentProps } from 'react'
import { Eye, EyeOff } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/**
 * A password `<Input>` with a show/hide toggle, so a user can check what
 * they actually typed before submitting — the single highest-value affordance
 * on an auth form, and one this codebase's plain `<Input type="password">`
 * never had.
 *
 * Wraps rather than modifies `Input`: every existing `<Input type="password">`
 * call site (login, register's two password fields) is a drop-in swap to
 * `<PasswordInput>` with no other prop changes. `pr-10` is baked in ahead of
 * any caller-supplied className so the typed value never runs under the
 * toggle button — the same reserved-space convention already used for the
 * referral-code checkmark on RegisterPage.
 */
export function PasswordInput({
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type'>) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-10', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        // tabIndex -1: a sighted mouse/touch user reaches this fine without
        // it in the tab order, and pulling it in would land tab focus on the
        // toggle between the password field and Submit on every auth form.
        tabIndex={-1}
        className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md p-2 text-skin-muted hover:text-skin-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-accent"
      >
        {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </div>
  )
}
