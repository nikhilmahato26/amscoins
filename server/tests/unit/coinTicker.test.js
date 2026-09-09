process.env.JWT_SECRET = 'test'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const CoinPrice = require('../../src/models/CoinPrice')
const CoinIndexState = require('../../src/models/CoinIndexState')
const { startCoinTicker } = require('../../src/jobs/coinTicker')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

describe('startCoinTicker', () => {
  it('writes a tick on each interval and stops cleanly', async () => {
    await CoinIndexState.getSingleton()

    const ticker = startCoinTicker({ intervalMs: 100 })

    // Wait for 2 ticks to fire (200ms + some buffer for async operations)
    await new Promise(resolve => setTimeout(resolve, 300))
    ticker.stop()
    const afterStop = await CoinPrice.countDocuments()

    // Wait to ensure no more ticks are written after stop
    await new Promise(resolve => setTimeout(resolve, 150))
    expect(await CoinPrice.countDocuments()).toBe(afterStop)
    expect(afterStop).toBeGreaterThanOrEqual(2)
  }, 15000)

  it('keeps ticking after a failed tick rather than dying', async () => {
    jest.useFakeTimers('modern')
    const svc = require('../../src/services/coinIndexService')
    const spy = jest.spyOn(svc, 'tick')
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ price: 1, at: new Date() })

    const ticker = startCoinTicker({ intervalMs: 1000 })
    await jest.advanceTimersByTimeAsync(1000)
    await jest.advanceTimersByTimeAsync(1000)
    ticker.stop()

    expect(spy).toHaveBeenCalledTimes(2)
    spy.mockRestore()
    jest.useRealTimers()
  })
})
