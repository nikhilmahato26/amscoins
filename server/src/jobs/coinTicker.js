'use strict'

const env = require('../config/env')
const coinIndexService = require('../services/coinIndexService')
const logger = require('../lib/logger').child({ service: 'coinTicker' })

/**
 * Heartbeat that advances the ASM Coin index.
 *
 * Deliberately a plain interval rather than a BullMQ repeatable job: the
 * existing queue schedules one-shot jobs keyed to an investment, which is a
 * different shape from a 30s heartbeat, and a repeatable job would need
 * cross-worker dedup. The index is decorative — a missed tick is invisible and
 * the next one corrects it — so the simpler mechanism is the right trade.
 *
 * If the API is ever scaled beyond one instance, gate this on an env flag so
 * only one process ticks; two tickers would double the tick rate, which looks
 * wrong but breaks nothing.
 */
function startCoinTicker({ intervalMs = coinIndexService.TICK_MS } = {}) {
  let running = false

  const handle = setInterval(async () => {
    // Skip if the previous tick is still in flight, so a slow database can
    // never pile up overlapping writes.
    if (running) return
    running = true
    try {
      await coinIndexService.tick()
    } catch (err) {
      // A failed tick must never kill the heartbeat.
      logger.warn('Coin index tick failed', { error: err.message })
    } finally {
      running = false
    }
  }, intervalMs)

  // Do not hold the process open on shutdown.
  if (handle.unref) handle.unref()

  logger.info('Coin index ticker started', { intervalMs })

  return { stop: () => clearInterval(handle) }
}

const isTickerEnabled = () => env.NODE_ENV !== 'test'

module.exports = { startCoinTicker, isTickerEnabled }
