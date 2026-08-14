import React from 'react'
import { Headphones, ShieldCheck, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Link } from 'react-router'

import { AsmLogo } from '@/components/home/AsmLogo'
import { HeroMark } from '@/components/home/HeroMark'

const POINTS: { Icon: LucideIcon; title: string; note: string }[] = [
  { Icon: ShieldCheck, title: 'Secure & encrypted', note: 'Your details stay protected.' },
  { Icon: Zap, title: 'Instant withdrawals', note: 'Straight to UPI when a term closes.' },
  { Icon: Headphones, title: 'Support every day', note: 'Reach us on WhatsApp or email.' },
]

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-light-home flex min-h-screen flex-col bg-white font-jakarta text-asm-navy md:flex-row">
      {/* Brand panel */}
      <div className="flex w-full flex-col border-b border-asm-line bg-asm-tint p-6 md:w-[45%] md:border-b-0 md:border-r md:p-12">
        <Link to="/" aria-label="ASM Coins, home" className="w-fit">
          <AsmLogo />
        </Link>

        <div className="hidden md:flex md:flex-col md:pt-12">
          <HeroMark className="aspect-square w-full max-w-[240px]" />

          <ul className="flex flex-col gap-4 pt-10">
            {POINTS.map(({ Icon, title, note }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-asm-line">
                  <Icon className="size-[18px] text-asm-blue" strokeWidth={2.1} aria-hidden />
                </span>
                <span className="flex flex-col">
                  <span className="text-[13px] font-bold leading-tight">{title}</span>
                  <span className="pt-0.5 text-[12px] leading-snug text-asm-body">{note}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/*
          There is no backend, so these are the only way to sign in. They stay
          visible at every width — hiding them below md left phone testers with
          no way through.
        */}
        <div className="mt-4 rounded-xl border border-asm-line bg-white p-4 md:mt-auto">
          <p className="pb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-asm-muted">
            Demo accounts (no backend)
          </p>
          <dl className="flex flex-col gap-1 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-asm-body">investor@taksal.in</dt>
              <dd className="font-semibold">taksal123</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-asm-body">admin@taksal.in</dt>
              <dd className="font-semibold">admin123</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col items-center justify-center p-6 md:p-12">
        <div className="mx-auto w-full max-w-md">{children}</div>

        {/*
          Static on mobile. Absolutely positioned, it sat on top of the form once
          the on-screen keyboard shrank the viewport.
        */}
        <p className="mt-8 max-w-md text-center text-[11px] leading-relaxed text-asm-muted md:absolute md:bottom-6 md:mt-0">
          Investments carry risk. Returns are plan terms, not guaranteed outcomes.
        </p>
      </div>
    </div>
  )
}
