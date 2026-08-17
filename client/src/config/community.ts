/**
 * Community channel config, sourced from build-time env (VITE_COMMUNITY_*).
 * Mirrors the derive/isConfigured shape of config/payment.ts: env is the source
 * of truth, and unset/invalid links are simply omitted so the UI never renders
 * a dead card.
 *
 * Env is read inside communityChannels() (not at module load) so the value is
 * always current — this also lets tests drive it with vi.stubEnv().
 */

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
export function communityChannels(): CommunityChannel[] {
  const env = import.meta.env as Record<string, string | undefined>
  return ORDER.flatMap((id) => {
    const meta = CHANNEL_META[id]
    const url = cleanUrl(env[meta.envKey])
    if (!url) return []
    return [{ id, label: meta.label, description: meta.description, url }]
  })
}
