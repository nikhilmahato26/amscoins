import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { ExternalLink, Users } from 'lucide-react'

import { AppShell } from '@/components/app/AppShell'
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from '@/components/app/icons'
import { communityChannels } from '@/config/community'
import type { CommunityChannelId } from '@/config/community'

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 90, damping: 18 } },
}

const ICON: Record<CommunityChannelId, (props: { className?: string }) => ReactNode> = {
  instagram: InstagramIcon,
  whatsapp: WhatsAppIcon,
  telegram: TelegramIcon,
}

// Per-channel accent classes (bg tint + icon color), kept inline so no new tokens are needed.
const ACCENT: Record<CommunityChannelId, string> = {
  instagram: 'bg-pink-50 text-pink-600',
  whatsapp: 'bg-asm-green-tint text-asm-greenInk',
  telegram: 'bg-asm-blue-tint text-asm-blue',
}

export function CommunityPage() {
  const channels = communityChannels()

  return (
    <AppShell backTo="/app">
      <motion.div className="flex flex-col gap-5" variants={container} initial="hidden" animate="visible">

        {/* Header */}
        <motion.div variants={fadeUp} className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-asm-blue-tint text-asm-blue">
            <Users className="size-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-[18px] font-extrabold tracking-tight text-asm-navy">Community</h1>
            <p className="text-[12px] text-asm-body">Join our channels to stay in the loop and connect.</p>
          </div>
        </motion.div>

        {/* Channel cards */}
        {channels.length === 0 ? (
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center gap-2 rounded-2xl border border-asm-line bg-white px-5 py-10 text-center shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)]"
          >
            <Users className="size-8 text-asm-muted/40" aria-hidden />
            <p className="text-[13px] font-semibold text-asm-navy">Community links coming soon</p>
            <p className="text-[12px] text-asm-body">Check back shortly — we're setting up our channels.</p>
          </motion.div>
        ) : (
          <div className="flex flex-col gap-3">
            {channels.map((c) => {
              const Icon = ICON[c.id]
              return (
                <motion.a
                  key={c.id}
                  variants={fadeUp}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-4 rounded-2xl border border-asm-line bg-white p-4 shadow-[0_2px_12px_-4px_rgba(16,42,92,0.08)] transition-shadow hover:shadow-[0_6px_20px_-6px_rgba(16,42,92,0.16)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-asm-blue"
                >
                  <span className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${ACCENT[c.id]}`}>
                    <Icon className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-bold text-asm-navy">{c.label}</span>
                    <span className="block truncate text-[12px] text-asm-body">{c.description}</span>
                  </span>
                  <ExternalLink className="size-4 shrink-0 text-asm-muted transition-colors group-hover:text-asm-blue" aria-hidden />
                </motion.a>
              )
            })}
          </div>
        )}

      </motion.div>
    </AppShell>
  )
}
