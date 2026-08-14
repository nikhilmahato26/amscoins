import { ChevronLeft, Menu } from 'lucide-react'
import { useNavigate } from 'react-router'

import { cn } from '@/lib/utils'

interface AppHeaderProps {
  /**
   * `detail` — back button, centred wordmark, help button (Payment, Withdraw, Referral).
   * `root` — wordmark on the left, menu on the right (Home, Package detail).
   */
  variant?: 'detail' | 'root'
  /** Where the back button goes. Defaults to browser history. */
  backTo?: string
  /** Must match the AppShell width so the header lines up with the content. */
  width?: 'default' | 'wide'
  onHelp?: () => void
  onMenu?: () => void
  className?: string
}

export function AppHeader({
  variant = 'detail',
  backTo,
  width = 'default',
  onHelp,
  onMenu,
  className,
}: AppHeaderProps) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-20 backdrop-blur-xl lg:left-60',
        variant === 'root' ? 'bg-black' : 'bg-black/80',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto flex w-full items-center justify-between',
          width === 'wide'
            ? 'max-w-[375px] sm:max-w-[600px] lg:max-w-[860px] xl:max-w-[1120px]'
            : 'max-w-[375px] sm:max-w-[560px] lg:max-w-[720px]',
          variant === 'root' ? 'px-[15px] py-8' : 'px-5 pb-2 pt-4'
        )}
      >
        {variant === 'detail' ? (
          <button
            type="button"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            aria-label="Go back"
            className="flex size-10 items-center justify-start rounded-lg text-white/90 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <ChevronLeft className="size-6" strokeWidth={2.5} />
          </button>
        ) : null}

        {/* The side rail carries the wordmark from lg up, so avoid showing it twice. */}
        <p className="select-none text-[40px] leading-10 text-brand lg:hidden">
          <span className="font-jakarta font-extrabold tracking-tight">ASM </span>
          <span className="font-script">Coins</span>
        </p>

        {variant === 'detail' ? (
          <button
            type="button"
            onClick={onHelp}
            aria-label="Help"
            className="flex size-10 items-center justify-end rounded-lg text-white/70 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            <svg viewBox="0 0 24 24" fill="none" className="size-[18px]" aria-hidden>
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
              <path
                d="M9.5 9a2.5 2.5 0 1 1 3.6 2.25c-.7.35-1.1.9-1.1 1.6v.4"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="12" cy="17" r="1.1" fill="currentColor" />
            </svg>
          </button>
        ) : (
          <button
            type="button"
            onClick={onMenu}
            aria-label="Open menu"
            className="flex size-10 items-center justify-center rounded-lg text-white transition-colors hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand lg:hidden"
          >
            <Menu className="size-6" strokeWidth={2.5} />
          </button>
        )}
      </div>
    </header>
  )
}
