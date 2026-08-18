'use strict'

const { rateLimit, ipKeyGenerator, MemoryStore } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')
const { redis } = require('./redis')
const logger = require('../lib/logger').child({ service: 'rate-limit' })

/**
 * Rate limiting backed by Redis, degrading to per-process counters when Redis
 * is unreachable.
 *
 * A limiter runs ahead of nearly every route, so this used to take the whole
 * API down whenever Redis was not up: the client is created with
 * `enableOfflineQueue: false`, so `redis.call()` rejects with "Stream isn't
 * writeable and enableOfflineQueue options is false" for any status other than
 * `ready` — including the brief window during the startup handshake — and
 * express-rate-limit surfaces that rejection as a 500 on login, register and
 * the rest. Throttling is a protective layer; it has to fail open.
 *
 * The cost while Redis is down is that counters are process-local and start
 * from zero, so a multi-instance deployment allows roughly N× the configured
 * limit for that window. For a login throttle that is the right direction to
 * fail — the alternative is refusing every request.
 */

/** One warning per store per minute, so a sustained outage can't flood the log. */
const WARN_INTERVAL_MS = 60_000

class FailoverStore {
  constructor(prefix) {
    this.prefix = prefix
    /* Keys live in Redis on the happy path, so they are not process-local. */
    this.localKeys = false
    this.memory = new MemoryStore()
    this.redisStore = redis
      ? new RedisStore({ sendCommand: (...args) => redis.call(...args), prefix })
      : null
    this.options = null
    this.initPromise = null
    this.initialised = false
    this.lastWarnAt = 0
    this.degraded = false
  }

  init(options) {
    this.options = options
    this.memory.init(options)
    /*
     * Deliberately *not* initialising the Redis store here. `RedisStore.init`
     * eagerly SCRIPT LOADs, so with Redis down it throws during module load and
     * leaves `incrementScriptSha` as a permanently rejected promise — the store
     * would stay broken even after Redis came back. `ensureRedis` does it
     * lazily instead, and can retry.
     */
  }

  /**
   * Resolves true when the Redis store is connected and its scripts are loaded.
   * Retries the load on a later call if this attempt fails.
   */
  async ensureRedis() {
    if (!this.redisStore || !this.options) return false
    // ioredis only accepts commands once the handshake has completed.
    if (!redis || redis.status !== 'ready') {
      this.reportDegraded(`redis status: ${redis?.status ?? 'unavailable'}`)
      return false
    }
    if (this.initialised) return true

    if (!this.initPromise) this.initPromise = this.redisStore.init(this.options)
    try {
      await this.initPromise
      this.initialised = true
      return true
    } catch (err) {
      this.initPromise = null
      this.reportDegraded(err.message)
      return false
    }
  }

  async delegate(method, ...args) {
    if (await this.ensureRedis()) {
      try {
        const result = await this.redisStore[method](...args)
        if (this.degraded) {
          this.degraded = false
          logger.info('Redis recovered — rate limits are shared across instances again', {
            prefix: this.prefix,
          })
        }
        return result
      } catch (err) {
        /* The connection may have dropped mid-flight; reload scripts next time. */
        this.initialised = false
        this.initPromise = null
        this.reportDegraded(err.message)
      }
    }
    return this.memory[method](...args)
  }

  reportDegraded(reason) {
    this.degraded = true
    const now = Date.now()
    if (now - this.lastWarnAt < WARN_INTERVAL_MS) return
    this.lastWarnAt = now
    logger.warn('Redis unavailable — rate limiting fell back to in-memory counters', {
      prefix: this.prefix,
      reason,
    })
  }

  get(key) {
    return this.delegate('get', key)
  }

  increment(key) {
    return this.delegate('increment', key)
  }

  decrement(key) {
    return this.delegate('decrement', key)
  }

  resetKey(key) {
    return this.delegate('resetKey', key)
  }

  /* RedisStore implements neither of these, so both stay on the memory store. */
  resetAll() {
    return this.memory.resetAll()
  }

  shutdown() {
    return this.memory.shutdown()
  }
}

/** Each limiter needs its own instance — express-rate-limit rejects a shared store. */
function makeStore(prefix) {
  return new FailoverStore(prefix)
}

const keyByUserId = (req) => (req.user?._id ? req.user._id.toString() : ipKeyGenerator(req))

const createHandler = (message) => (_req, res) =>
  res.status(429).json({ error: message })

// Disable throttling under the test runner. Integration/e2e tests exercise
// business logic and legitimately make many requests from one IP; the limiters'
// own behaviour is covered separately in tests/unit/rateLimits.test.js.
const skipInTest = () => process.env.NODE_ENV === 'test'

// 1. Registration — IP based
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  store: makeStore('rl:reg:'),
  skip: skipInTest,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many registration attempts, please try again later'),
})

// 2. Login — IP based
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  store: makeStore('rl:login:'),
  skip: skipInTest,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many login attempts, please try again in 15 minutes'),
})

// 3. Forgot Password — IP based
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  store: makeStore('rl:forgot:'),
  skip: skipInTest,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many reset requests, please try again in 15 minutes'),
})

// 4. OTP Verify — IP based
const otpVerifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  store: makeStore('rl:otp:'),
  skip: skipInTest,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many attempts, please try again in 15 minutes'),
})

// 5. Investment Creation — User-ID based (temporarily disabled)
const investmentCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: keyByUserId,
  store: makeStore('rl:inv:'),
  skip: () => true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Investment limit reached, please try again later'),
})

// 6. Withdrawal Creation — User-ID based (temporarily disabled)
const withdrawalCreateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 5,
  keyGenerator: keyByUserId,
  store: makeStore('rl:wd:'),
  skip: () => true,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Daily withdrawal limit reached, please try again tomorrow'),
})

// 7. Dashboard — User-ID based
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: keyByUserId,
  store: makeStore('rl:dash:'),
  skip: skipInTest,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many requests, please try again shortly'),
})

// 8. Wallet — User-ID based
const walletLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: keyByUserId,
  store: makeStore('rl:wallet:'),
  skip: skipInTest,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many requests, please try again shortly'),
})

// 9. Leaderboard — User-ID based
const leaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: keyByUserId,
  store: makeStore('rl:lb:'),
  skip: skipInTest,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many requests, please try again shortly'),
})

module.exports = {
  registerLimiter,
  loginLimiter,
  forgotPasswordLimiter,
  otpVerifyLimiter,
  investmentCreateLimiter,
  withdrawalCreateLimiter,
  dashboardLimiter,
  walletLimiter,
  leaderboardLimiter,
}
