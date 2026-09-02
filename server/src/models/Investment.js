const { Schema, model } = require('mongoose')

const installmentSchema = new Schema(
  {
    day:        { type: Number, required: true },  // 1, 2, or 3
    pct:        { type: Number, required: true },  // e.g. 10 for Silver day 1
    amount:     { type: Number, required: true },  // paise
    status:     { type: String, enum: ['scheduled', 'available', 'paid'], default: 'scheduled' },
    maturesAt:  { type: Date, required: true },
    creditedAt: { type: Date },
    creditedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // null = system auto-pay
  },
  { _id: false }
)

const investmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planKey: { type: String, enum: ['silver', 'gold', 'diamond'], required: true },
    amount: { type: Number, required: true }, // paise
    returnPct: { type: Number, required: true },
    // Snapshotted from Plan.installmentPcts at deposit creation time.
    // Empty array means single-payout (old Diamond or legacy) — uses runMature path.
    installmentPcts: { type: [Number], default: [] },
    expectedReturn: { type: Number, required: true }, // paise
    referenceCode: { type: String, required: true, unique: true },
    referralCodeUsed: { type: String, default: null },
    isFirstDeposit: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ['pending', 'active', 'matured', 'returned', 'rejected', 'deleted', 'break_requested'],
      default: 'pending',
    },
    startAt: { type: Date },
    maturesAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    walletCredited: { type: Boolean, default: false },
    maturedAt: { type: Date },
    creditedAmount: { type: Number, default: 0 }, // paise actually paid to wallet (accumulated)
    returnDecidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    returnDecidedAt: { type: Date },
    returnRejectionReason: { type: String, default: '' },
    rejectionReason: { type: String, default: '' },
    autoRejected: { type: Boolean, default: false },
    autoApproved: { type: Boolean, default: false },
    paymentNotified: { type: Boolean, default: false },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
    // Installment-plan fields
    installments: { type: [installmentSchema], default: [] },
    breakRequestedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

module.exports = model('Investment', investmentSchema)
