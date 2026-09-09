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
  // Add a small positive bias (+0.3× sigma) so the idle random walk trends
  // slightly upward — the graph stays "a little green" without admin action.
  const UPWARD_BIAS = 0.25
  const noise = (rand() * 2 - 1 + UPWARD_BIAS) * sigma
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
 * Reduce a series to at most `maxPoints` by taking the last tick of each
 * bucket. The final tick is always preserved so the end of the chart line
 * matches the live price the user sees above it.
 */
function downsample(docs, maxPoints) {
  if (docs.length <= maxPoints) return docs

  const bucketSize = Math.ceil(docs.length / maxPoints)
  const out = []
  for (let i = 0; i < docs.length; i += bucketSize) {
    out.push(docs[Math.min(i + bucketSize - 1, docs.length - 1)])
  }

  const last = docs[docs.length - 1]
  if (out[out.length - 1] !== last) out.push(last)

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
    series: downsample(docs, cfg.points).map((d) => ({ t: d.t, p: d.price })),
  }
}

module.exports = {
  nextPrice,
  tick,
  applyMove,
  setVolatility,
  resetIndex,
  listActions,
  downsample,
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
