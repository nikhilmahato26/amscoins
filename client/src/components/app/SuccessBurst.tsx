import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Animated success icon for confirmation screens.
 * Uses a spring pop on mount; degrades to a static icon under reduced-motion.
 */
export function SuccessBurst({ className }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
      className={cn('relative mx-auto flex items-center justify-center', className)}
    >
      {/* Halo ring — radiates outward once */}
      <motion.span
        aria-hidden
        initial={{ opacity: 0.6, scale: 0.6 }}
        animate={{ opacity: 0, scale: 2.2 }}
        transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
        className="absolute inset-0 rounded-full bg-asm-greenInk/20"
      />
      {/* Soft ambient glow */}
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-asm-green-tint"
      />
      <CheckCircle2
        className="relative size-14 text-asm-greenInk drop-shadow-[0_4px_12px_rgba(21,128,61,0.30)]"
        strokeWidth={1.8}
      />
    </motion.div>
  )
}
