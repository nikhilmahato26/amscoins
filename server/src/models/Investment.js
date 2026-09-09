const { Schema, model } = require('mongoose')
const { PLAN_KEYS } = require('../services/tierService')

const installmentSchema = new Schema(
  {
    day:        { type: Number, required: true },  // 1, 2, or 3
    pct:        { type: Number, required: true },  // e.g. 10 for Silver day 1
    amount:     { type: Number, required: true },  // paise
    // scheduled → available (timer fired) → paid | rejected (admin decided).
    // 'rejected' is a terminal decision for that one day; the remaining days
    // keep running on their own timers.
    status:     { type: String, enum: ['scheduled', 'available', 'paid', 'rejected'], default: 'scheduled' },
    maturesAt:  { type: Date, required: true },
    creditedAt: { type: Date },
    creditedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // null = system auto-pay
    // Set only when status === 'rejected'. creditedAmount below still counts any
    // partial credit the admin chose to pay out on rejection, so the trace is kept.
    rejectionReason: { type: String, default: '' },
    rejectedAt:      { type: Date },
    rejectedBy:      { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
)

const investmentSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planKey: { type: String, enum: PLAN_KEYS, required: true },
    amount: { type: Number, required: true }, // paise
    returnPct: { type: Number, required: true },
    // Snapshotted from Plan.installmentPcts at deposit creation time.
    // Empty array means single-payout (old Diamond or legacy) — uses runMature path.
    installmentPcts: { type: [Number], default: [] },
    // Snapshotted from Plan.durationHours at deposit creation time. Only consulted
    // on the single-payout (empty installmentPcts) maturity path — see
    // approveInvestment. Left unset on investments created before this field
    // existed (and on hand-built test fixtures), which fall back to the admin's
    // global Settings.cycleDurationHours, preserving their prior behaviour.
    durationHours: { type: Number },
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
    // Uploaded by the user on the pay screen, before (or instead of) tapping
    // "I've paid" — lets an admin see proof of payment without leaving the
    // review panel. Optional: absence just means the user skipped it.
    paymentScreenshotUrl: { type: String, default: '' },
    deletedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    deletedAt: { type: Date },
    // Installment-plan fields
    installments: { type: [installmentSchema], default: [] },
    breakRequestedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

module.exports = model('Investment', investmentSchema)
