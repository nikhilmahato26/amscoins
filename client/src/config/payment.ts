/**
 * Where a deposit actually goes.
 *
 * Every handle a user sends money to now lives in the shared "website settings"
 * document (see server `Settings` model), fetched at runtime via `useSettings`.
 * These pure helpers derive the UI-facing payment shapes from that fetched
 * `PublicSettings` — no build-time env, so an admin can rotate a wallet or swap
 * a QR without a redeploy.
 */

import type { PublicSettings } from '@/services/api/settings'

export type PaymentMethodId = 'trust-wallet' | 'binance-pay' | 'whatsapp' | 'telegram'
export type UsdtNetwork = 'TRC20' | 'BEP20'

export interface UsdtWallet {
  network: UsdtNetwork
  chain: string
  address: string
  /** Cloudinary URL; may be empty — callers tolerate a missing image. */
  qr: string
}

const read = (value: string | undefined) => (value ?? '').trim()

/**
 * Only networks with a configured address are offered. Listing a chain we
 * cannot receive on is worse than not listing it — the money is unrecoverable.
 */
export function deriveUsdtWallets(s: PublicSettings): UsdtWallet[] {
  return (
    [
      {
        network: 'TRC20' as const,
        chain: 'Tron (TRC20)',
        address: read(s.usdtTrc20Address),
        qr: s.usdtTrc20QrUrl,
      },
      {
        network: 'BEP20' as const,
        chain: 'BNB Smart Chain (BEP20)',
        address: read(s.usdtBep20Address),
        qr: s.usdtBep20QrUrl,
      },
    ] satisfies UsdtWallet[]
  ).filter((w) => w.address.length > 0)
}

export function deriveBinancePay(s: PublicSettings) {
  return {
    id: read(s.binancePayId),
    name: read(s.binancePayName) || 'ASM Coins',
    link: read(s.binancePayLink),
    qr: s.binancePayQrUrl,
  }
}

export function deriveWhatsapp(s: PublicSettings) {
  const number = read(s.whatsappNumber).replace(/\D/g, '')
  return { number, display: number ? `+${number}` : '' }
}

export function deriveTelegram(s: PublicSettings) {
  const username = read(s.telegramUsername).replace(/^@/, '')
  return {
    username,
    display: username ? `@${username}` : '',
    url: username ? `https://t.me/${username}` : '',
  }
}

/**
 * WhatsApp supports a prefilled body; Telegram person-chats do not (only bots
 * take `?start=`), which is why the Telegram path offers a copy button instead.
 */
export function whatsappUrl(s: PublicSettings, message: string): string {
  const { number } = deriveWhatsapp(s)
  if (!number) return ''
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`
}

/** True when the method is enabled AND has enough configuration to be usable. */
export function isMethodConfigured(s: PublicSettings, method: PaymentMethodId): boolean {
  switch (method) {
    case 'trust-wallet':
      return s.methods.trustWallet && deriveUsdtWallets(s).length > 0
    case 'binance-pay':
      return s.methods.binancePay && deriveBinancePay(s).id.length > 0
    case 'whatsapp':
      return s.methods.whatsapp && deriveWhatsapp(s).number.length > 0
    case 'telegram':
      return s.methods.telegram && deriveTelegram(s).username.length > 0
  }
}
