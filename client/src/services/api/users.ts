import { apiFetch, ApiError, getToken } from '@/lib/api'
import type { PayoutType, User } from '@/types'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

export interface UpdateProfileInput {
  name?: string
  phone?: string
}

/** PATCH the signed-in user's editable profile fields. */
export const updateProfile = (input: UpdateProfileInput) =>
  apiFetch<{ user: User }>('/users/me', { method: 'PATCH', body: input })

export interface PayoutMethodInput {
  type: PayoutType
  label?: string
  upiId?: string
  accountName?: string
  accountNumber?: string
  ifsc?: string
  isDefault?: boolean
}

/** Payout-method management — each call returns the updated user. */
export const addPayoutMethod = (input: PayoutMethodInput) =>
  apiFetch<{ user: User }>('/users/me/payout-methods', { method: 'POST', body: input })

export const deletePayoutMethod = (id: string) =>
  apiFetch<{ user: User }>(`/users/me/payout-methods/${id}`, { method: 'DELETE' })

export const setDefaultPayoutMethod = (id: string) =>
  apiFetch<{ user: User }>(`/users/me/payout-methods/${id}/default`, { method: 'PATCH' })

/** Tells the server the tier celebration has been seen — persists across devices. */
export const markCelebrationSeen = () =>
  apiFetch<{ celebrationSeenTier: string }>('/users/me/celebration-seen', { method: 'POST' })

/**
 * Upload a profile photo. Uses raw fetch (not apiFetch) because the body is
 * multipart FormData, which must not be JSON-stringified or given a manual
 * Content-Type — the browser sets the multipart boundary itself.
 */
export async function uploadAvatar(file: File): Promise<{ user: User }> {
  const form = new FormData()
  form.append('file', file)

  const token = getToken()
  const res = await fetch(`${BASE}/users/me/avatar`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    throw new ApiError(res.status, (data as { error?: string } | null)?.error ?? res.statusText)
  }
  return data as { user: User }
}
