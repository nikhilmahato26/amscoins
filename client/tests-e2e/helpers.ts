/**
 * helpers.ts — API helper functions for arranging backend state in e2e tests.
 *
 * All requests go to the hermetic e2e server at http://localhost:4000/api
 * which uses in-memory MongoDB. Never touches real Atlas data.
 */

const API = 'http://localhost:4000/api'

export interface RegisterPayload {
  name: string
  email: string
  password: string
  referralCode?: string
}

export interface RegisterResult {
  user: { id: string; name: string; email: string; role: string; referralCode: string }
  token: string
}

export interface ReferralOverview {
  referralCode: string
  count: number
  referrals: { name: string; joinedAt: string; credited: boolean }[]
}

/** Fetch a user's referral overview (who they referred) using their token. */
export async function referralOverview(token: string): Promise<ReferralOverview> {
  const res = await fetch(`${API}/referral`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`referralOverview failed ${res.status}: ${body}`)
  }
  return res.json()
}

export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const res = await fetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`register failed ${res.status}: ${body}`)
  }
  return res.json()
}

export async function login(email: string, password: string): Promise<{ token: string; user: { id: string } }> {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`login failed ${res.status}: ${body}`)
  }
  return res.json()
}

export async function adminLogin(): Promise<string> {
  const data = await login('admin@e2e.test', 'admin123')
  return data.token
}

/** Create an investment via API and return the investment ID */
export async function createInvestment(
  userToken: string,
  planKey: string,
  amountPaise: number,
): Promise<{ id: string; referenceCode: string }> {
  const res = await fetch(`${API}/investments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify({ planKey, amount: amountPaise }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`createInvestment failed ${res.status}: ${body}`)
  }
  const data = await res.json()
  return { id: data.investment._id ?? data.investment.id, referenceCode: data.investment.referenceCode }
}

export async function approveDeposit(adminToken: string, investmentId: string): Promise<void> {
  const res = await fetch(`${API}/admin/investments/${investmentId}/approve`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`approveDeposit failed ${res.status}: ${body}`)
  }
}

/** Adjust wallet balance for a user (credit/debit) */
export async function adminAdjustWallet(
  adminToken: string,
  userId: string,
  paise: number,
  direction: 'credit' | 'debit' = 'credit',
  note = 'e2e test adjustment',
): Promise<void> {
  const res = await fetch(`${API}/admin/wallets/${userId}/adjust`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ amount: paise, direction, note }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`adminAdjustWallet failed ${res.status}: ${body}`)
  }
}

/** Generate a unique email for test isolation */
export function uniqueEmail(prefix = 'user'): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}@e2e.test`
}

/** Create a withdrawal via API with an inline destination; returns the created withdrawal. */
export async function createWithdrawal(
  userToken: string,
  body: {
    amount: number
    upiId?: string
    accountName?: string
    accountNumber?: string
    ifsc?: string
  },
): Promise<{ _id: string; net: number }> {
  const res = await fetch(`${API}/withdrawals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`,
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const b = await res.text()
    throw new Error(`createWithdrawal failed ${res.status}: ${b}`)
  }
  return res.json()
}
