'use strict'

// Per-tier withdrawal caps, in paise. Mirrored client-side in WithdrawPage.tsx.
const WITHDRAWAL_LIMIT_PAISE = {
  silver: 3000000, // ₹30,000
  gold: 5000000, // ₹50,000
  diamond: 10000000, // ₹1,00,000
}

function withdrawalLimitFor(tier) {
  return WITHDRAWAL_LIMIT_PAISE[tier] ?? WITHDRAWAL_LIMIT_PAISE.silver
}

module.exports = { WITHDRAWAL_LIMIT_PAISE, withdrawalLimitFor }
