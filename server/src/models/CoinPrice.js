'use strict'

const { Schema, model } = require('mongoose')

/**
 * One tick of the ASM Coin index. Written every 30s by coinIndexService.tick().
 *
 * `price` is integer paise, never a float — the whole index pipeline uses the
 * same money representation as the rest of the app even though the index is
 * not money.
 *
 * The TTL index expires ticks after 8 days. The longest chart range is 7 days,
 * so a day of slack keeps the collection bounded (~23k documents) without ever
 * truncating a range a user can actually select.
 */
const coinPriceSchema = new Schema(
  {
    t: { type: Date, required: true },
    price: { type: Number, required: true }, // paise
  },
  { timestamps: false }
)

coinPriceSchema.index({ t: 1 }, { expireAfterSeconds: 691200 }) // 8 days

module.exports = model('CoinPrice', coinPriceSchema)
