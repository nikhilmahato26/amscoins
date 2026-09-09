/**
 * Community channel config. WhatsApp and Telegram prefer the admin-editable
 * "website settings" document (the same `whatsappNumber` / `telegramUsername`
 * used for payment/support links, see config/payment.ts) so an admin filling
 * those in from Admin → Settings shows up here without a redeploy. Instagram
 * has no DB field, so it stays on the build-time `VITE_COMMUNITY_*` env vars
 * — which also still work as a fallback for WhatsApp/Telegram when the DB
 * fields are empty.
 *
 * Env is read inside communityChannels() (not at module load) so the value is
 * always current — this also lets tests drive it with vi.stubEnv().
 */

import { deriveTelegram, deriveWhatsapp } from '@/config/payment'
import type { PublicSettings } from '@/services/api/settings'

export type CommunityChannelId = 'instagram' | 'whatsapp' | 'telegram'

export interface CommunityChannel {
  id: CommunityChannelId
  label: string
  description: string
  url: string
}

/** Accepts only a trimmed, non-empty http(s) URL; returns '' otherwise. */
function cleanUrl(raw: string | undefined): string {
  const v = (raw ?? '').trim()
  return /^https?:\/\//i.test(v) ? v : ''
}

const CHANNEL_META: Record<
  CommunityChannelId,
  { label: string; description: string; envKey: string }
> = {
  instagram: {
    label: 'Instagram',
    description: 'Follow for updates, wins and announcements.',
    envKey: 'VITE_COMMUNITY_INSTAGRAM_URL',
  },
  whatsapp: {
    label: 'WhatsApp Channel',
    description: 'Get instant alerts on your phone.',
    envKey: 'VITE_COMMUNITY_WHATSAPP_URL',
  },
  telegram: {
    label: 'Telegram Group',
    description: 'Chat with the community and the team.',
    envKey: 'VITE_COMMUNITY_TELEGRAM_URL',
  },
}

const ORDER: readonly CommunityChannelId[] = ['instagram', 'whatsapp', 'telegram']

/** The configured channels, in display order. Unset/invalid links are omitted. */
export function communityChannels(settings?: PublicSettings): CommunityChannel[] {
  const env = import.meta.env as Record<string, string | undefined>

  const dbUrl: Partial<Record<CommunityChannelId, string>> = settings
    ? {
        whatsapp: (() => {
          const { number } = deriveWhatsapp(settings)
          return number ? `https://wa.me/${number}` : ''
        })(),
        telegram: deriveTelegram(settings).url,
      }
    : {}

  return ORDER.flatMap((id) => {
    const meta = CHANNEL_META[id]
    const url = dbUrl[id] || cleanUrl(env[meta.envKey])
    if (!url) return []
    return [{ id, label: meta.label, description: meta.description, url }]
  })
}
