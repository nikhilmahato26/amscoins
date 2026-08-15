'use strict'

const { rateLimit, ipKeyGenerator } = require('express-rate-limit')
const { RedisStore } = require('rate-limit-redis')
const { redis } = require('./redis')

function makeStore(prefix) {
  if (!redis) return undefined
  return new RedisStore({
    sendCommand: (...args) => redis.call(...args),
    prefix,
  })
}

const keyByUserId = (req) => (req.user?._id ? req.user._id.toString() : ipKeyGenerator(req))

const createHandler = (message) => (_req, res) =>
  res.status(429).json({ error: message })

// 1. Registration — IP based
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  store: makeStore('rl:reg:'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many registration attempts, please try again later'),
})

// 2. Login — IP based
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  store: makeStore('rl:login:'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many login attempts, please try again in 15 minutes'),
})

// 3. Investment Creation — User-ID based
const investmentCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 3,
  keyGenerator: keyByUserId,
  store: makeStore('rl:inv:'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Investment limit reached, please try again later'),
})

// 4. Withdrawal Creation — User-ID based
const withdrawalCreateLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 5,
  keyGenerator: keyByUserId,
  store: makeStore('rl:wd:'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Daily withdrawal limit reached, please try again tomorrow'),
})

// 5. Dashboard — User-ID based
const dashboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: keyByUserId,
  store: makeStore('rl:dash:'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many requests, please try again shortly'),
})

// 6. Wallet — User-ID based
const walletLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: keyByUserId,
  store: makeStore('rl:wallet:'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many requests, please try again shortly'),
})

// 7. Leaderboard — User-ID based
const leaderboardLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  keyGenerator: keyByUserId,
  store: makeStore('rl:lb:'),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: createHandler('Too many requests, please try again shortly'),
})

module.exports = {
  registerLimiter,
  loginLimiter,
  investmentCreateLimiter,
  withdrawalCreateLimiter,
  dashboardLimiter,
  walletLimiter,
  leaderboardLimiter,
}
