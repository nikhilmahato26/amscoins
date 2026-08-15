'use strict'

const express = require('express')
const request = require('supertest')
const { rateLimit } = require('express-rate-limit')
const { cacheGet, cacheSet, cacheDel } = require('../../src/config/redis')

describe('Cache Helpers in degraded / test mode', () => {
  it('cacheGet returns null gracefully when redis is not running', async () => {
    const res = await cacheGet('test:key')
    expect(res).toBeNull()
  })

  it('cacheSet returns false gracefully when redis is not running', async () => {
    const res = await cacheSet('test:key', 'val', 10)
    expect(res).toBe(false)
  })

  it('cacheDel returns false gracefully when redis is not running', async () => {
    const res = await cacheDel('test:key')
    expect(res).toBe(false)
  })
})

describe('Rate limiters response contract', () => {
  it('returns draft-7 headers and throttles when limit is exceeded', async () => {
    const app = express()
    app.use(express.json())

    const testLimiter = rateLimit({
      windowMs: 60 * 1000,
      limit: 2,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      handler: (_req, res) => res.status(429).json({ error: 'Throttled test' }),
    })

    app.get('/test-limit', testLimiter, (_req, res) => res.json({ ok: true }))

    // First request
    const r1 = await request(app).get('/test-limit')
    expect(r1.status).toBe(200)
    expect(r1.headers['ratelimit-policy']).toBe('2;w=60')
    expect(r1.headers['ratelimit']).toContain('limit=2, remaining=1')

    // Second request
    const r2 = await request(app).get('/test-limit')
    expect(r2.status).toBe(200)
    expect(r2.headers['ratelimit']).toContain('limit=2, remaining=0')

    // Third request (throttled)
    const r3 = await request(app).get('/test-limit')
    expect(r3.status).toBe(429)
    expect(r3.body).toEqual({ error: 'Throttled test' })
  })
})
