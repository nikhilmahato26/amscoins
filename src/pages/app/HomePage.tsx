import { motion } from 'framer-motion'
import { Link } from 'react-router'

// vault.png lives in /public — referenced as an absolute URL, no import needed
import { AppShell } from '@/components/app/AppShell'
import { MarketTicker } from '@/components/app/MarketTicker'
import { ReferralBanner } from '@/components/app/ReferralBanner'
import { TierBadge, type Tier } from '@/components/app/TierBadge'
import { cn } from '@/lib/utils'

/* ── Framer Motion variants ─────────────────────────────────────── */

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.05 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 90, damping: 18 },
  },
}

/* ── Data ───────────────────────────────────────────────────────── */


const PLANS: { tier: Tier; name: string; returns: string; duration: string; min: string; max: string }[] = [
  { tier: 'silver',  name: 'Silver',  returns: '25%', duration: '36 Hours', min: '₹1,000', max: '₹50,000'   },
  { tier: 'gold',    name: 'Gold',    returns: '30%', duration: '36 Hours', min: '₹3,000', max: '₹50,000'   },
  { tier: 'diamond', name: 'Diamond', returns: '40%', duration: '36 Hours', min: '₹5,000', max: '₹5,00,000' },
]

/* ── Page ───────────────────────────────────────────────────────── */

export function HomePage() {
  return (
    <AppShell headerVariant="root" width="wide" contentClassName="px-0 pt-[68px]">
      <motion.div
        className="flex flex-col"
        variants={container}
        initial="hidden"
        animate="visible"
      >

        {/* ── Hero ── */}
        <section className="flex flex-col px-5 pb-6 pt-5">

          {/* Live price pill */}
          <motion.div variants={fadeUp} className=" mb-3 self-start">
            <div className="inline-flex items-center gap-2 rounded-full border border-asm-greenInk/20 bg-asm-green-tint px-3.5 py-1.5">
              <span className="relative flex size-[7px] shrink-0">
                <span className="absolute inline-flex h-full w-full animate-[live-pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite] rounded-full bg-asm-greenInk opacity-60" />
                <span className="relative inline-flex size-[7px] rounded-full bg-asm-greenInk" />
              </span>
              <span className="font-jakarta text-[11px] font-bold uppercase tracking-[0.14em] text-asm-greenInk">
                Live · ASM COIN ₹12,850
              </span>
            </div>
          </motion.div>

         
          {/* Stat cards */}
          {/* <motion.div variants={fadeUp} className="mt-2 grid w-full max-w-sm grid-cols-2 gap-2">
            {STATS.map(({ label, value, Icon, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-2xl border border-asm-line bg-white px-4 py-3 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.1)]"
              >
                <span
                  className={cn(
                    'flex size-10 shrink-0 items-center justify-center rounded-xl',
                    color === 'blue' ? 'bg-asm-blue-tint' : 'bg-asm-green-tint'
                  )}
                >
                  <Icon
                    className={cn(
                      'size-[18px]',
                      color === 'blue' ? 'text-asm-blue' : 'text-asm-greenInk'
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-asm-muted">
                    {label}
                  </span>
                  <span className="mt-0.5 font-mono text-[18px] font-bold tabular-nums leading-none text-asm-navy">
                    {value}
                  </span>
                </div>
              </div>
            ))}
          </motion.div> */}

          {/* Hero coin image — gentle float, full-width */}
          <motion.div
            variants={fadeUp}
            className="relative mt-2 w-full max-w-[420px] self-center"
          >
            <div
              aria-hidden
              className="absolute inset-0 -z-0 mx-auto rounded-full"
              style={{
                background: 'radial-gradient(circle at 50% 55%, rgba(21,128,61,0.07) 0%, transparent 72%)',
              }}
            />
            <motion.img
              src="/vault.png"
              alt=""
              className="relative w-full object-contain drop-shadow-[0_12px_40px_rgba(21,128,61,0.15)]"
              fetchPriority="high"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
            />
          </motion.div>

           {/* Subtitle */}
          <motion.p variants={fadeUp} className="mt-2 max-w-[310px] text-[15px] leading-relaxed text-asm-body">
            Up to{' '}
            <span className="font-bold text-asm-greenInk">40% returns</span>
            {' '}in 36 hours.{' '}
            <span className="font-semibold text-asm-navy">ASM COIN</span> is where smart money moves.
          </motion.p>


          {/* Feature badges */}
          <motion.div
            variants={fadeUp}
            className="mt-1 w-full max-w-sm self-center rounded-2xl border border-asm-line bg-white px-2 py-4 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]"
          >
            <div className="flex items-stretch divide-x divide-asm-line">

              {/* Secure */}
              <div className="flex flex-1 flex-col items-center gap-1.5 px-2">
                <svg viewBox="0 0 24 24" className="size-7 text-asm-blue" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
                <span className="text-[13px] font-bold text-asm-blue">Secure</span>
                <span className="text-center text-[10px] leading-tight text-asm-body">100% Safe &amp; Trusted</span>
              </div>

              {/* Grow */}
              <div className="flex flex-1 flex-col items-center gap-1.5 px-2">
                <svg viewBox="0 0 24 24" className="size-7 text-asm-greenInk" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
                <span className="text-[13px] font-bold text-asm-greenInk">Grow</span>
                <span className="text-center text-[10px] leading-tight text-asm-body">High Returns Growth</span>
              </div>

              {/* Prosper */}
              <div className="flex flex-1 flex-col items-center gap-1.5 px-2">
                <svg viewBox="0 0 24 24" className="size-7 text-asm-blue" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
                </svg>
                <span className="text-[13px] font-bold text-asm-blue">Prosper</span>
                <span className="text-center text-[10px] leading-tight text-asm-body">Build Wealth For Future</span>
              </div>

            </div>
          </motion.div>
        </section>

        {/* ── Market Snapshot ── */}
        <motion.section variants={fadeUp} className="px-5 pb-6">
          <MarketTicker />
        </motion.section>

        {/* ── Investment Plans ── */}
        <motion.section variants={fadeUp} className="px-5 pb-8">
          <h2 className="mb-4 text-[18px] font-extrabold tracking-tight text-asm-navy">
            Investment Packages
          </h2>
          <div className="flex flex-col gap-4 sm:grid sm:grid-cols-3">
            {PLANS.map((plan) => (
              <PlanCard key={plan.tier} {...plan} />
            ))}
          </div>
          <p className="mt-4 px-1 text-center text-[11px] leading-relaxed text-asm-muted">
            Returns shown are plan terms, not guarantees.{' '}
            <span className="text-asm-body">Read the full terms before you invest.</span>
          </p>
        </motion.section>

        {/* ── Referral ── */}
        <motion.section variants={fadeUp} className="px-5 pb-8">
          <ReferralBanner />
        </motion.section>

      </motion.div>
    </AppShell>
  )
}

/* ── Plan card ── */

/**
 * Per-tier accent styles.
 * Silver: neutral steel tones.
 * Gold: amber — the warmth of the metal.
 * Diamond: asm-blue — premium, trust-leading.
 */
const PLAN_STYLE: Record<Tier, {
  ring: string
  figure: string
  btn: string
  glow: string
}> = {
  silver: {
    ring:   'ring-1 ring-[#CED5E1]',
    figure: 'text-[#868B95]',
    btn:    'bg-[#868B95] hover:bg-[#6b6f78]',
    glow:   'rgba(134,139,149,0.12)',
  },
  gold: {
    ring:   'ring-1 ring-[#FF9E45]/50',
    figure: 'text-[#F37400]',
    btn:    'bg-[#F37400] hover:bg-[#d96800]',
    glow:   'rgba(243,116,0,0.12)',
  },
  diamond: {
    ring:   'ring-1 ring-asm-blue/30',
    figure: 'text-asm-blue',
    btn:    'bg-asm-blue hover:bg-asm-blue-dark',
    glow:   'rgba(11,79,216,0.12)',
  },
}

function PlanCard({
  tier,
  name,
  returns,
  duration,
  min,
  max,
}: {
  tier: Tier
  name: string
  returns: string
  duration: string
  min: string
  max: string
}) {
  const s = PLAN_STYLE[tier]
  return (
    <motion.article
      whileHover={{
        y: -6,
        boxShadow: `0 20px 40px -12px ${s.glow}, 0 4px 16px -4px rgba(16,42,92,0.10)`,
      }}
      transition={{ type: 'spring' as const, stiffness: 380, damping: 28 }}
      className={cn(
        'flex flex-col items-center rounded-2xl bg-white px-5 py-5',
        'shadow-[0_2px_16px_-4px_rgba(16,42,92,0.08)]',
        s.ring
      )}
    >
      <TierBadge tier={tier} size={88} />

      <div className="mt-3 flex flex-col items-center gap-0.5">
        <span className={cn('text-[32px] font-extrabold leading-none tabular-nums', s.figure)}>
          {returns}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-asm-muted">Returns</span>
      </div>

      <div className="mt-3 flex flex-col items-center gap-0.5">
        <span className="text-[10px] font-bold uppercase tracking-widest text-asm-muted">Duration</span>
        <span className="text-[15px] font-bold text-asm-navy">{duration}</span>
      </div>

      <div className="mt-3 flex w-full items-stretch justify-between rounded-xl bg-asm-tint px-4 py-2.5">
        <span className="flex flex-col">
          <span className="text-[9px] font-bold uppercase tracking-widest text-asm-muted">Min</span>
          <span className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-asm-navy">{min}</span>
        </span>
        <span className="w-px self-stretch bg-asm-line" />
        <span className="flex flex-col items-end">
          <span className="text-[9px] font-bold uppercase tracking-widest text-asm-muted">Max</span>
          <span className="mt-0.5 font-mono text-[14px] font-bold tabular-nums text-asm-navy">{max}</span>
        </span>
      </div>

      <Link
        to={`/app/invest?plan=${tier}`}
        aria-label={`Invest in the ${name} package`}
        className={cn(
          'mt-3 flex min-h-[44px] w-full items-center justify-center rounded-xl',
          'text-[12px] font-bold uppercase tracking-[0.08em] text-white',
          'transition-colors active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue focus-visible:ring-offset-1',
          s.btn
        )}
      >
        Invest Now
      </Link>
    </motion.article>
  )
}
