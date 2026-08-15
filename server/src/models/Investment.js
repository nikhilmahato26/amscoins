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
    status: { type: String, enum: ['pending', 'active', 'rejected'], default: 'pending' },
    startAt: { type: Date },
    maturesAt: { type: Date },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
)

module.exports = model('Investment', investmentSchema)
