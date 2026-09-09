'use strict'

/**
 * Backfill ASM Coin index history.
 *
 * The live ticker only writes one point every 30s, so a freshly-deployed index
 * has a handful of points and the chart reads as a few straight bumps rather
 * than a market. This generates a realistic past so the 1h / 24h / 7d ranges
 * all have something true to their own timescale to show.
 *
 * The walk is generated BACKWARDS from the current live price, so the newest
 * generated point sits exactly where the ticker is now and history joins the
 * present without a visible seam.
 *
 * Realism comes from three things a plain random walk doesn't have:
 *   - volatility clustering: `vol` mean-reverts around a base but drifts, so
 *     the chart has calm stretches and choppy stretches instead of uniform fuzz
 *   - fat tails: occasional larger jumps, the way real markets actually move
 *   - a gentle drift, so the 7d view has a shape rather than wandering flat
 *
 * Usage:
 *   node src/scripts/backfillCoinHistory.js [--days 7] [--force]
 *
 * Refuses to run if history already covers the window unless --force is given
 * (which clears the window first).
 */

const mongoose = require('mongoose')
const CoinPrice = require('../models/CoinPrice')
const CoinIndexState = require('../models/CoinIndexState')
const { FLOOR_PAISE, CEILING_PAISE, TICK_MS } = require('../services/coinIndexService')
const { connectDb, disconnectDb } = require('../config/db')
const logger = require('../lib/logger').child({ service: 'backfillCoinHistory' })

/** Base per-tick volatility, as a fraction of price. Matches the live tick's feel. */
const BASE_VOL = 0.0016
/** How strongly volatility pulls back toward BASE_VOL each tick (0-1). */
const VOL_REVERSION = 0.02
/** Per-tick chance of a larger "news" move. */
const JUMP_CHANCE = 0.0008
/** Overall upward drift across the whole window, as a fraction. */
const TOTAL_DRIFT = 0.06

/** Standard normal via Box-Muller — a uniform random walk looks visibly fake. */
function gaussian() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const clamp = (p) => Math.min(CEILING_PAISE, Math.max(FLOOR_PAISE, Math.round(p)))

/**
 * Build the series by walking backwards from `endPrice`, then return it in
 * forward chronological order so the last element is `endPrice`.
 */
function generateSeries({ endPrice, endAt, points, intervalMs }) {
  const out = new Array(points)
  let price = endPrice
  let vol = BASE_VOL
  // Applied per tick going backwards, so forward-in-time the series drifts up.
  const driftPerTick = TOTAL_DRIFT / points

  for (let i = points - 1; i >= 0; i--) {
    out[i] = { t: new Date(endAt - (points - 1 - i) * intervalMs), price: clamp(price) }

    // Volatility mean-reverts toward BASE_VOL but wanders — this is what
    // produces calm stretches next to choppy ones.
    vol += (BASE_VOL - vol) * VOL_REVERSION + gaussian() * BASE_VOL * 0.08
    vol = Math.max(BASE_VOL * 0.25, Math.min(BASE_VOL * 4, vol))

    let step = gaussian() * vol
    if (Math.random() < JUMP_CHANCE) step += gaussian() * vol * 12

    // Walking backwards: undo the drift and the step.
    price = price / (1 + step + driftPerTick)
    price = clamp(price)
  }

  return out
}

async function backfillCoinHistory({ days = 7, force = false } = {}) {
  const intervalMs = TICK_MS
  const points = Math.floor((days * 24 * 60 * 60 * 1000) / intervalMs)
  const endAt = Date.now()
  const startAt = new Date(endAt - days * 24 * 60 * 60 * 1000)

  const existing = await CoinPrice.countDocuments({ t: { $gte: startAt } })
  if (existing > points * 0.5 && !force) {
    logger.info('History already covers the window — nothing to do', { existing, points })
    return { skipped: true, existing }
  }

  if (force && existing > 0) {
    const { deletedCount } = await CoinPrice.deleteMany({ t: { $gte: startAt } })
    logger.info('Cleared existing history in the window', { deletedCount })
  }

  // Join the generated history to wherever the live index actually is.
  const state = await CoinIndexState.getSingleton()
  const series = generateSeries({
    endPrice: state.currentPrice,
    endAt,
    points,
    intervalMs,
  })

  // Insert in batches — one 20k-document insertMany is a needlessly large payload.
  const BATCH = 2000
  for (let i = 0; i < series.length; i += BATCH) {
    await CoinPrice.insertMany(series.slice(i, i + BATCH), { ordered: false })
  }

  const prices = series.map((s) => s.price)
  const result = {
    inserted: series.length,
    days,
    from: series[0].t,
    to: series[series.length - 1].t,
    low: Math.min(...prices),
    high: Math.max(...prices),
    endPrice: state.currentPrice,
  }
  logger.info('Coin index history backfilled', result)
  return result
}

module.exports = { backfillCoinHistory, generateSeries }

if (require.main === module) {
  const args = process.argv.slice(2)
  const daysArg = args.indexOf('--days')
  const days = daysArg !== -1 ? Number(args[daysArg + 1]) : 7
  const force = args.includes('--force')

  connectDb()
    .then(() => backfillCoinHistory({ days, force }))
    .then((r) => {
      if (r.skipped) {
        console.log(`Skipped — ${r.existing} points already in the window. Use --force to regenerate.`)
      } else {
        console.log(
          `Backfilled ${r.inserted} points across ${r.days}d\n` +
            `  range: ₹${(r.low / 100).toFixed(2)} – ₹${(r.high / 100).toFixed(2)}\n` +
            `  ends at: ₹${(r.endPrice / 100).toFixed(2)} (joins the live ticker)`,
        )
      }
      return disconnectDb()
    })
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Backfill failed', { stack: err.stack })
      console.error(err.message)
      process.exit(1)
    })
}
