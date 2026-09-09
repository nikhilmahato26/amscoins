import { ChevronLeft, Menu } from 'lucide-react'
import type { RefObject } from 'react'
import { useNavigate } from 'react-router'

import { SkyToggle } from '@/components/ui/sky-toggle'
import { useTheme } from '@/context/ThemeContext'
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
  /** Ref forwarded to the hamburger button so focus can return to it after drawer closes. */
  menuButtonRef?: RefObject<HTMLButtonElement | null>
  className?: string
}

export function AppHeader({
  variant = 'detail',
  backTo,
  width = 'default',
  onHelp,
  onMenu,
  menuButtonRef,
  className,
}: AppHeaderProps) {
  const navigate = useNavigate()
  const { isDark, toggle } = useTheme()

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-20 lg:left-60',
        /* Premium glassmorphism: heavier blur, semi-transparent base */
        'backdrop-blur-[22px]',
        variant === 'root'
          ? 'bg-white/95'
          : 'bg-white/88',
        /* Layered shadow: bright inset top edge + soft drop */
        'shadow-[0_1px_0_rgba(255,255,255,0.95)_inset,0_4px_24px_-8px_rgba(16,42,92,0.07)]',
        /* Border replaced by gradient line below */
        className
      )}
    >
      {/* Gradient accent bar at the very top of the header */}
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-[2.5px] bg-gradient-to-r from-asm-blue via-asm-blue to-asm-greenInk opacity-80 dark:from-[#F4C506] dark:via-[#F59E0B] dark:to-[#10B981] dark:opacity-90"
      />
      {/* Subtle bottom separator */}
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-px bg-asm-line/70 dark:bg-[rgba(244,197,6,0.10)]"
      />

      <div
        className={cn(
          'mx-auto flex w-full items-center justify-between',
          width === 'wide'
            ? 'sm:max-w-[600px] lg:max-w-[860px] xl:max-w-[1120px]'
            : 'sm:max-w-[560px] lg:max-w-[720px]',
          variant === 'root' ? 'px-[15px] py-3' : 'px-5 pb-2 pt-3'
        )}
      >
        {variant === 'detail' ? (
          <button
            type="button"
            onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
            aria-label="Go back"
            className="flex size-11 items-center justify-start rounded-lg text-asm-body transition-colors hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue dark:text-[#b0b4bd] dark:hover:text-[#fcfcfc]"
          >
            <ChevronLeft className="size-6" strokeWidth={2.5} />
          </button>
        ) : null}

        {/* The side rail carries the wordmark from lg up, so show status badge on lg */}
        {variant === 'root' && (
          <div className="hidden items-center gap-2 lg:flex">
            <div className="flex items-center gap-2 rounded-full border border-asm-line/80 bg-asm-tint/70 px-3.5 py-1 text-[11px] font-semibold text-asm-muted dark:border-[rgba(244,197,6,0.12)] dark:bg-[#18181b] dark:text-[#8b8f99]">
              <span className="size-1.5 rounded-full bg-asm-greenInk dark:bg-[#30d158]" />
              <span className="font-semibold text-asm-navy dark:text-[#fcfcfc]">ASM Ecosystem</span>
              <span className="text-asm-muted/60 dark:text-[#3a3a3e]">·</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-asm-greenInk dark:text-[#30d158]">Live</span>
            </div>
          </div>
        )}

        {/* Mobile Logo on the left */}
        <div className="flex select-none items-center gap-2 lg:hidden">
          <div className="relative">
            <img
              src="/asm.png"
              alt="ASM Coins"
              className="size-9 shrink-0 rounded-xl object-contain"
              decoding="async"
            />
          </div>
          <span className="font-jakarta text-[20px] font-extrabold tracking-tight text-asm-navy dark:text-[#fcfcfc]">ASM</span>
          <span className="font-script text-[22px] text-asm-greenInk dark:text-[#f4c506]">Coins</span>
        </div>

        <div className="flex items-center justify-end gap-3">
          {/* Sky day/night toggle — passes origin coords for circle-reveal */}
          <div className="flex flex-col items-center gap-0.5 lg:hidden">
            <SkyToggle checked={isDark} onChange={(x, y) => toggle(x, y)} />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-asm-muted dark:text-[#8b8f99]">{isDark ? 'Dark' : 'Light'}</span>
          </div>
          <div className="hidden flex-col items-center gap-0.5 lg:flex">
            <SkyToggle checked={isDark} onChange={(x, y) => toggle(x, y)} />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-asm-muted dark:text-[#8b8f99]">{isDark ? 'Dark Mode' : 'Light Mode'}</span>
          </div>

          {variant === 'detail' ? (
            <button
              type="button"
              onClick={onHelp}
              aria-label="Help"
              className="flex size-11 items-center justify-center rounded-lg text-asm-muted transition-colors hover:text-asm-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
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
          ) : null}
          {/* Hamburger opens the nav drawer — on every page, mobile only (SideNav covers lg). */}
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onMenu}
            aria-label="Open menu"
            aria-haspopup="dialog"
            className="flex size-11 items-center justify-center rounded-lg text-asm-body transition-colors hover:text-asm-blue focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue lg:hidden"
          >
            <Menu className="size-6" strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </header>
  )
}
