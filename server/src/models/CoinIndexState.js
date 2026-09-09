'use strict'

const { Schema, model } = require('mongoose')

const BASELINE_PAISE = 124780 // ₹1,247.80
const DEFAULT_VOLATILITY = 35

/**
 * An in-progress admin nudge. Null when the index is just drifting on its own.
 * The price is carried from `startPrice` toward `targetPrice` across the window
 * so a pump or crash reads as a market move rather than a vertical jump.
 */
const moveSchema = new Schema(
  {
    action: { type: String, enum: ['pump', 'crash'], required: true },
    startPrice: { type: Number, required: true },
    targetPrice: { type: Number, required: true },
    startedAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    admin: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
)

/**
 * The one shared index state. Same find-or-create pattern as Settings.
 */
const coinIndexStateSchema = new Schema(
  {
    key: { type: String, default: 'global', unique: true },
    currentPrice: { type: Number, default: BASELINE_PAISE }, // paise
    // A slow-wandering anchor the fast price mean-reverts toward — see
    // coinIndexService#nextTrend. Without this, a pure random walk with any
    // constant bias compounds into a one-way trend over enough ticks; a
    // second, slower-moving target is what makes the index actually turn
    // around instead of climbing (or falling) forever.
    trendPrice: { type: Number, default: BASELINE_PAISE }, // paise
    volatility: { type: Number, default: DEFAULT_VOLATILITY, min: 0, max: 100 },
    move: { type: moveSchema, default: null },
    lastTickAt: { type: Date, default: null },
  },
  { timestamps: true }
)

coinIndexStateSchema.statics.getSingleton = async function getSingleton() {
  const existing = await this.findOne({ key: 'global' })
  if (existing) return existing
  return this.create({ key: 'global' })
}

module.exports = model('CoinIndexState', coinIndexStateSchema)
