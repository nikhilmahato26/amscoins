import { apiFetch, ApiError, getToken } from '@/lib/api'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface PublicSettings {
  inrThresholdPaise: number
  inrQrUrl: string
  usdtTrc20Address: string
  usdtBep20Address: string
  usdtTrc20QrUrl: string
  usdtBep20QrUrl: string
  whatsappNumber: string
  telegramUsername: string
  usdtRateInr: number // INR value of 1 USDT — admin-configurable
  cycleDurationHours: number
  autoRejectHours: number
  autoDepositHours: number
  depositCooldownHours: number
  withdrawalCooldownHours: number // hours a user must wait between withdrawals (0 = off)
  autoRejectEnabled: boolean
  autoDepositEnabled: boolean
  autoPayEnabled: boolean
  methods: {
    usdtCrypto: boolean
    whatsapp: boolean
    telegram: boolean
    inrQr: boolean
  }
}

export type SettingsUpdate = Partial<
  Omit<
    PublicSettings,
    'inrQrUrl' | 'usdtTrc20QrUrl' | 'usdtBep20QrUrl' | 'methods'
  >
> & { methods?: Partial<PublicSettings['methods']> }

export type SettingsImageKey = 'inr-qr' | 'usdt-trc20-qr' | 'usdt-bep20-qr'

export async function getSettings(): Promise<PublicSettings> {
  const { settings } = await apiFetch<{ settings: PublicSettings }>('/settings')
  return settings
}

export async function updateSettings(input: SettingsUpdate): Promise<PublicSettings> {
  const { settings } = await apiFetch<{ settings: PublicSettings }>('/settings', {
    method: 'PUT',
    auth: true,
    body: input,
  })
  return settings
}

export async function uploadSettingsImage(
  key: SettingsImageKey,
  file: File
): Promise<PublicSettings> {
  const form = new FormData()
  form.append('file', file)

  const token = getToken()
  const res = await fetch(`${BASE}/settings/images/${key}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? res.statusText)
  }
  return (data as { settings: PublicSettings }).settings
}
