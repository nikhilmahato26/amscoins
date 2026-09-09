/**
 * Format an integer-paise index price as a rupee string with two decimals.
 * Returns the number only — callers supply the ₹ symbol so they control
 * spacing and styling.
 */
export function formatCoinPrice(paise: number): string {
  return (paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Format a signed percentage, e.g. "+2.41%" / "-0.80%". */
export function formatCoinChange(pct: number): string {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}
