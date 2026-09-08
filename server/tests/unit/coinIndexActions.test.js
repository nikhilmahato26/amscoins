process.env.JWT_SECRET = 'test'

const mongoose = require('mongoose')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const CoinIndexState = require('../../src/models/CoinIndexState')
const CoinAdminAction = require('../../src/models/CoinAdminAction')
const User = require('../../src/models/User')
const svc = require('../../src/services/coinIndexService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const adminId = new mongoose.Types.ObjectId()

describe('applyMove', () => {
  it('sets a pump target above the current price', async () => {
    await CoinIndexState.getSingleton()

    const state = await svc.applyMove({
      action: 'pump', size: 'medium', durationMinutes: 10, adminId,
    })

    expect(state.move.action).toBe('pump')
    expect(state.move.targetPrice).toBe(Math.round(124780 * 1.08))
    expect(state.move.startPrice).toBe(124780)
  })

  it('sets a crash target below the current price', async () => {
    await CoinIndexState.getSingleton()

    const state = await svc.applyMove({
      action: 'crash', size: 'hard', durationMinutes: 5, adminId,
    })

    expect(state.move.targetPrice).toBe(Math.round(124780 * 0.82))
    expect(state.move.targetPrice).toBeLessThan(124780)
  })

  it('ends the move window exactly durationMinutes after it starts', async () => {
    await CoinIndexState.getSingleton()

    const state = await svc.applyMove({
      action: 'pump', size: 'small', durationMinutes: 15, adminId,
    })

    const span = new Date(state.move.endsAt) - new Date(state.move.startedAt)
    expect(span).toBe(15 * 60_000)
  })

  it('clamps a pump target to the ceiling instead of exceeding it', async () => {
    const s = await CoinIndexState.getSingleton()
    s.currentPrice = svc.CEILING_PAISE
    await s.save()

    const state = await svc.applyMove({
      action: 'pump', size: 'hard', durationMinutes: 10, adminId,
    })

    expect(state.move.targetPrice).toBe(svc.CEILING_PAISE)
  })

  it('writes exactly one audit row naming the admin', async () => {
    await CoinIndexState.getSingleton()

    await svc.applyMove({ action: 'pump', size: 'medium', durationMinutes: 10, adminId })

    const rows = await CoinAdminAction.find()
    expect(rows).toHaveLength(1)
    expect(rows[0].action).toBe('pump')
    expect(String(rows[0].admin)).toBe(String(adminId))
    expect(rows[0].params.size).toBe('medium')
  })

  it('drives the price toward the target across repeated ticks', async () => {
    await CoinIndexState.getSingleton()
    await svc.applyMove({ action: 'pump', size: 'medium', durationMinutes: 1, adminId })

    for (let i = 0; i < 10; i++) await svc.tick()

    const state = await CoinIndexState.getSingleton()
    expect(state.currentPrice).toBeGreaterThan(124780)
  })
})

describe('setVolatility', () => {
  it('stores the new volatility and audits it', async () => {
    await CoinIndexState.getSingleton()

    const state = await svc.setVolatility(80, adminId)

    expect(state.volatility).toBe(80)
    const row = await CoinAdminAction.findOne({ action: 'volatility' })
    expect(row.params.value).toBe(80)
  })

  it('rejects a value outside 0-100', async () => {
    await CoinIndexState.getSingleton()
    await expect(svc.setVolatility(140, adminId)).rejects.toThrow()
    await expect(svc.setVolatility(-1, adminId)).rejects.toThrow()
  })
})

describe('resetIndex', () => {
  it('returns the price to baseline and clears any active move', async () => {
    const s = await CoinIndexState.getSingleton()
    s.currentPrice = 300000
    await s.save()
    await svc.applyMove({ action: 'crash', size: 'hard', durationMinutes: 10, adminId })

    const state = await svc.resetIndex(adminId)

    expect(state.currentPrice).toBe(svc.BASELINE_PAISE)
    expect(state.move).toBeNull()
  })
})

describe('listActions', () => {
  it('returns actions newest first with a total count', async () => {
    await CoinIndexState.getSingleton()
    await svc.setVolatility(40, adminId)
    await svc.setVolatility(50, adminId)

    const { rows, total } = await svc.listActions({ limit: 10, skip: 0 })

    expect(total).toBe(2)
    expect(rows[0].params.value).toBe(50)
  })
})
