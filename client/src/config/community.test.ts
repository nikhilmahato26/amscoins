import { afterEach, describe, expect, it, vi } from 'vitest'

import { communityChannels } from './community'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('communityChannels', () => {
  it('returns configured channels in Instagram → WhatsApp → Telegram order', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', 'https://instagram.com/asm')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', 'https://whatsapp.com/channel/x')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    const result = communityChannels()

    expect(result.map((c) => c.id)).toEqual(['instagram', 'whatsapp', 'telegram'])
    expect(result[0].url).toBe('https://instagram.com/asm')
  })

  it('omits channels whose URL is empty or whitespace', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '   ')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    expect(communityChannels().map((c) => c.id)).toEqual(['telegram'])
  })

  it('omits channels whose URL is not http(s)', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', 'javascript:alert(1)')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', 'instagram.com/no-scheme')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/asm')

    expect(communityChannels().map((c) => c.id)).toEqual(['telegram'])
  })

  it('returns an empty array when nothing is configured', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', '')

    expect(communityChannels()).toEqual([])
  })
})
