/**
 * Where a deposit actually goes.
 *
 * Every handle a user sends money to — the two USDT wallet addresses, the
 * Binance Pay ID, and the two INR support contacts — is configuration, not
 * code. It lives in the environment so a rotated wallet or a new support
 * number is a redeploy of config rather than an edit to a component.
 *
 * QR codes are the one exception: they are images, not strings, so they sit in
 * `public/payment/` and are referenced by path below. A missing file is not an
 * error — the UI falls back to the copyable address.
 */

export type PaymentMethodId = 'trust-wallet' | 'binance-pay' | 'whatsapp' | 'telegram'

export type UsdtNetwork = 'TRC20' | 'BEP20'

export interface UsdtWallet {
  network: UsdtNetwork
  /** Human label for the chain, e.g. "Tron (TRC20)". */
  chain: string
  address: string
  /** Path under `public/`; may not exist, callers must tolerate a 404. */
  qr: string
}

const read = (value: string | undefined) => (value ?? '').trim()

const env = import.meta.env

/* ── USDT (crypto) ──────────────────────────────────────────────── */

/**
 * Only networks with a configured address are offered. Listing a chain we
 * cannot receive on is worse than not listing it — the money is unrecoverable.
 */
export const usdtWallets: UsdtWallet[] = (
  [
    {
      network: 'TRC20',
      chain: 'Tron (TRC20)',
      address: read(env.VITE_USDT_TRC20_ADDRESS),
      qr: '/payment/usdt-trc20.png',
    },
    {
      network: 'BEP20',
      chain: 'BNB Smart Chain (BEP20)',
      address: read(env.VITE_USDT_BEP20_ADDRESS),
      qr: '/payment/usdt-bep20.png',
    },
  ] satisfies UsdtWallet[]
).filter((wallet) => wallet.address.length > 0)

export const binancePay = {
  /** Binance Pay ID (numeric) or the account's pay nickname. */
  id: read(env.VITE_BINANCE_PAY_ID),
  /** Display name shown so the payer can confirm they hit the right account. */
  name: read(env.VITE_BINANCE_PAY_NAME) || 'ASM Coins',
  /** Optional `app.binance.com` deep link; the button is hidden when unset. */
  link: read(env.VITE_BINANCE_PAY_LINK),
  qr: '/payment/binance-pay.png',
}

/* ── INR (fiat) ─────────────────────────────────────────────────── */

/** Digits only, country code included — `wa.me` rejects `+`, spaces and dashes. */
const whatsappNumber = read(env.VITE_WHATSAPP_NUMBER).replace(/\D/g, '')

export const whatsapp = {
  number: whatsappNumber,
  /** Pretty form for display: `+91 98765 43210`. */
  display: whatsappNumber ? `+${whatsappNumber}` : '',
}

/** Stored without the leading `@`; both forms are accepted in the env value. */
const telegramUsername = read(env.VITE_TELEGRAM_USERNAME).replace(/^@/, '')

export const telegram = {
  username: telegramUsername,
  display: telegramUsername ? `@${telegramUsername}` : '',
  url: telegramUsername ? `https://t.me/${telegramUsername}` : '',
}

/* ── Links ──────────────────────────────────────────────────────── */

/**
 * WhatsApp supports a prefilled body, so the user does not have to retype the
 * reference code. Telegram has no equivalent for a chat with a person, which is
 * why the Telegram path offers a copy button instead — see `PaymentMethodPage`.
 */
export function whatsappUrl(message: string): string {
  if (!whatsapp.number) return ''
  return `https://wa.me/${whatsapp.number}?text=${encodeURIComponent(message)}`
}

/** True when the method has enough configuration to be usable. */
export function isMethodConfigured(method: PaymentMethodId): boolean {
  switch (method) {
    case 'trust-wallet':
      return usdtWallets.length > 0
    case 'binance-pay':
      return binancePay.id.length > 0
    case 'whatsapp':
      return whatsapp.number.length > 0
    case 'telegram':
      return telegram.username.length > 0
  }
}
