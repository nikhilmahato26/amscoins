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
    // Fake ONLY setInterval/clearInterval — the two primitives coinTicker.js
    // actually uses. Everything the MongoDB driver relies on internally
    // (setTimeout, Date, etc.) is left real via `doNotFake`, so the driver's
    // own socket/heartbeat timers (exercised here through
    // CoinIndexState.getSingleton() and coinIndexService.tick()'s real DB
    // writes) are unaffected while the ticker's interval is fully
    // controllable and deterministic.
    jest.useFakeTimers({
      doNotFake: [
        'Date', 'hrtime', 'nextTick', 'performance', 'queueMicrotask',
        'requestAnimationFrame', 'cancelAnimationFrame',
        'requestIdleCallback', 'cancelIdleCallback',
        'setImmediate', 'clearImmediate',
        'setTimeout', 'clearTimeout',
      ],
    })

    try {
      await CoinIndexState.getSingleton()

      const ticker = startCoinTicker({ intervalMs: 100 })

      // Advance virtual time in small, bounded steps rather than one big
      // jump: tick()'s real Mongo I/O (against mongodb-memory-server) takes
      // a variable, non-zero number of real event-loop turns to settle, and
      // a single advanceTimersByTimeAsync call is not guaranteed to drain
      // it before the interval's next virtual firing is due — the ticker's
      // own `running` guard would then skip that firing. Polling on the
      // real DB state with a hard iteration cap (never on wall-clock time)
      // keeps this deterministic: it terminates as soon as the condition is
      // met, and fails fast (not by hanging) if it never is.
      const waitUntil = async (predicate, { maxSteps = 50, stepMs = 20 } = {}) => {
        for (let i = 0; i < maxSteps; i++) {
          if (await predicate()) return
          await jest.advanceTimersByTimeAsync(stepMs)
        }
        throw new Error(`waitUntil: condition not met after ${maxSteps} steps`)
      }

      await waitUntil(async () => (await CoinPrice.countDocuments()) >= 2)

      ticker.stop()
      const afterStop = await CoinPrice.countDocuments()
      expect(afterStop).toBeGreaterThanOrEqual(2)

      // Ensure no more ticks are written after stop: advance well past
      // several would-be interval firings and confirm the count never
      // moves.
      for (let i = 0; i < 10; i++) {
        await jest.advanceTimersByTimeAsync(20)
        expect(await CoinPrice.countDocuments()).toBe(afterStop)
      }
    } finally {
      jest.useRealTimers()
    }
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
