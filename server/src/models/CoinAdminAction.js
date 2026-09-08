'use strict'

const { Schema, model } = require('mongoose')

/**
 * Audit trail for every admin action on the index. This is a powerful control
 * sitting next to real money — it must never be usable invisibly.
 */
const coinAdminActionSchema = new Schema(
  {
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, enum: ['pump', 'crash', 'volatility', 'reset'], required: true },
    params: { type: Schema.Types.Mixed, default: {} },
    priceBefore: { type: Number, required: true },
    priceAfter: { type: Number, required: true },
  },
  { timestamps: true }
)

coinAdminActionSchema.index({ createdAt: -1 })

module.exports = model('CoinAdminAction', coinAdminActionSchema)
