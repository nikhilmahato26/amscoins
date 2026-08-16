export type Role = 'user' | 'admin'
export type Tier = 'silver' | 'gold' | 'diamond'
export type PayoutType = 'upi' | 'bank'

/** A saved payout destination on the user's profile. */
export interface PayoutMethod {
  id: string
  type: PayoutType
  label: string
  upiId: string | null
  accountName: string | null
  accountNumber: string | null
  ifsc: string | null
  isDefault: boolean
}

/** Matches the backend `user.toPublic()` payload — no password client-side. */
export interface User {
  id: string
  publicId: string | null
  name: string
  email: string
  phone: string | null
  avatar: string | null
  role: Role
  status: 'active' | 'frozen'
  referralCode: string
  referralCount: number
  tier: Tier
  payoutMethods: PayoutMethod[]
  createdAt: string
}

export interface Wallet {
  userId: string
  balance: number           // INR, paise as integer to avoid float drift
}

export interface Coin {
  id: string
  symbol: string            // BTC
  name: string              // Bitcoin
  price: number
  change24h: number         // percent, signed
  spark: number[]           // 7d points for the sparkline
}

export interface Holding {
  userId: string
  coinId: string
  quantity: number
  avgBuyPrice: number
}

export interface Order {
  id: string
  userId: string
  coinId: string
  side: 'buy' | 'sell'
  quantity: number
  price: number             // price at execution
  createdAt: string
}

/** Matches the backend ledger shape exactly — amount is in paise. */
export interface Transaction {
  _id: string
  user: string
  type: 'deposit' | 'withdrawal' | 'refund' | 'adjustment'
  direction: 'credit' | 'debit'
  amount: number            // paise
  status: 'pending' | 'settled' | 'rejected'
  note: string
  actor: 'user' | 'admin' | 'system'
  createdAt: string
}
