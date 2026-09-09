import { afterEach, describe, expect, it, vi } from 'vitest'

import { communityChannels } from './community'
import type { PublicSettings } from '@/services/api/settings'

const settings = (over: Partial<PublicSettings> = {}): PublicSettings => ({
  inrThresholdPaise: 0,
  inrQrUrl: '',
  usdtTrc20Address: '',
  usdtBep20Address: '',
  usdtTrc20QrUrl: '',
  usdtBep20QrUrl: '',
  whatsappNumber: '',
  telegramUsername: '',
  usdtRateInr: 0,
  cycleDurationHours: 0,
  autoRejectHours: 0,
  autoDepositHours: 0,
  depositCooldownHours: 0,
  withdrawalCooldownHours: 0,
  autoRejectEnabled: false,
  autoDepositEnabled: false,
  autoPayEnabled: false,
  methods: { usdtCrypto: false, whatsapp: false, telegram: false, inrQr: false },
  ...over,
})

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

  it('prefers the DB-backed telegramUsername/whatsappNumber over env URLs', () => {
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', 'https://whatsapp.com/channel/env')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/env')

    const result = communityChannels(settings({ whatsappNumber: '919999999999', telegramUsername: 'asmcoins_support' }))

    expect(result.find((c) => c.id === 'telegram')?.url).toBe('https://t.me/asmcoins_support')
    expect(result.find((c) => c.id === 'whatsapp')?.url).toBe('https://wa.me/919999999999')
  })

  it('falls back to the env URL when the DB field is unset', () => {
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', 'https://t.me/env-fallback')

    const result = communityChannels(settings({ telegramUsername: '' }))

    expect(result.find((c) => c.id === 'telegram')?.url).toBe('https://t.me/env-fallback')
  })

  it('shows Telegram/WhatsApp from settings even with no env vars configured at all', () => {
    vi.stubEnv('VITE_COMMUNITY_INSTAGRAM_URL', '')
    vi.stubEnv('VITE_COMMUNITY_WHATSAPP_URL', '')
    vi.stubEnv('VITE_COMMUNITY_TELEGRAM_URL', '')

    const result = communityChannels(settings({ whatsappNumber: '919999999999', telegramUsername: 'asmcoins_support' }))

    expect(result.map((c) => c.id)).toEqual(['whatsapp', 'telegram'])
  })
})
