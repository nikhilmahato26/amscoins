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
    // Repeated ticks at the end of the window converge on the target.
    for (let i = 0; i < 40; i++) {
      price = svc.nextPrice({ currentPrice: price, volatility: 0, move }, endsAt.getTime(), noNoise)
    }
    expect(price).toBe(120000)
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
})
