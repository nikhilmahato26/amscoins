'use strict'

const { Schema, model } = require('mongoose')

/**
 * One tick of the ASM Coin index. Written every 30s by coinIndexService.tick().
 *
 * `price` is integer paise, never a float — the whole index pipeline uses the
 * same money representation as the rest of the app even though the index is
 * not money.
 *
 * A tick is not a single point: coinIndexService walks the price through
 * SUB_STEPS smaller moves inside the 30s, so the tick has a genuine path with
 * an open, a high, a low and a close. Storing all four is what lets a candle
 * have a real wick — the extreme the price actually reached between two
 * ticks, rather than the extreme of the handful of tick endpoints that happen
 * to fall in the same bucket. `price` is the close, kept under its original
 * name so every existing reader and index keeps working.
 *
 * o/h/l are optional: ticks written before sub-step simulation existed have
 * only `price`, and bucketOHLC falls back to it for those.
 *
 * The TTL index expires ticks after 8 days. The longest chart range is 7 days,
 * so a day of slack keeps the collection bounded (~23k documents) without ever
 * truncating a range a user can actually select.
 */
const coinPriceSchema = new Schema(
  {
    t: { type: Date, required: true },
    price: { type: Number, required: true }, // paise — the tick's close
    o: { type: Number }, // paise — open
    h: { type: Number }, // paise — intra-tick high
    l: { type: Number }, // paise — intra-tick low
  },
  { timestamps: false }
)

coinPriceSchema.index({ t: 1 }, { expireAfterSeconds: 691200 }) // 8 days

module.exports = model('CoinPrice', coinPriceSchema)
