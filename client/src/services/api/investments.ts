import { apiFetch, ApiError, getToken } from '@/lib/api'
import type { PlanKey } from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface Installment {
  day: number
  pct: number
  amount: number // paise
  status: 'scheduled' | 'available' | 'paid' | 'rejected'
  maturesAt: string
  creditedAt?: string
  rejectionReason?: string
  rejectedAt?: string
}

export interface Investment {
  _id: string
  planKey: PlanKey
  amount: number // paise
  returnPct: number
  installmentPcts: number[]
  expectedReturn: number // paise
  referenceCode: string
  status: 'pending' | 'active' | 'matured' | 'returned' | 'rejected' | 'deleted' | 'break_requested'
  installments?: Installment[]
  breakRequestedAt?: string
  creditedAmount?: number
  returnedAt?: string
  startAt?: string
  maturesAt?: string
  createdAt: string
  /** Proof-of-payment screenshot, uploaded from the pay screen. Empty until set. */
  paymentScreenshotUrl?: string
}

export interface CreateInvestmentInput {
  planKey: PlanKey
  amount: number
  referralCode?: string
}

export const createInvestment = (input: CreateInvestmentInput) =>
  apiFetch<{ investment: Investment; telegramLink: string; whatsappLink: string }>('/investments', { method: 'POST', body: input })

// Deposit gate — the server is the source of truth for whether a user may start
// a new deposit. `pending`: a deposit is awaiting admin approval. `cooldown`: a
// deposit was approved and the user must wait until `cooldownUntil` before the
// next one. `open`: free to deposit. Mirrors getDepositGate in investmentService.
export type DepositGate =
  | { status: 'open' }
  | { status: 'pending'; pendingInvestmentId: string; since: string }
  | { status: 'cooldown'; cooldownUntil: string }

export const getDepositGate = () => apiFetch<DepositGate>('/investments/deposit-gate')

// Called when the user taps "I've paid" on the pay screen — sends the deposit
// confirmation email and returns the support links for the confirmation page.
export const notifyPayment = (id: string) =>
  apiFetch<{ investment: Investment; telegramLink: string; whatsappLink: string }>(`/investments/${id}/notify`, { method: 'POST' })

export const getInvestments = () => apiFetch<Investment[]>('/investments')

export const getInvestment = (id: string) => apiFetch<Investment>(`/investments/${id}`)

/**
 * Upload a proof-of-payment screenshot for a pending deposit. Uses raw fetch
 * (not apiFetch) because the body is multipart FormData, which must not be
 * JSON-stringified or given a manual Content-Type — the browser sets the
 * multipart boundary itself.
 */
export async function uploadPaymentScreenshot(id: string, file: File): Promise<Investment> {
  const form = new FormData()
  form.append('file', file)

  const token = getToken()
  const res = await fetch(`${BASE}/investments/${id}/screenshot`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? res.statusText)
  }
  return (data as { investment: Investment }).investment
}

export const requestBreak = (id: string) =>
  apiFetch<Investment>(`/investments/${id}/break`, { method: 'POST' })
