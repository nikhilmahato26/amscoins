export function inr(amount: number): string {
  // Assuming amount is in paise, convert to rupees for display
  const rupees = amount / 100
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(rupees)
}

export function pct(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function compact(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(amount)
}

export function timestamp(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
}

export interface PayoutSource {
  method?: 'upi' | 'bank'
  upiId?: string
  accountName?: string
  accountNumber?: string
  ifsc?: string
}

export interface PayoutView {
  method: 'upi' | 'bank'
  badge: string
  primary: string
  secondary?: string
  search: string
  sentence: string
}

/**
 * Derive a display view for a withdrawal payout destination. Falls back to
 * inferring the method from which fields are present so legacy rows (no
 * `method`) still render. The full account number is intentionally shown —
 * the admin needs it to execute the transfer.
 */
export function payoutView(w: PayoutSource): PayoutView {
  const method = w.method ?? (w.upiId ? 'upi' : 'bank')
  const search = [w.upiId, w.accountName, w.accountNumber, w.ifsc]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  if (method === 'upi') {
    const vpa = w.upiId ?? '—'
    return { method: 'upi', badge: 'UPI', primary: vpa, search, sentence: `via UPI ${vpa}` }
  }

  const acct = w.accountNumber ?? '—'
  const ifsc = w.ifsc ?? '—'
  return {
    method: 'bank',
    badge: 'BANK',
    primary: `${ifsc} · A/C ${acct}`,
    secondary: w.accountName,
    search,
    sentence: `to bank account ${acct} (IFSC ${ifsc}${w.accountName ? `, ${w.accountName}` : ''})`,
  }
}
