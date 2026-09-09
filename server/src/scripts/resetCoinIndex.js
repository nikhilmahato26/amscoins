'use strict'

/**
 * Hard-reset the ASM Coin index: erase all price history and put the index
 * back to its factory state, so it starts over from the baseline as if it had
 * just been deployed.
 *
 * This is deliberately NOT the same thing as the admin panel's "reset"
 * (coinIndexService#resetIndex), which only rebases the live price to the
 * baseline and leaves every past tick in place — the chart keeps its history
 * and just carries on from a different level. This script removes the history
 * too, which is the only way to be rid of ticks written by an older algorithm.
 *
 * Optionally seeds fresh history by REPLAYING THE LIVE ALGORITHM
 * (coinIndexService#nextCandle / #nextTrend) forward from the baseline at the
 * real tick interval. That matters: the older backfill script generates its
 * history from a separate hand-written random walk that writes only a close
 * price, so its candles have no intra-tick high/low and render as stubby
 * bodies with barely any wick, visibly unlike the ticks the running server
 * produces. Replaying the real algorithm means seeded history and live
 * history are the same thing, produced by the same code.
 *
 * Usage (from server/):
 *   node src/scripts/resetCoinIndex.js                  # dry run — prints the plan, changes nothing
 *   node src/scripts/resetCoinIndex.js --yes            # cold start: history erased, no seed
 *   node src/scripts/resetCoinIndex.js --yes --seed 24  # erase, then seed 24h of fresh history
 *   node src/scripts/resetCoinIndex.js --yes --clear-actions   # also wipe the admin audit trail
 *
 * There is one Mongo cluster behind both MONGO_URI and MONGO_URI_DRIVER —
 * there is no separate staging database — so this always runs against real
 * data. That is why it is a dry run unless `--yes` is passed, and why it
 * prints the host and database it is about to modify before touching them.
 */

const mongoose = require('mongoose')

const CoinPrice = require('../models/CoinPrice')
const CoinIndexState = require('../models/CoinIndexState')
const CoinAdminAction = require('../models/CoinAdminAction')
const { nextCandle, nextTrend, BASELINE_PAISE, TICK_MS } = require('../services/coinIndexService')
const logger = require('../lib/logger').child({ service: 'resetCoinIndex' })

/**
 * CoinPrice carries a TTL index that expires ticks after 8 days, so seeding
 * further back than that just writes documents Mongo deletes again. 7 days is
 * also the longest range the chart offers, so nothing beyond it is reachable.
 */
const MAX_SEED_HOURS = 168

/** insertMany batch size — one 20k-document payload is needlessly large. */
const INSERT_BATCH = 2000

/**
 * Replay the live tick loop from the baseline up to `endAt`, returning the
 * documents in chronological order. This is the same sequence of calls
 * coinIndexService#tick makes once every TICK_MS, just run without the wait:
 * advance the slow trend anchor, then walk the price through one candle
 * against it.
 */
function generateSeed({ points, endAt, volatility }) {
  const docs = new Array(points)
  let currentPrice = BASELINE_PAISE
  let trendPrice = BASELINE_PAISE

  for (let i = 0; i < points; i++) {
    // The oldest tick sits `points - 1` intervals before the newest, so the
    // last one lands on endAt and the chart's right edge is the present.
    const at = endAt - (points - 1 - i) * TICK_MS
    trendPrice = nextTrend(trendPrice, volatility)
    const candle = nextCandle({ currentPrice, volatility, move: null, trendPrice }, at)

    docs[i] = { t: new Date(at), price: candle.c, o: candle.o, h: candle.h, l: candle.l }
    currentPrice = candle.c
  }

  return { docs, trendPrice }
}

/**
 * @param {object}  [opts]
 * @param {number}  [opts.seedHours=0]      Hours of history to generate. 0 = cold start.
 * @param {boolean} [opts.clearActions=false] Also erase the admin action audit trail.
 * @returns {Promise<{deleted:number, seeded:number, actionsDeleted:number, currentPrice:number, from:Date|null, to:Date|null}>}
 */
async function resetCoinIndex({ seedHours = 0, clearActions = false } = {}) {
  if (seedHours > MAX_SEED_HOURS) {
    throw new Error(
      `seedHours ${seedHours} exceeds ${MAX_SEED_HOURS} (7 days) — CoinPrice's TTL index would expire anything older, and no chart range reaches that far back.`
    )
  }

  const deleted = (await CoinPrice.deleteMany({})).deletedCount ?? 0

  let actionsDeleted = 0
  if (clearActions) {
    actionsDeleted = (await CoinAdminAction.deleteMany({})).deletedCount ?? 0
  }

  // Delete and recreate rather than assigning field by field: that way the
  // new singleton picks up every schema default, so a field added to the
  // model later is reset too without this script having to learn about it.
  await CoinIndexState.deleteMany({})
  const state = await CoinIndexState.getSingleton()

  let seeded = 0
  let from = null
  let to = null

  if (seedHours > 0) {
    const points = Math.floor((seedHours * 3_600_000) / TICK_MS)
    const { docs, trendPrice } = generateSeed({
      points,
      endAt: Date.now(),
      volatility: state.volatility,
    })

    for (let i = 0; i < docs.length; i += INSERT_BATCH) {
      await CoinPrice.insertMany(docs.slice(i, i + INSERT_BATCH), { ordered: false })
    }

    // Hand the walk off to the live state, so the price shown above the chart
    // and the chart's own last candle agree the moment the page loads.
    const last = docs[docs.length - 1]
    state.currentPrice = last.price
    state.trendPrice = trendPrice
    state.lastTickAt = last.t
    await state.save()

    seeded = docs.length
    from = docs[0].t
    to = last.t
  }

  const result = {
    deleted,
    seeded,
    actionsDeleted,
    currentPrice: state.currentPrice,
    from,
    to,
  }
  logger.info('Coin index reset', result)
  return result
}

module.exports = { resetCoinIndex, generateSeed, MAX_SEED_HOURS }

// ─── CLI ────────────────────────────────────────────────────────────────────

if (require.main === module) {
  const { connectDb, disconnectDb } = require('../config/db')

  const args = process.argv.slice(2)
  const seedArg = args.indexOf('--seed')
  const seedHours = seedArg !== -1 ? Number(args[seedArg + 1]) : 0
  const clearActions = args.includes('--clear-actions')
  const confirmed = args.includes('--yes')

  // Same grouping the app itself shows, so the number printed here is
  // recognisably the number on the chart.
  const rupees = (paise) =>
    `₹${(paise / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  // Validate before connecting to anything: a bad --seed should fail on the
  // dry run too, not wait until someone adds --yes to find out.
  if (seedArg !== -1 && !Number.isFinite(seedHours)) {
    console.error(`--seed needs a number of hours, got: ${args[seedArg + 1] ?? '(nothing)'}`)
    process.exit(1)
  }
  if (seedHours < 0 || seedHours > MAX_SEED_HOURS) {
    console.error(`--seed must be between 0 and ${MAX_SEED_HOURS} hours (7 days).`)
    process.exit(1)
  }

  connectDb()
    .then(async () => {
      const { host, name } = mongoose.connection
      const [prices, actions] = await Promise.all([
        CoinPrice.countDocuments(),
        CoinAdminAction.countDocuments(),
      ])

      console.log(`\nTarget:  ${host} / ${name}`)
      console.log(`Erases:  ${prices} price tick(s)${clearActions ? `, ${actions} admin action(s)` : ''}`)
      console.log(`Resets:  index state to ${rupees(BASELINE_PAISE)} baseline`)
      console.log(
        seedHours > 0
          ? `Seeds:   ${Math.floor((seedHours * 3_600_000) / TICK_MS)} tick(s) across ${seedHours}h, from the live algorithm`
          : 'Seeds:   nothing — the chart stays empty until the ticker writes 2 candles (~1 min)'
      )

      if (!confirmed) {
        console.log('\nDry run. Nothing was changed. Re-run with --yes to apply.\n')
        return null
      }

      return resetCoinIndex({ seedHours, clearActions })
    })
    .then((r) => {
      if (r) {
        console.log(`\nDone. Erased ${r.deleted} tick(s); seeded ${r.seeded}.`)
        if (r.seeded > 0) {
          console.log(`  history: ${r.from.toISOString()} → ${r.to.toISOString()}`)
        }
        console.log(`  live price: ${rupees(r.currentPrice)}\n`)
      }
      return disconnectDb()
    })
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error('Coin index reset failed', { stack: err.stack })
      console.error(err.message)
      process.exit(1)
    })
}
