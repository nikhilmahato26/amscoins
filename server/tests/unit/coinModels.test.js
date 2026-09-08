process.env.JWT_SECRET = 'test'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const CoinPrice = require('../../src/models/CoinPrice')
const CoinIndexState = require('../../src/models/CoinIndexState')
const CoinAdminAction = require('../../src/models/CoinAdminAction')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

describe('CoinIndexState', () => {
  it('creates the singleton on first call with baseline defaults', async () => {
    const state = await CoinIndexState.getSingleton()
    expect(state.key).toBe('global')
    expect(state.currentPrice).toBe(124780)
    expect(state.volatility).toBe(35)
    expect(state.move).toBeNull()
  })

  it('returns the same document on a second call rather than creating another', async () => {
    const first = await CoinIndexState.getSingleton()
    first.currentPrice = 130000
    await first.save()

    const second = await CoinIndexState.getSingleton()
    expect(String(second._id)).toBe(String(first._id))
    expect(second.currentPrice).toBe(130000)
    expect(await CoinIndexState.countDocuments()).toBe(1)
  })
})

describe('CoinPrice', () => {
  it('stores a tick as an integer paise price against a timestamp', async () => {
    const at = new Date('2026-09-09T10:00:00Z')
    await CoinPrice.create({ t: at, price: 124780 })

    const found = await CoinPrice.findOne({ t: at })
    expect(found.price).toBe(124780)
  })
})

describe('CoinAdminAction', () => {
  it('records the price before and after an admin action', async () => {
    const row = await CoinAdminAction.create({
      action: 'pump',
      params: { size: 'medium', durationMinutes: 10 },
      priceBefore: 124780,
      priceAfter: 134762,
    })
    expect(row.action).toBe('pump')
    expect(row.params.size).toBe('medium')
    expect(row.priceAfter).toBe(134762)
  })

  it('rejects an action name outside the allowed set', async () => {
    await expect(
      CoinAdminAction.create({ action: 'nuke', priceBefore: 1, priceAfter: 1 })
    ).rejects.toThrow()
  })
})
