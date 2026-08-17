import { useEffect } from 'react'
import {
  Eye,
  Headphones,
  Lock,
  LogIn,
  Menu,
  ShieldCheck,
  UserPlus,
  X,
  Zap,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link, NavLink } from 'react-router'

import { AsmLogo, AsmMark } from '@/components/home/AsmLogo'
import { cn } from '@/lib/utils'

/**
 * Public marketing nav. `/` is the only one of these that exists today; the
 * rest are anchors into this page so nothing dead-ends while the other
 * marketing routes are unbuilt.
 */
const NAV: { href: string; label: string; exact?: boolean }[] = [
  { href: '/', label: 'Home', exact: true },
  { href: '/#about', label: 'About Us' },
  { href: '/#plans', label: 'Investments' },
  { href: '/#referral', label: 'Affiliate' },
  { href: '/#contact', label: 'Contact Us' },
]

export function LandingHeader({
  menuOpen = false,
  onMenu,
}: {
  menuOpen?: boolean
  onMenu?: () => void
}) {
  return (
    <header className="border-b border-asm-line/80 bg-white">
      <div className="mx-auto flex w-full max-w-[1180px] items-center justify-between gap-4 px-4 py-3 lg:px-8">
        <Link
          to="/"
          aria-label="ASM Coins, home"
          className="shrink-0 [&_[data-tagline]]:hidden sm:[&_[data-tagline]]:block"
        >
          <AsmLogo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map(({ href, label, exact }) =>
            href.includes('#') ? (
              <a
                key={label}
                href={href}
                className="flex min-h-11 items-center rounded-lg px-3 text-[13px] font-bold uppercase tracking-[0.06em] text-asm-body transition-colors hover:bg-asm-tint hover:text-asm-navy"
              >
                {label}
              </a>
            ) : (
              <NavLink
                key={label}
                to={href}
                end={exact}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-11 items-center rounded-lg px-3 text-[13px] font-bold uppercase tracking-[0.06em] transition-colors',
                    isActive
                      ? 'bg-asm-blue-tint text-asm-blue'
                      : 'text-asm-body hover:bg-asm-tint hover:text-asm-navy'
                  )
                }
              >
                {label}
              </NavLink>
            )
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className={cn(
              'hidden min-h-11 items-center gap-2 rounded-lg border border-asm-line px-4 sm:flex',
              'text-[12px] font-bold uppercase tracking-[0.08em] text-asm-navy',
              'transition-colors hover:border-asm-blue/40 hover:bg-asm-tint'
            )}
          >
            <LogIn className="size-4" strokeWidth={2.2} aria-hidden />
            Login
          </Link>
          <Link
            to="/register"
            className={cn(
              'flex min-h-11 items-center gap-2 rounded-lg bg-asm-blue px-4',
              'text-[12px] font-bold uppercase tracking-[0.08em] text-white',
              'shadow-[0_8px_18px_-10px_rgb(11_79_216_/_0.8)] transition-colors hover:bg-asm-blue-dark'
            )}
          >
            <UserPlus className="size-4" strokeWidth={2.2} aria-hidden />
            <span className="hidden sm:inline">Get Started</span>
            <span className="sm:hidden">Join</span>
          </Link>

          <button
            type="button"
            onClick={onMenu}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            aria-controls="landing-menu"
            className="-mr-1 flex size-11 items-center justify-center rounded-lg text-asm-navy transition-colors hover:bg-asm-tint lg:hidden"
          >
            <Menu className="size-6" strokeWidth={2.25} />
          </button>
        </div>
      </div>
    </header>
  )
}

export function LandingMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-asm-navy/40 backdrop-blur-[2px]"
      />

      <div
        id="landing-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={cn(
          'absolute inset-y-0 right-0 flex w-[80%] max-w-[320px] flex-col bg-white px-4 py-5',
          'shadow-[-8px_0_32px_-12px_rgb(16_42_92_/_0.35)]'
        )}
      >
        <div className="flex items-center justify-between pb-5">
          <AsmLogo />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="-mr-1 flex size-11 items-center justify-center rounded-lg text-asm-navy transition-colors hover:bg-asm-tint"
          >
            <X className="size-5" strokeWidth={2.25} />
          </button>
        </div>

        <nav aria-label="All sections" className="flex flex-col gap-1">
          {NAV.map(({ href, label }) => (
            <a
              key={label}
              href={href}
              onClick={onClose}
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-bold uppercase tracking-[0.06em] text-asm-body transition-colors hover:bg-asm-tint hover:text-asm-navy"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-2 border-t border-asm-line pt-4">
          <Link
            to="/login"
            onClick={onClose}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg border border-asm-line text-[13px] font-bold uppercase tracking-[0.08em] text-asm-navy transition-colors hover:bg-asm-tint"
          >
            <LogIn className="size-4" strokeWidth={2.2} aria-hidden />
            Login
          </Link>
          <Link
            to="/register"
            onClick={onClose}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-asm-blue text-[13px] font-bold uppercase tracking-[0.08em] text-white transition-colors hover:bg-asm-blue-dark"
          >
            <UserPlus className="size-4" strokeWidth={2.2} aria-hidden />
            Create account
          </Link>
        </div>
      </div>
    </div>
  )
}

const TRUST_BAR: { Icon: LucideIcon; title: string; note: string }[] = [
  { Icon: Lock, title: 'SSL Encrypted', note: 'Secure platform' },
  { Icon: ShieldCheck, title: 'Admin Verified', note: 'Manual review for safety' },
  { Icon: Eye, title: 'Transparent Terms', note: '24-hour defined terms' },
  { Icon: Zap, title: '3-Hour Payouts', note: 'Direct to UPI' },
  { Icon: Headphones, title: 'Daily Support', note: 'WhatsApp & email team' },
]

const PAY_METHODS = [
  { label: 'UPI', className: 'bg-white text-asm-navy' },
  { label: 'Paytm', className: 'bg-[#002970] text-white' },
  { label: 'PhonePe', className: 'bg-[#5F259F] text-white' },
  { label: 'G Pay', className: 'bg-white text-asm-body' },
]

export function LandingFooter() {
  return (
    <footer id="contact" className="mt-12 border-t border-asm-line bg-asm-tint">
      <div className="mx-auto w-full max-w-[1180px] px-4 lg:px-8">
        <ul className="grid grid-cols-2 gap-x-6 gap-y-5 border-b border-asm-line py-7 md:grid-cols-5">
          {TRUST_BAR.map(({ Icon, title, note }) => (
            <li key={title} className="flex items-start gap-2.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-asm-line">
                <Icon className="size-[15px] text-asm-blue" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="text-[11px] font-bold uppercase leading-tight tracking-[0.06em] text-asm-navy">
                  {title}
                </span>
                <span className="pt-0.5 text-[11px] leading-tight text-asm-body">{note}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="flex flex-col items-center justify-between gap-6 py-7 lg:flex-row">
          <div className="flex items-center gap-3">
            <AsmMark className="size-8" />
            <span className="flex flex-col">
              <span className="text-sm font-extrabold uppercase leading-none tracking-[0.06em] text-asm-navy">
                ASM Coins
              </span>
              <span className="pt-1 text-[8px] font-semibold uppercase leading-none tracking-[0.28em] text-asm-muted">
                Invest · Grow · Prosper
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-asm-muted">
              We accept
            </span>
            <ul className="flex flex-wrap gap-2">
              {PAY_METHODS.map(({ label, className }) => (
                <li
                  key={label}
                  className={cn(
                    'flex h-7 items-center rounded border border-asm-line px-2 text-[11px] font-bold',
                    className
                  )}
                >
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/*
          Investment products carry risk and this is a consumer-facing page in
          India. A real disclosure block, the operating entity's legal name and
          a registration number belong here before launch.
        */}
        <div className="flex flex-col gap-2 border-t border-asm-line py-6 text-[11px] leading-relaxed text-asm-body">
          <p>
            Investments carry risk. Returns shown on this page are illustrative plan terms, not
            guaranteed outcomes, and past performance does not indicate future results.
          </p>
          <p className="text-asm-muted">
            © {new Date().getFullYear()} ASM Coins. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
