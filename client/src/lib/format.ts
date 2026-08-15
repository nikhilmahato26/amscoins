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
