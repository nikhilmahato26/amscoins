process.env.JWT_SECRET = 'test'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const CoinIndexState = require('../../src/models/CoinIndexState')
const CoinPrice = require('../../src/models/CoinPrice')
const svc = require('../../src/services/coinIndexService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

// rand() returns a value in [0,1); 0.5 is the midpoint and produces zero noise.
const noNoise = () => 0.5
const maxUp = () => 1
const maxDown = () => 0

describe('nextPrice', () => {
  it('returns the same price when volatility is zero and no move is active', () => {
    const state = { currentPrice: 124780, volatility: 0, move: null }
    expect(svc.nextPrice(state, Date.now(), maxUp)).toBe(124780)
  })

  it('moves the price when volatility is above zero', () => {
    const state = { currentPrice: 124780, volatility: 100, move: null }
    expect(svc.nextPrice(state, Date.now(), maxUp)).toBeGreaterThan(124780)
    expect(svc.nextPrice(state, Date.now(), maxDown)).toBeLessThan(124780)
  })

  it('never returns a price below the floor, however hard it is pushed down', () => {
    const state = { currentPrice: svc.FLOOR_PAISE, volatility: 100, move: null }
    for (let i = 0; i < 500; i++) {
      const p = svc.nextPrice({ ...state, currentPrice: svc.FLOOR_PAISE }, Date.now(), maxDown)
      expect(p).toBeGreaterThanOrEqual(svc.FLOOR_PAISE)
    }
  })

  it('never returns a price above the ceiling, however hard it is pushed up', () => {
    for (let i = 0; i < 500; i++) {
      const p = svc.nextPrice(
        { currentPrice: svc.CEILING_PAISE, volatility: 100, move: null }, Date.now(), maxUp
      )
      expect(p).toBeLessThanOrEqual(svc.CEILING_PAISE)
    }
  })

  it('always returns an integer', () => {
    const state = { currentPrice: 124783, volatility: 77, move: null }
    for (let i = 0; i < 100; i++) {
      expect(Number.isInteger(svc.nextPrice(state, Date.now(), Math.random))).toBe(true)
    }
  })

  it('drifts toward an active move target as the window elapses', () => {
    const startedAt = new Date('2026-09-09T10:00:00Z')
    const endsAt = new Date('2026-09-09T10:10:00Z')
    const state = {
      currentPrice: 100000,
      volatility: 0,
      move: { action: 'pump', startPrice: 100000, targetPrice: 120000, startedAt, endsAt },
    }
    // Halfway through the window the drift target is 110000; the price is
    // pulled halfway toward it from 100000, so it must sit between the two.
    const half = svc.nextPrice(state, new Date('2026-09-09T10:05:00Z').getTime(), noNoise)
    expect(half).toBeGreaterThan(100000)
    expect(half).toBeLessThan(120000)
  })

  it('reaches the move target once the window has fully elapsed', () => {
    const startedAt = new Date('2026-09-09T10:00:00Z')
    const endsAt = new Date('2026-09-09T10:10:00Z')
    let price = 100000
    const move = { action: 'pump', startPrice: 100000, targetPrice: 120000, startedAt, endsAt }
    // Repeated ticks at the end of the window converge on the target. `now`
    // advances by a tick each call, matching how tick() actually invokes
    // this (real time moves forward) — nextCandle's sub-steps read the
    // drift target at instants leading up to `now`, so a `now` frozen at
    // exactly endsAt would leave the earliest sub-steps of every call still
    // just inside the window and short of full convergence.
    let now = endsAt.getTime()
    for (let i = 0; i < 40; i++) {
      price = svc.nextPrice({ currentPrice: price, volatility: 0, move }, now, noNoise)
      now += svc.TICK_MS
    }
    expect(price).toBe(120000)
  })
})

describe('nextCandle', () => {
  it('opens at the passed currentPrice', () => {
    const state = { currentPrice: 124780, volatility: 80, move: null }
    expect(svc.nextCandle(state, Date.now(), Math.random).o).toBe(124780)
  })

  it('keeps high >= max(open, close) and low <= min(open, close), fuzzed over 500 seeded candles', () => {
    const rand = mulberry32(7)
    let currentPrice = svc.BASELINE_PAISE
    let trendPrice = svc.BASELINE_PAISE
    for (let i = 0; i < 500; i++) {
      const candle = svc.nextCandle({ currentPrice, volatility: 90, move: null, trendPrice }, Date.now(), rand)
      expect(candle.h).toBeGreaterThanOrEqual(Math.max(candle.o, candle.c))
      expect(candle.l).toBeLessThanOrEqual(Math.min(candle.o, candle.c))
      currentPrice = candle.c
    }
  })

  it('collapses to a single flat point (o === h === l === c) at volatility 0 with no move', () => {
    const state = { currentPrice: 124780, volatility: 0, move: null }
    const candle = svc.nextCandle(state, Date.now(), Math.random)
    expect(candle.o).toBe(124780)
    expect(candle.h).toBe(124780)
    expect(candle.l).toBe(124780)
    expect(candle.c).toBe(124780)
  })

  it('produces wicks that out-measure bodies on average at full volatility — the property nextCandle exists for', () => {
    const rand = mulberry32(99)
    let currentPrice = svc.BASELINE_PAISE
    let trendPrice = svc.BASELINE_PAISE
    let totalWick = 0
    let totalBody = 0
    const iterations = 300
    for (let i = 0; i < iterations; i++) {
      const candle = svc.nextCandle({ currentPrice, volatility: 100, move: null, trendPrice }, Date.now(), rand)
      totalWick += candle.h - candle.l
      totalBody += Math.abs(candle.c - candle.o)
      currentPrice = candle.c
    }
    expect(totalWick / iterations).toBeGreaterThan(totalBody / iterations)
  })

  it('always returns four integers within the floor/ceiling bounds', () => {
    const rand = mulberry32(13)
    let currentPrice = svc.FLOOR_PAISE
    for (let i = 0; i < 200; i++) {
      const candle = svc.nextCandle({ currentPrice, volatility: 100, move: null }, Date.now(), rand)
      for (const v of [candle.o, candle.h, candle.l, candle.c]) {
        expect(Number.isInteger(v)).toBe(true)
        expect(v).toBeGreaterThanOrEqual(svc.FLOOR_PAISE)
        expect(v).toBeLessThanOrEqual(svc.CEILING_PAISE)
      }
      currentPrice = candle.c
    }
  })
})

describe('tick', () => {
  it('writes one price document and advances the stored state', async () => {
    await CoinIndexState.getSingleton()

    const result = await svc.tick()

    expect(await CoinPrice.countDocuments()).toBe(1)
    const state = await CoinIndexState.getSingleton()
    expect(state.currentPrice).toBe(result.price)
    expect(state.lastTickAt).toBeInstanceOf(Date)
  })

  it('clears an expired move so the index returns to free drift', async () => {
    const state = await CoinIndexState.getSingleton()
    state.move = {
      action: 'pump',
      startPrice: 100000,
      targetPrice: 120000,
      startedAt: new Date(Date.now() - 20 * 60_000),
      endsAt: new Date(Date.now() - 10 * 60_000),
    }
    await state.save()

    await svc.tick()

    expect((await CoinIndexState.getSingleton()).move).toBeNull()
  })

  it('advances the trend anchor alongside the price', async () => {
    await CoinIndexState.getSingleton()

    await svc.tick()

    const state = await CoinIndexState.getSingleton()
    expect(typeof state.trendPrice).toBe('number')
  })
})

describe('nextTrend', () => {
  it('is frozen at volatility 0, matching nextPrice\'s flat guarantee', () => {
    expect(svc.nextTrend(140000, 0, maxUp)).toBe(140000)
    expect(svc.nextTrend(140000, 0, maxDown)).toBe(140000)
  })

  it('moves in both directions when volatility is above zero', () => {
    expect(svc.nextTrend(124780, 100, maxUp)).toBeGreaterThan(124780)
    expect(svc.nextTrend(124780, 100, maxDown)).toBeLessThan(124780)
  })

  it('never returns a price below the floor or above the ceiling', () => {
    for (let i = 0; i < 500; i++) {
      expect(svc.nextTrend(svc.FLOOR_PAISE, 100, maxDown)).toBeGreaterThanOrEqual(svc.FLOOR_PAISE)
      expect(svc.nextTrend(svc.CEILING_PAISE, 100, maxUp)).toBeLessThanOrEqual(svc.CEILING_PAISE)
    }
  })

  it('pulls a displaced anchor back toward baseline over many neutral-noise ticks', () => {
    let trend = 200000 // well above baseline
    for (let i = 0; i < 200; i++) trend = svc.nextTrend(trend, 50, noNoise)
    expect(trend).toBeLessThan(200000)
    expect(Math.abs(trend - svc.BASELINE_PAISE)).toBeLessThan(Math.abs(200000 - svc.BASELINE_PAISE))
  })
})

describe('nextPrice mean reversion', () => {
  it('is a no-op when the caller omits trendPrice (back-compat: target defaults to currentPrice)', () => {
    const state = { currentPrice: 124780, volatility: 50, move: null }
    expect(svc.nextPrice(state, Date.now(), noNoise)).toBe(124780)
  })

  it('pulls the price toward an explicit trendPrice even with neutral noise', () => {
    const above = svc.nextPrice(
      { currentPrice: 140000, volatility: 100, move: null, trendPrice: 124780 }, Date.now(), noNoise
    )
    expect(above).toBeLessThan(140000)

    const below = svc.nextPrice(
      { currentPrice: 110000, volatility: 100, move: null, trendPrice: 124780 }, Date.now(), noNoise
    )
    expect(below).toBeGreaterThan(110000)
  })

  it('stays frozen even with a trendPrice set, when volatility is 0', () => {
    const state = { currentPrice: 100000, volatility: 0, move: null, trendPrice: 200000 }
    expect(svc.nextPrice(state, Date.now(), noNoise)).toBe(100000)
  })
})

// A tiny deterministic PRNG (mulberry32) so the regression test below is
// reproducible — a real Math.random source would make an occasional false
// pass/fail possible, however unlikely, and testing-principles calls for
// determinism over "very probably fine".
function mulberry32(seed) {
  let a = seed
  return function rand() {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('regression: the index does not just climb forever', () => {
  it('simulating a day of ticks produces a path that both rises above and falls below its starting price', () => {
    const rand = mulberry32(42)
    let currentPrice = svc.BASELINE_PAISE
    let trendPrice = svc.BASELINE_PAISE
    const volatility = 50
    let now = Date.now()

    let sawAbove = false
    let sawBelow = false

    // 2,880 ticks at 30s each ≈ 24 simulated hours.
    for (let i = 0; i < 2880; i++) {
      trendPrice = svc.nextTrend(trendPrice, volatility, rand)
      currentPrice = svc.nextPrice({ currentPrice, volatility, move: null, trendPrice }, now, rand)
      now += 30_000

      if (currentPrice > svc.BASELINE_PAISE) sawAbove = true
      if (currentPrice < svc.BASELINE_PAISE) sawBelow = true
    }

    // The old constant-upward-bias design could only ever produce sawAbove
    // (or, at the floor, get stuck) — it had no mechanism to turn around.
    expect(sawAbove).toBe(true)
    expect(sawBelow).toBe(true)
  })
})
