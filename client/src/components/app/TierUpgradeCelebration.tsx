import { AnimatePresence, motion } from 'framer-motion'
import type { CelebratableTier } from '@/hooks/useTierUpgrade'

import goldSvgRaw from '@/assets/Gold_tier.svg?raw'
import diamondSvgRaw from '@/assets/diamond_tier.svg?raw'

const SVG_RAW: Record<CelebratableTier, string> = {
  gold: goldSvgRaw,
  diamond: diamondSvgRaw,
}

const TIER_LABEL: Record<CelebratableTier, string> = {
  gold: 'Gold',
  diamond: 'Diamond',
}

const LABEL_CLASS: Record<CelebratableTier, string> = {
  gold: 'text-amber-300',
  diamond: 'text-sky-300',
}

const DIVIDER_CLASS: Record<CelebratableTier, string> = {
  gold: 'bg-amber-400/30',
  diamond: 'bg-sky-400/30',
}

const BENEFIT_VALUE_CLASS: Record<CelebratableTier, string> = {
  gold: 'text-amber-300',
  diamond: 'text-sky-300',
}

interface Benefit { label: string; value: string }

const TIER_BENEFITS: Record<CelebratableTier, Benefit[]> = {
  gold: [
    { label: 'Total Return',      value: '40% in 72h'  },
    { label: 'TDS on Withdrawal', value: '3% only'    },
    { label: 'Max Investment',   value: '₹3,00,000'   },
    { label: 'Min Investment',   value: '₹3,000'      },
    { label: 'Term',             value: '72 Hours'    },
  ],
  diamond: [
    { label: 'Daily Return',     value: '40% APY'     },
    { label: 'TDS on Withdrawal', value: 'Zero TDS'   },
    { label: 'Max Investment',   value: '₹5,00,000'   },
    { label: 'Min Investment',   value: '₹5,000'      },
    { label: 'Term',             value: '24 Hours'    },
  ],
}

/* ── Overlay ─────────────────────────────────────────────────────── */

function CelebrationContent({
  tier,
  onDismiss,
}: {
  tier: CelebratableTier
  onDismiss: () => void
}) {
  const benefits = TIER_BENEFITS[tier]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-y-auto bg-black/75 backdrop-blur-md"
      onClick={onDismiss}
      role="alertdialog"
      aria-modal="true"
      aria-label={`${TIER_LABEL[tier]} tier unlocked`}
    >
      <div
        className="flex w-full max-w-sm flex-col items-center px-6 py-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Animated badge — inline SVG so CSS @keyframes fire in every env */}
        <motion.div
          key={tier}
          style={{ width: 240, height: 240 }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="pointer-events-none shrink-0 select-none"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: SVG_RAW[tier] }}
        />

        {/* Tier name */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className="mt-1 flex flex-col items-center gap-0.5 text-center"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/40">
            Tier Unlocked
          </p>
          <p className={`text-[26px] font-extrabold tracking-tight ${LABEL_CLASS[tier]}`}>
            {TIER_LABEL[tier]} Member
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: 1, opacity: 1 }}
          transition={{ delay: 0.65, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          className={`my-5 h-px w-full origin-left ${DIVIDER_CLASS[tier]}`}
        />

        {/* Benefits */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.75, duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
          className="w-full space-y-3"
        >
          {benefits.map(({ label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 + i * 0.06, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
              className="flex items-center justify-between"
            >
              <span className="text-[13px] text-white/50">{label}</span>
              <span className={`text-[13px] font-bold ${BENEFIT_VALUE_CLASS[tier]}`}>{value}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Tap to continue button */}
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
          onClick={onDismiss}
          className={`mt-8 w-full rounded-xl py-3.5 text-[14px] font-bold tracking-wide text-black transition-opacity active:opacity-80 ${
            tier === 'gold'
              ? 'bg-amber-400'
              : 'bg-sky-400'
          }`}
        >
          Start Investing
        </motion.button>
      </div>
    </motion.div>
  )
}

/* ── Public component ────────────────────────────────────────────── */

export function TierUpgradeCelebration({
  tier,
  onDismiss,
}: {
  tier: CelebratableTier | null
  onDismiss: () => void
}) {
  return (
    <AnimatePresence>
      {tier !== null && (
        <CelebrationContent key={tier} tier={tier} onDismiss={onDismiss} />
      )}
    </AnimatePresence>
  )
}
