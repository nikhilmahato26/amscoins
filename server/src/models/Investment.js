const { Schema, model } = require('mongoose')

const investmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planKey: { type: String, enum: ['silver', 'gold', 'diamond'], required: true },
    amount: { type: Number, required: true }, // paise
    returnPct: { type: Number, required: true },
    expectedReturn: { type: Number, required: true }, // paise
    referenceCode: { type: String, required: true, unique: true },
    referralCodeUsed: { type: String, default: null },
    isFirstDeposit: { type: Boolean, default: false },
    status: { type: String, enum: ['pending', 'active', 'matured', 'returned', 'rejected'], default: 'pending' },
    startAt: { type: Date },
    maturesAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    walletCredited: { type: Boolean, default: false },
    maturedAt: { type: Date },
    creditedAmount: { type: Number, default: 0 }, // paise actually paid to wallet
    returnDecidedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // null = system
    returnDecidedAt: { type: Date },
    returnRejectionReason: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    autoRejected: { type: Boolean, default: false },
  },
  { timestamps: true }
)

module.exports = model('Investment', investmentSchema)
