import type { AdminInvestment } from '@/services/api/admin'

export function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
}

export function fmtDuration(from: string, to: string) {
  const ms = new Date(to).getTime() - new Date(from).getTime()
  if (ms < 0) return '-'
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

/** Searchable fields for an investment row (name, email, reference, plan). */
export function investmentSearchFields(d: AdminInvestment) {
  return [d.user.name, d.user.email, d.referenceCode, d.planKey]
}
