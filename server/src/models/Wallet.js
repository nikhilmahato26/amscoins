const { Schema, model } = require('mongoose')

const walletSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
    balance: { type: Number, default: 0 }, // paise
    // The slice of `balance` that arrived as an ASM Coin return. ASM Coin
    // withdrawals are TDS-free, so this rides along as a sub-balance rather
    // than being re-derived from transaction history at withdrawal time.
    // Invariant: 0 <= tdsExemptPaise <= balance, held by walletService.
    tdsExemptPaise: { type: Number, default: 0 }, // paise
  },
  { timestamps: true }
)

module.exports = model('Wallet', walletSchema)
