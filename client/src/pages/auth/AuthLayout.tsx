import React from 'react'
import { Link } from 'react-router'
import { Headphones, ShieldCheck, Zap } from 'lucide-react'

import { AsmMark } from '@/components/home/AsmLogo'

const TRUST_POINTS = [
  { Icon: ShieldCheck, text: '100% SSL encrypted and secure' },
  { Icon: Zap,        text: 'Withdraw to UPI whenever your term closes' },
  { Icon: Headphones, text: 'Support on WhatsApp and email, every day' },
]

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-light-home flex min-h-[100dvh] flex-col font-jakarta text-asm-navy md:flex-row">

      {/* ── Left panel: brand (desktop) / top strip (mobile) ── */}
      <div className="relative flex w-full flex-col overflow-hidden bg-asm-blue p-6 md:w-[42%] md:p-10">
        {/* Subtle grid wash */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'repeating-linear-gradient(to right, rgba(255,255,255,0.055) 0 1px, transparent 1px 52px)',
              'repeating-linear-gradient(to bottom, rgba(255,255,255,0.055) 0 1px, transparent 1px 52px)',
            ].join(', '),
          }}
        />
        {/* Top-right orb */}
        <div aria-hidden className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10 flex flex-1 flex-col">
          {/* Logo */}
          <Link
            to="/"
            className="flex w-fit items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:rounded-lg"
          >
            <AsmMark className="size-9" />
            <div>
              <p className="text-[22px] font-extrabold tracking-tight text-white leading-none">ASM Coins</p>
              <p className="mt-0.5 text-[10px] tracking-[0.2em] uppercase text-white/55">Invest · Grow · Prosper</p>
            </div>
          </Link>

          {/* Headline + trust — desktop only */}
          <div className="my-auto hidden flex-col justify-center md:flex">
            <h2 className="font-display text-[34px] font-bold leading-[1.15] tracking-tight text-white">
              Smart returns.<br />Clear terms.<br />Your money,&nbsp;moving.
            </h2>
            <p className="mt-4 max-w-[290px] text-[14px] leading-relaxed text-white/65">
              Choose a plan, track your position, and withdraw to UPI when the term closes.
            </p>

            <ul className="mt-8 flex flex-col gap-3">
              {TRUST_POINTS.map(({ Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/15">
                    <Icon className="size-3.5 text-white" strokeWidth={2.2} aria-hidden />
                  </span>
                  <span className="text-[13px] leading-snug text-white/75">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-y-auto bg-white px-6 py-10 md:px-12">
        <div className="w-full max-w-md">
          {children}
        </div>

        <p className="mt-8 flex items-center gap-2 text-center text-[11px] text-asm-muted md:absolute md:bottom-6 md:mt-0">
          <svg className="size-3.5 shrink-0 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          ASM Coins is registered in India and complies with all regulatory standards.
        </p>
      </div>

    </div>
  )
}
