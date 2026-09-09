'use strict'

const CoinIndexState = require('../models/CoinIndexState')
const CoinPrice = require('../models/CoinPrice')
const CoinAdminAction = require('../models/CoinAdminAction')
const Investment = require('../models/Investment')
const logger = require('../lib/logger').child({ service: 'coinIndex' })
const { ApiError } = require('../middleware/errorHandler')

const BASELINE_PAISE = 124780 // ₹1,247.80
const FLOOR_PAISE = 60000 // ₹600
const CEILING_PAISE = 500000 // ₹5,000
const TICK_MS = 30_000
const ASMCOIN = 'asmcoin'

// Percentage move applied by each admin nudge size.
const MOVE_PCT = { small: 3, medium: 8, hard: 18 }

const RANGES = {
  // Deliberately fewer points than raw ticks (a tick every 30s): each
  // candle then spans several ticks, so it has real high/low wicks instead
  // of a flat open === close body. See bucketOHLC.
  '1h': { ms: 3_600_000, points: 30 }, // ~4 ticks/candle
  '24h': { ms: 86_400_000, points: 180 }, // ~16 ticks/candle
  '7d': { ms: 604_800_000, points: 200 }, // ~100 ticks/candle
}

// Volatility 100 produces at most a 0.6% step per tick. At a 30s tick that is
// lively without being absurd — roughly the feel of a real small-cap coin.
const MAX_STEP_FRACTION = 0.006

// How much of the remaining gap to the drift target is closed per tick. 0.5
// converges quickly enough that a 10-minute move visibly completes, while
// still curving rather than snapping.
const DRIFT_PULL = 0.5

// How much of the gap between the fast price and the slow trend anchor
// closes per tick, at full volatility. ~9 ticks (4-5 min) to close half the
// gap — fast enough to feel alive, slow enough to still look like a curve.
const REVERT_PULL = 0.08

// The trend anchor's own step size — smaller than the price's, so it wanders
// rather than jumping — and how much of its gap to baseline closes per tick.
// ~70 ticks (35 min) to close half the gap: long enough that the index holds
// a "mood" (rising, falling, flat) for a visible stretch before it turns.
const TREND_STEP_FRACTION = 0.002
const TREND_PULL = 0.01

const clamp = (p) => Math.min(CEILING_PAISE, Math.max(FLOOR_PAISE, Math.round(p)))

/**
 * Advance the slow trend anchor by one tick. Pure and synchronous, same
 * determinism seam as nextPrice. This is what keeps the index from settling
 * into a one-way climb or fall: nextPrice mean-reverts the fast price toward
 * this anchor, and the anchor itself only ever wanders a bounded distance
 * from baseline before its own pull drags it back — so the index drifts up
 * for a while, then back down, then up again, the way a real thin-liquidity
 * market idles.
 *
 * Frozen at volatility 0, matching nextPrice's "provably flat" guarantee —
 * a trend anchor that kept crawling back to baseline on its own would make
 * that guarantee a lie.
 */
function nextTrend(trendPrice, volatility, rand = Math.random) {
  if (volatility <= 0) return trendPrice

  const sigma = (volatility / 100) * TREND_STEP_FRACTION
  const noise = (rand() * 2 - 1) * sigma
  let trend = trendPrice * (1 + noise)
  trend += (BASELINE_PAISE - trend) * TREND_PULL

  return clamp(trend)
}

/**
 * Compute the next index price. Pure and synchronous so it can be tested
 * exhaustively without a database — `rand` is injected for determinism.
 *
 * Three components:
 *   1. Noise — a random step scaled by volatility. Volatility 0 means no noise
 *      at all, which produces a provably flat line.
 *   2. Reversion — pulled toward `trendPrice`, the slow-wandering anchor from
 *      nextTrend. This is what turns a pure random walk (which drifts away
 *      forever) into something that oscillates: noise pushes the price away
 *      from the trend, reversion pulls it back, so it overshoots and
 *      undershoots in both directions instead of only ever compounding one
 *      way. `trendPrice` is optional — callers that omit it (existing tests,
 *      callers not tracking a trend) get `currentPrice` as the target, which
 *      makes the reversion term a no-op.
 *   3. Drift — if an admin move is active, the price is pulled toward a target
 *      that itself slides from startPrice to targetPrice across the window.
 *      This still dominates reversion during a move: DRIFT_PULL (0.5) is
 *      several times REVERT_PULL (0.08 at most), and it applies after
 *      reversion has already been folded in, so a pump or crash still reads
 *      as a deliberate market move rather than being fought by the drift back
 *      to trend.
 *
 * The result is always clamped and always an integer.
 */
function nextPrice(state, now = Date.now(), rand = Math.random) {
  const { currentPrice, volatility, move, trendPrice = currentPrice } = state

  const sigma = (volatility / 100) * MAX_STEP_FRACTION
  const noise = (rand() * 2 - 1) * sigma
  let price = currentPrice * (1 + noise)

  const revertFraction = REVERT_PULL * (volatility / 100)
  price += (trendPrice - price) * revertFraction

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

  const trendPrice = nextTrend(state.trendPrice ?? state.currentPrice, state.volatility)
  const price = nextPrice(
    { currentPrice: state.currentPrice, volatility: state.volatility, move: state.move, trendPrice },
    now.getTime()
  )

  await CoinPrice.create({ t: now, price })

  state.currentPrice = price
  state.trendPrice = trendPrice
  state.lastTickAt = now
  await state.save()

  return { price, at: now }
}

/**
 * Record an admin action. Every mutation of the index goes through here — the
 * audit trail is not optional.
 */
async function audit(action, params, priceBefore, priceAfter, adminId) {
  await CoinAdminAction.create({
    admin: adminId || null,
    action,
    params,
    priceBefore,
    priceAfter,
  })
}

/**
 * Start a pump or crash. The price is NOT changed here — a target is set and
 * the drift in nextPrice() carries the price there across the window, so the
 * move reads as a market move rather than a vertical jump.
 */
async function applyMove({ action, size, durationMinutes, adminId }) {
  const pct = MOVE_PCT[size]
  if (!pct) throw new ApiError(400, 'Invalid move size')
  if (action !== 'pump' && action !== 'crash') throw new ApiError(400, 'Invalid move action')
  if (!(durationMinutes > 0)) throw new ApiError(400, 'Duration must be positive')

  const state = await CoinIndexState.getSingleton()
  const startPrice = state.currentPrice
  const multiplier = action === 'pump' ? 1 + pct / 100 : 1 - pct / 100
  const targetPrice = clamp(startPrice * multiplier)

  const startedAt = new Date()
  state.move = {
    action,
    startPrice,
    targetPrice,
    startedAt,
    endsAt: new Date(startedAt.getTime() + durationMinutes * 60_000),
    admin: adminId || null,
  }
  await state.save()

  await audit(action, { size, durationMinutes, targetPrice }, startPrice, targetPrice, adminId)
  logger.info('Coin index move started', { action, size, durationMinutes, startPrice, targetPrice })

  return state
}

async function setVolatility(value, adminId) {
  if (typeof value !== 'number' || value < 0 || value > 100) {
    throw new ApiError(400, 'Volatility must be between 0 and 100')
  }
  const state = await CoinIndexState.getSingleton()
  state.volatility = value
  await state.save()

  await audit('volatility', { value }, state.currentPrice, state.currentPrice, adminId)
  logger.info('Coin index volatility set', { value })

  return state
}

async function resetIndex(adminId) {
  const state = await CoinIndexState.getSingleton()
  const before = state.currentPrice

  state.currentPrice = BASELINE_PAISE
  state.trendPrice = BASELINE_PAISE
  state.move = null
  await state.save()

  await audit('reset', {}, before, BASELINE_PAISE, adminId)
  logger.info('Coin index reset to baseline', { before })

  return state
}

async function listActions({ limit = 25, skip = 0 } = {}) {
  const [rows, total] = await Promise.all([
    CoinAdminAction.find().sort({ createdAt: -1 }).skip(skip).limit(limit).populate('admin', 'name email').lean(),
    CoinAdminAction.countDocuments(),
  ])
  return { rows, total }
}

/**
 * Aggregate a time-ordered run of price ticks into at most `maxPoints` OHLC
 * candles. Each candle covers a contiguous run of ticks: open is the
 * bucket's first price, close its last, high/low the extremes across the
 * whole bucket — not just its two endpoints — so a candle's wick reflects
 * real intra-bucket movement instead of two points joined by a straight
 * line. The final tick's price always closes the last candle, so the
 * chart's right edge matches the live price shown above it.
 */
function bucketOHLC(docs, maxPoints) {
  if (docs.length === 0) return []

  const bucketSize = Math.max(1, Math.ceil(docs.length / maxPoints))
  const out = []
  for (let i = 0; i < docs.length; i += bucketSize) {
    const bucket = docs.slice(i, i + bucketSize)
    const prices = bucket.map((d) => d.price)
    out.push({
      t: bucket[bucket.length - 1].t,
      o: bucket[0].price,
      h: Math.max(...prices),
      l: Math.min(...prices),
      c: bucket[bucket.length - 1].price,
    })
  }
  return out
}

// The investor count is a collection-scan aggregate that changes slowly and is
// requested by every client every 30s. A small in-process TTL cache keeps it
// off the hot path without needing Redis (which is absent in test and in some
// dev setups).
let investorCountCache = { value: 0, at: 0 }
const INVESTOR_COUNT_TTL_MS = 60_000

async function getInvestorCount(now = Date.now()) {
  if (now - investorCountCache.at < INVESTOR_COUNT_TTL_MS) return investorCountCache.value

  const users = await Investment.distinct('user', {
    planKey: ASMCOIN,
    status: { $in: ['active', 'matured'] },
  })

  investorCountCache = { value: users.length, at: now }
  return users.length
}

/** Test seam — the TTL cache would otherwise leak between test cases. */
function _resetInvestorCountCache() {
  investorCountCache = { value: 0, at: 0 }
}

async function getSeries(range = '24h') {
  const cfg = RANGES[range]
  if (!cfg) throw new ApiError(400, 'Invalid range')

  const now = Date.now()
  const [state, docs, dayDocs, investorCount] = await Promise.all([
    CoinIndexState.getSingleton(),
    CoinPrice.find({ t: { $gte: new Date(now - cfg.ms) } }).sort({ t: 1 }).lean(),
    CoinPrice.find({ t: { $gte: new Date(now - RANGES['24h'].ms) } }).select('price').lean(),
    getInvestorCount(now),
  ])

  const prices = dayDocs.map((d) => d.price)
  const first = docs.length ? docs[0].price : state.currentPrice
  const changePct = first === 0 ? 0 : ((state.currentPrice - first) / first) * 100

  return {
    range,
    current: state.currentPrice,
    changePct: Number(changePct.toFixed(2)),
    high24h: prices.length ? Math.max(...prices) : state.currentPrice,
    low24h: prices.length ? Math.min(...prices) : state.currentPrice,
    investorCount,
    series: bucketOHLC(docs, cfg.points),
  }
}

module.exports = {
  nextPrice,
  nextTrend,
  tick,
  applyMove,
  setVolatility,
  resetIndex,
  listActions,
  bucketOHLC,
  getSeries,
  getInvestorCount,
  _resetInvestorCountCache,
  BASELINE_PAISE,
  FLOOR_PAISE,
  CEILING_PAISE,
  TICK_MS,
  MOVE_PCT,
  RANGES,
  ASMCOIN,
}
