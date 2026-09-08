'use strict'

const CoinIndexState = require('../models/CoinIndexState')
const CoinPrice = require('../models/CoinPrice')
const logger = require('../lib/logger').child({ service: 'coinIndex' })

const BASELINE_PAISE = 124780 // ₹1,247.80
const FLOOR_PAISE = 60000 // ₹600
const CEILING_PAISE = 500000 // ₹5,000
const TICK_MS = 30_000

// Percentage move applied by each admin nudge size.
const MOVE_PCT = { small: 3, medium: 8, hard: 18 }

const RANGES = {
  '1h': { ms: 3_600_000, points: 120 },
  '24h': { ms: 86_400_000, points: 180 },
  '7d': { ms: 604_800_000, points: 200 },
}

// Volatility 100 produces at most a 0.6% step per tick. At a 30s tick that is
// lively without being absurd — roughly the feel of a real small-cap coin.
const MAX_STEP_FRACTION = 0.006

// How much of the remaining gap to the drift target is closed per tick. 0.5
// converges quickly enough that a 10-minute move visibly completes, while
// still curving rather than snapping.
const DRIFT_PULL = 0.5

const clamp = (p) => Math.min(CEILING_PAISE, Math.max(FLOOR_PAISE, Math.round(p)))

/**
 * Compute the next index price. Pure and synchronous so it can be tested
 * exhaustively without a database — `rand` is injected for determinism.
 *
 * Two components:
 *   1. Noise — a random step scaled by volatility. Volatility 0 means no noise
 *      at all, which produces a provably flat line.
 *   2. Drift — if an admin move is active, the price is pulled toward a target
 *      that itself slides from startPrice to targetPrice across the window.
 *
 * The result is always clamped and always an integer.
 */
function nextPrice(state, now = Date.now(), rand = Math.random) {
  const { currentPrice, volatility, move } = state

  const sigma = (volatility / 100) * MAX_STEP_FRACTION
  const noise = (rand() * 2 - 1) * sigma
  let price = currentPrice * (1 + noise)

  if (move) {
    const startedAt = new Date(move.startedAt).getTime()
    const endsAt = new Date(move.endsAt).getTime()
    const span = endsAt - startedAt
    const fraction = span <= 0 ? 1 : Math.min(1, Math.max(0, (now - startedAt) / span))
    const driftTarget = move.startPrice + (move.targetPrice - move.startPrice) * fraction
    price += (driftTarget - price) * DRIFT_PULL
  }

  return clamp(price)
}

/**
 * Advance the index by one tick: read state, compute, persist, update state.
 * Safe to call directly in tests (the job queue is disabled under NODE_ENV=test).
 */
async function tick(now = new Date()) {
  const state = await CoinIndexState.getSingleton()

  // Retire a move whose window has closed, so the index returns to free drift.
  if (state.move && new Date(state.move.endsAt).getTime() <= now.getTime()) {
    state.move = null
  }

  const price = nextPrice(
    { currentPrice: state.currentPrice, volatility: state.volatility, move: state.move },
    now.getTime()
  )

  await CoinPrice.create({ t: now, price })

  state.currentPrice = price
  state.lastTickAt = now
  await state.save()

  return { price, at: now }
}

module.exports = {
  nextPrice,
  tick,
  BASELINE_PAISE,
  FLOOR_PAISE,
  CEILING_PAISE,
  TICK_MS,
  MOVE_PCT,
  RANGES,
}
