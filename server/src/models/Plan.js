const { Schema, model } = require('mongoose')

const planSchema = new Schema(
  {
    key: { type: String, enum: ['silver', 'gold', 'diamond'], unique: true, required: true },
    name: { type: String, required: true },
    returnPct: { type: Number, required: true },
    minInvest: { type: Number, required: true }, // paise
    maxInvest: { type: Number, required: true }, // paise
    unlockReferrals: { type: Number, required: true },
    durationHours: { type: Number, default: 24 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

module.exports = model('Plan', planSchema)
