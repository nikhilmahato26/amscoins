import { apiFetch } from '@/lib/api'

export interface SupportTicket {
  id: string
  publicRef: string
  subject: string
  message: string
  status: 'open' | 'resolved'
  adminNote: string
  resolvedAt: string | null
  createdAt: string
}

export interface AdminSupportTicket extends SupportTicket {
  user: { id: string; name: string; email: string; publicId: string | null } | null
}

// ── User ──
export const createSupportTicket = (input: { subject: string; message: string }) =>
  apiFetch<{ ticket: SupportTicket }>('/support', { method: 'POST', body: input })

export const getMySupportTickets = () => apiFetch<{ tickets: SupportTicket[] }>('/support/mine')

// ── Admin ──
export const adminSupport = (status?: string) =>
  apiFetch<AdminSupportTicket[]>(`/admin/support${status ? `?status=${status}` : ''}`)

export const resolveSupport = (id: string, adminNote?: string) =>
  apiFetch<SupportTicket>(`/admin/support/${id}/resolve`, { method: 'POST', body: { adminNote } })
