process.env.JWT_SECRET = 'test'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const CoinPrice = require('../../src/models/CoinPrice')
const CoinIndexState = require('../../src/models/CoinIndexState')
const CoinAdminAction = require('../../src/models/CoinAdminAction')
const svc = require('../../src/services/coinIndexService')
const { resetCoinIndex, MAX_SEED_HOURS } = require('../../src/scripts/resetCoinIndex')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

/** A state that has drifted well away from every factory default. */
async function dirtyState() {
  const state = await CoinIndexState.getSingleton()
  state.currentPrice = 301000
  state.trendPrice = 295000
  state.volatility = 90
  state.move = {
    action: 'pump',
    startPrice: 240000,
    targetPrice: 320000,
    startedAt: new Date(Date.now() - 60_000),
    endsAt: new Date(Date.now() + 60_000),
  }
  state.lastTickAt = new Date()
  await state.save()
  return state
}

describe('resetCoinIndex', () => {
  it('deletes every stored tick, not just the ones inside a chart range', async () => {
    // One inside the 7d window and one well outside it — a range-scoped
    // delete would leave the second behind and the index would not really
    // be starting from zero.
    await CoinPrice.create([
      { t: new Date(Date.now() - 60_000), price: 130000 },
      { t: new Date(Date.now() - 30 * 86_400_000), price: 90000 },
    ])

    await resetCoinIndex()

    expect(await CoinPrice.countDocuments()).toBe(0)
  })

  it('returns the state to its factory defaults, including volatility and any active move', async () => {
    await dirtyState()

    await resetCoinIndex()

    const state = await CoinIndexState.getSingleton()
    expect(state.currentPrice).toBe(svc.BASELINE_PAISE)
    expect(state.trendPrice).toBe(svc.BASELINE_PAISE)
    expect(state.volatility).toBe(35)
    expect(state.move).toBeNull()
    expect(state.lastTickAt).toBeNull()
    // Exactly one singleton survives — a delete-and-recreate must not leave
    // a second 'global' row behind.
    expect(await CoinIndexState.countDocuments()).toBe(1)
  })

  it('leaves the admin audit trail alone by default', async () => {
    await CoinAdminAction.create({ action: 'pump', priceBefore: 124780, priceAfter: 134000 })

    await resetCoinIndex()

    expect(await CoinAdminAction.countDocuments()).toBe(1)
  })

  it('clears the admin audit trail only when explicitly asked', async () => {
    await CoinAdminAction.create({ action: 'pump', priceBefore: 124780, priceAfter: 134000 })

    await resetCoinIndex({ clearActions: true })

    expect(await CoinAdminAction.countDocuments()).toBe(0)
  })

  it('writes no history at all when no seed is requested — a true cold start', async () => {
    await CoinPrice.create({ t: new Date(), price: 130000 })

    const result = await resetCoinIndex()

    expect(result.seeded).toBe(0)
    expect(await CoinPrice.countDocuments()).toBe(0)
  })

  describe('when seeding history', () => {
    it('writes one tick per TICK_MS across the requested window', async () => {
      const { seeded } = await resetCoinIndex({ seedHours: 1 })

      expect(seeded).toBe(Math.floor(3_600_000 / svc.TICK_MS))
      expect(await CoinPrice.countDocuments()).toBe(seeded)
    })

    it('gives every seeded tick a full o/h/l, so candles have real wicks', async () => {
      await resetCoinIndex({ seedHours: 1 })

      const docs = await CoinPrice.find().sort({ t: 1 }).lean()
      for (const doc of docs) {
        expect(typeof doc.o).toBe('number')
        expect(typeof doc.h).toBe('number')
        expect(typeof doc.l).toBe('number')
        // The intra-tick extremes must actually bracket the open and close,
        // which is what makes bucketOHLC produce a wick rather than a nub.
        expect(doc.h).toBeGreaterThanOrEqual(Math.max(doc.o, doc.price))
        expect(doc.l).toBeLessThanOrEqual(Math.min(doc.o, doc.price))
      }
      // Not a flat line: a seed built from the live algorithm moves.
      expect(new Set(docs.map((d) => d.price)).size).toBeGreaterThan(1)
    })

    it('chains each tick onto the previous close, the way the live ticker does', async () => {
      await resetCoinIndex({ seedHours: 1 })

      const docs = await CoinPrice.find().sort({ t: 1 }).lean()
      for (let i = 1; i < docs.length; i++) {
        expect(docs[i].o).toBe(docs[i - 1].price)
        expect(docs[i].t.getTime() - docs[i - 1].t.getTime()).toBe(svc.TICK_MS)
      }
    })

    it('leaves the live price sitting exactly on the last seeded close', async () => {
      // The chart's right edge and the price shown above it come from
      // different places — the series' last candle and state.currentPrice.
      // If the seed doesn't hand off to the state they disagree on load.
      await resetCoinIndex({ seedHours: 1 })

      const state = await CoinIndexState.getSingleton()
      const last = await CoinPrice.findOne().sort({ t: -1 }).lean()
      expect(state.currentPrice).toBe(last.price)
      expect(state.lastTickAt.getTime()).toBe(last.t.getTime())
    })

    it('ends the seed at the present, so the chart is live the moment it loads', async () => {
      const before = Date.now()
      await resetCoinIndex({ seedHours: 1 })

      const last = await CoinPrice.findOne().sort({ t: -1 }).lean()
      expect(last.t.getTime()).toBeGreaterThanOrEqual(before - svc.TICK_MS)
      expect(last.t.getTime()).toBeLessThanOrEqual(Date.now())
    })

    it('refuses a window longer than the TTL keeps, rather than writing docs Mongo will reap', async () => {
      await expect(resetCoinIndex({ seedHours: MAX_SEED_HOURS + 1 })).rejects.toThrow(/TTL|expire|168/i)
    })
  })
})
