const { Schema, model } = require('mongoose')
const { PLAN_KEYS } = require('../services/tierService')

const planSchema = new Schema(
  {
    key: { type: String, enum: PLAN_KEYS, unique: true, required: true },
    name: { type: String, required: true },
    returnPct: { type: Number, required: true },
    installmentPcts: { type: [Number], default: [] }, // daily breakdown; empty = single-payout
    minInvest: { type: Number, required: true }, // paise
    maxInvest: { type: Number, required: true }, // paise
    unlockReferrals: { type: Number, required: true },
    durationHours: { type: Number, default: 24 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
)

module.exports = model('Plan', planSchema)
