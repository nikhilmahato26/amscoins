import type { ReactNode } from 'react'

import { AppHeader } from '@/components/app/AppHeader'
import { BottomNav } from '@/components/app/BottomNav'
import { GridBackdrop } from '@/components/app/GridBackdrop'
import { SideNav } from '@/components/app/SideNav'
import { cn } from '@/lib/utils'

/**
 * Shared chrome for the logged-in screens.
 *
 * The Figma frames are mobile-only at 375px, so mobile reproduces them exactly.
 * Above `sm` the content column widens, and from `lg` the bottom tab bar is
 * replaced by a side rail — both extrapolations, not translations of a design.
 *
 * `width="wide"` opts a screen into a roomier column for content that can use
 * multiple columns on a large viewport.
 */
export function AppShell({
  children,
  headerVariant = 'detail',
  backTo,
  width = 'default',
  className,
  contentClassName,
}: {
  children: ReactNode
  headerVariant?: 'detail' | 'root'
  backTo?: string
  width?: 'default' | 'wide'
  className?: string
  contentClassName?: string
}) {
  return (
    <div
      className={cn(
        'relative min-h-screen overflow-x-hidden bg-black font-jakarta text-white',
        className
      )}
    >
      <GridBackdrop />
      <SideNav />

      <div className="lg:pl-60">
        <AppHeader variant={headerVariant} backTo={backTo} width={width} />

        <main
          className={cn(
            'relative mx-auto w-full px-5 pb-28 pt-[102px] lg:pb-14',
            width === 'wide'
              ? 'max-w-[375px] sm:max-w-[600px] lg:max-w-[860px] xl:max-w-[1120px]'
              : 'max-w-[375px] sm:max-w-[560px] lg:max-w-[720px]',
            contentClassName
          )}
        >
          {children}
        </main>
      </div>

      <BottomNav />
    </div>
  )
}
