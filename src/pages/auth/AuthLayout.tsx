import React from 'react'
import { Link } from 'react-router'
import { SettlementTape } from '@/components/SettlementTape'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-ink text-foreground selection:bg-brass/20">
      
      {/* Left / Top side - Brand & Tape */}
      <div className="relative w-full md:w-[45%] flex flex-col bg-ink-2 p-6 md:p-12 overflow-hidden border-b md:border-b-0 md:border-r border-ink-3">
        {/* Abstract bg glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-64 bg-brass/10 blur-[100px] rounded-full mix-blend-screen pointer-events-none" />
        
        <div className="flex-1 flex flex-col relative z-10">
          <Link to="/" className="flex items-center gap-3 w-fit mb-6 md:mb-12">
            <svg viewBox="0 0 40 40" className="w-10 h-10" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M20 0L40 40H0L20 0Z" fill="url(#paint0_linear)"/>
              <path d="M20 8L36 40H4L20 8Z" fill="#000000"/>
              <path d="M20 16L30.5 37H9.5L20 16Z" fill="url(#paint1_linear)"/>
              <defs>
                <linearGradient id="paint0_linear" x1="20" y1="0" x2="20" y2="40" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#8A33D7"/>
                  <stop offset="1" stopColor="#F59E0B"/>
                </linearGradient>
                <linearGradient id="paint1_linear" x1="20" y1="16" x2="20" y2="37" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#F59E0B"/>
                  <stop offset="1" stopColor="#FBBF24"/>
                </linearGradient>
              </defs>
            </svg>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-paper leading-none">ASM COINS</h1>
              <p className="text-[10px] tracking-[0.2em] text-mist uppercase mt-1">Invest • Grow • Prosper</p>
            </div>
          </Link>
          
          {/* The tape is a wide decorative graphic, so it stays desktop-only. */}
          <div className="mt-auto hidden md:block">
            <SettlementTape className="h-[300px] opacity-60" />
          </div>

          {/*
            The demo credentials used to be desktop-only, which left anyone
            testing on a phone with no way in. There is no backend, so they are
            the only way to sign in on any screen size.
          */}
          <div className="mt-4 p-4 border border-ink-3 rounded bg-ink/50 backdrop-blur-sm md:mt-12">
            <p className="font-data text-xs text-mist/70 mb-2">DEMO ACCOUNTS (No backend required)</p>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between gap-3"><span className="text-mist">investor@taksal.in</span><span className="text-paper">taksal123</span></div>
              <div className="flex justify-between gap-3"><span className="text-mist">admin@taksal.in</span><span className="text-paper">admin123</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Right / Bottom side - Forms */}
      <div className="flex-1 flex flex-col p-6 md:p-12 overflow-y-auto items-center justify-center relative">
        <div className="w-full max-w-md mx-auto">
          {children}
        </div>

        {/*
          Static on mobile. Absolutely positioned, it sat on top of the form
          once the on-screen keyboard shrank the viewport.
        */}
        <div className="mt-8 flex items-center justify-center gap-2 text-center text-xs text-mist md:absolute md:bottom-6 md:mt-0 md:text-left">
          <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <p>ASM Coins is registered in India and complies with all regulatory standards.</p>
        </div>
      </div>

    </div>
  )
}
