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
  // Candle counts, not tick counts. Every tick now carries its own high and
  // low (see nextCandle), so a candle no longer needs to span many ticks to
  // have a wick — which frees the counts to be chosen for legibility instead.
  // Around 60-120 candles is what a real terminal shows: dense enough to read
  // as a market, wide enough that a single candle is still distinguishable at
  // the 375px mobile base.
  '1h': { ms: 3_600_000, points: 60 }, // ~2 ticks/candle
  '24h': { ms: 86_400_000, points: 96 }, // ~30 ticks/candle
  '7d': { ms: 604_800_000, points: 120 }, // ~168 ticks/candle
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

// A tick is a path, not a jump. The price walks through SUB_STEPS smaller
// moves inside the 30s and the extremes of that walk become the tick's high
// and low — twelve sub-steps is a move every 2.5s.
//
// This is what makes a wick mean something. A candle built only from tick
// endpoints has a high/low drawn from a handful of samples, and the expected
// range of a random walk grows with the square root of its sample count — so
// four samples produce a stubby nub where a real candle, whose high and low
// come from thousands of trades, shows a wick that routinely outruns its body.
const SUB_STEPS = 12

// Diffusion scaling. SUB_STEPS independent steps of sigma/sqrt(SUB_STEPS) sum
// to the same standard deviation as one step of sigma, so splitting a tick
// into sub-steps changes its texture and nothing else. Without this factor the
// index would silently get sqrt(12) ≈ 3.5x wilder.
const SUB_SIGMA_SCALE = 1 / Math.sqrt(SUB_STEPS)

// Convert a per-tick pull into the per-sub-step pull that compounds to it:
// 1 - (1 - subPull(p))^SUB_STEPS === p. Applying the whole-tick pull twelve
// times over would make every admin move snap almost instantly instead of
// ramping.
const subPull = (whole) => 1 - Math.pow(1 - whole, 1 / SUB_STEPS)

const clamp = (p) => Math.min(CEILING_PAISE, Math.max(FLOOR_PAISE, Math.round(p)))

// Same bounds without the rounding — used inside the sub-step loop, where
// rounding twelve times would accumulate a bias the model never asked for.
const bound = (p) => Math.min(CEILING_PAISE, Math.max(FLOOR_PAISE, p))

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
 * Where the drift target sits at a given instant within an active move's
 * window: the fraction of the window elapsed at `at`, clamped to [0, 1] so a
 * sub-step evaluated before the window opens or after it closes still lands
 * on start/target rather than extrapolating past them, lerped from
 * startPrice to targetPrice.
 */
function driftTargetAt(move, at) {
  const startedAt = new Date(move.startedAt).getTime()
  const endsAt = new Date(move.endsAt).getTime()
  const span = endsAt - startedAt
  const fraction = span <= 0 ? 1 : Math.min(1, Math.max(0, (at - startedAt) / span))
  return move.startPrice + (move.targetPrice - move.startPrice) * fraction
}

/**
 * Compute the next index candle. Pure and synchronous so it can be tested
 * exhaustively without a database — `rand` is injected for determinism.
 *
 * A tick is not one jump, it's a walk: SUB_STEPS smaller steps inside the
 * tick, each applying the same three forces nextPrice always has —
 *   1. Noise — a random step scaled by volatility, split across sub-steps at
 *      SUB_SIGMA_SCALE so the aggregate variance matches a single full-size
 *      step (see SUB_SIGMA_SCALE's own comment).
 *   2. Reversion — pulled toward `trendPrice`, the slow-wandering anchor from
 *      nextTrend. `trendPrice` is optional — callers that omit it get
 *      `currentPrice` as the target, which makes reversion a no-op.
 *   3. Drift — if an admin move is active, each sub-step reads the drift
 *      target at its own instant (via driftTargetAt) rather than the one
 *      target for the whole tick, so a move ramps smoothly through the
 *      candle instead of trying to reach the same stale point twelve times.
 *
 * The running max/min of the walk becomes the candle's high/low — this is
 * the whole reason nextCandle exists instead of just nextPrice: a wick drawn
 * from twelve samples routinely outruns the body, where one drawn from a
 * single tick endpoint pair cannot.
 */
function nextCandle(state, now = Date.now(), rand = Math.random) {
  const { currentPrice, volatility, move, trendPrice = currentPrice } = state

  const sigma = (volatility / 100) * MAX_STEP_FRACTION * SUB_SIGMA_SCALE
  const revert = subPull(REVERT_PULL * (volatility / 100))
  const drift = subPull(DRIFT_PULL)

  const open = bound(currentPrice)
  let price = open
  let high = open
  let low = open

  for (let step = 1; step <= SUB_STEPS; step++) {
    const noise = (rand() * 2 - 1) * sigma
    price = price * (1 + noise)
    price += (trendPrice - price) * revert
    if (move) {
      // Sub-steps lead up to `now`, each reading the drift target at its own
      // instant, so a move stays a ramp instead of twelve pulls toward one
      // stale target.
      const at = now - TICK_MS + (step / SUB_STEPS) * TICK_MS
      price += (driftTargetAt(move, at) - price) * drift
    }
    price = bound(price)
    if (price > high) high = price
    if (price < low) low = price
  }

  return { o: Math.round(open), h: Math.round(high), l: Math.round(low), c: clamp(price) }
}

/**
 * Back-compat wrapper: every existing caller and test only ever wanted the
 * close. Kept so the rest of the codebase (and coinIndexTick.test.js's
 * `nextPrice` suite) doesn't have to change shape for a chart feature.
 */
function nextPrice(state, now = Date.now(), rand = Math.random) {
  return nextCandle(state, now, rand).c
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
  const candle = nextCandle(
    { currentPrice: state.currentPrice, volatility: state.volatility, move: state.move, trendPrice },
    now.getTime()
  )

  await CoinPrice.create({ t: now, price: candle.c, o: candle.o, h: candle.h, l: candle.l })

  state.currentPrice = candle.c
  state.trendPrice = trendPrice
  state.lastTickAt = now
  await state.save()

  return { price: candle.c, at: now }
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
 * bucket's first tick's own open, close its last tick's price, high/low the
 * extremes of every tick's own high/low across the whole bucket — not just
 * the bucket's two endpoint prices — so a candle's wick reflects real
 * intra-tick movement (from nextCandle's sub-step walk) on top of real
 * intra-bucket movement. Ticks written before sub-steps existed carry only
 * `price`; those fall back to it for o/h/l alike. The final tick's price
 * always closes the last candle, so the chart's right edge matches the live
 * price shown above it.
 *
 * A plain loop, not `Math.max(...array)`, because a 7d bucket can hold ~168
 * docs and a spread argument list scales worse than a loop as buckets grow.
 */
function bucketOHLC(docs, maxPoints) {
  if (docs.length === 0) return []

  const bucketSize = Math.max(1, Math.ceil(docs.length / maxPoints))
  const out = []
  for (let i = 0; i < docs.length; i += bucketSize) {
    const bucket = docs.slice(i, i + bucketSize)
    let high = -Infinity
    let low = Infinity
    for (const d of bucket) {
      const h = d.h ?? d.price
      const l = d.l ?? d.price
      if (h > high) high = h
      if (l < low) low = l
    }
    out.push({
      t: bucket[bucket.length - 1].t,
      o: bucket[0].o ?? bucket[0].price,
      h: high,
      l: low,
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
    CoinPrice.find({ t: { $gte: new Date(now - RANGES['24h'].ms) } }).select('price o h l').lean(),
    getInvestorCount(now),
  ])

  // Intra-tick extremes, not just tick closes — a 24h high built only from
  // `price` would miss a spike that happened between two ticks and reverted
  // before either was written.
  let high24h = -Infinity
  let low24h = Infinity
  for (const d of dayDocs) {
    const h = d.h ?? d.price
    const l = d.l ?? d.price
    if (h > high24h) high24h = h
    if (l < low24h) low24h = l
  }

  const first = docs.length ? docs[0].o ?? docs[0].price : state.currentPrice
  const changePct = first === 0 ? 0 : ((state.currentPrice - first) / first) * 100

  return {
    range,
    current: state.currentPrice,
    changePct: Number(changePct.toFixed(2)),
    high24h: dayDocs.length ? high24h : state.currentPrice,
    low24h: dayDocs.length ? low24h : state.currentPrice,
    investorCount,
    series: bucketOHLC(docs, cfg.points),
  }
}

module.exports = {
  nextPrice,
  nextCandle,
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
