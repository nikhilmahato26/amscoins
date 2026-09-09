process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Investment = require('../../src/models/Investment')
const CoinPrice = require('../../src/models/CoinPrice')
const CoinIndexState = require('../../src/models/CoinIndexState')
const { generateUniqueCode } = require('../../src/services/referralCode')
const svc = require('../../src/services/coinIndexService')

beforeAll(setupDb)
afterEach(clearDb)
afterEach(() => require('../../src/services/coinIndexService')._resetInvestorCountCache())
afterAll(teardownDb)

async function makeUser() {
  const passwordHash = await bcrypt.hash('pass1234', 10)
  const user = await User.create({
    name: 'Investor',
    email: `u${Math.random()}@asm.com`,
    passwordHash,
    referralCode: await generateUniqueCode(),
  })
  const res = await request(app).post('/api/auth/login').send({ email: user.email, password: 'pass1234' })
  return { user, token: res.body.token }
}

/** Seed `count` ticks ending now, one per minute. */
async function seedTicks(count, priceFn = () => 124780) {
  const now = Date.now()
  const docs = []
  for (let i = count - 1; i >= 0; i--) {
    docs.push({ t: new Date(now - i * 60_000), price: priceFn(i) })
  }
  await CoinPrice.insertMany(docs)
}

describe('bucketOHLC', () => {
  it('turns each tick into its own candle when already short enough', () => {
    const docs = [{ t: 1, price: 1 }, { t: 2, price: 2 }, { t: 3, price: 3 }]
    const out = svc.bucketOHLC(docs, 10)
    expect(out).toHaveLength(3)
    expect(out[0]).toMatchObject({ o: 1, h: 1, l: 1, c: 1 })
  })

  it('reduces a long series to at most maxPoints candles', () => {
    const docs = Array.from({ length: 1000 }, (_, i) => ({ t: i, price: i }))
    const out = svc.bucketOHLC(docs, 100)
    expect(out.length).toBeLessThanOrEqual(100)
  })

  it('always closes the last candle with the very last tick, so the chart end matches the live price', () => {
    const docs = Array.from({ length: 1000 }, (_, i) => ({ t: i, price: i }))
    const out = svc.bucketOHLC(docs, 100)
    expect(out[out.length - 1].c).toBe(999)
  })

  it('aggregates open/high/low/close across the whole bucket, not just its two endpoints', () => {
    // A bucket whose extremes sit in the middle, not at either end — a
    // downsample that only kept endpoints would miss both.
    const docs = [
      { t: 1, price: 100 },
      { t: 2, price: 150 }, // high
      { t: 3, price: 80 }, // low
      { t: 4, price: 110 },
    ]
    const out = svc.bucketOHLC(docs, 1)
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ o: 100, h: 150, l: 80, c: 110 })
  })

  it('returns an empty array for an empty series', () => {
    expect(svc.bucketOHLC([], 100)).toEqual([])
  })
})

describe('GET /api/coin/index', () => {
  it('succeeds without authentication (public endpoint)', async () => {
    await CoinIndexState.getSingleton()
    const res = await request(app).get('/api/coin/index').expect(200)
    expect(res.body.current).toBeDefined()
  })

  it('returns the current price and a series', async () => {
    const { token } = await makeUser()
    await CoinIndexState.getSingleton()
    await seedTicks(120)

    const res = await request(app)
      .get('/api/coin/index?range=1h')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.current).toBe(124780)
    expect(Array.isArray(res.body.series)).toBe(true)
    expect(res.body.series.length).toBeGreaterThan(0)
    expect(res.body.series[0]).toHaveProperty('t')
    expect(res.body.series[0]).toHaveProperty('o')
    expect(res.body.series[0]).toHaveProperty('h')
    expect(res.body.series[0]).toHaveProperty('l')
    expect(res.body.series[0]).toHaveProperty('c')
  })

  it('rejects an unknown range', async () => {
    const { token } = await makeUser()
    await request(app)
      .get('/api/coin/index?range=99y')
      .set('Authorization', `Bearer ${token}`)
      .expect(400)
  })

  it('defaults to the 24h range when none is given', async () => {
    const { token } = await makeUser()
    await CoinIndexState.getSingleton()
    await seedTicks(10)

    const res = await request(app)
      .get('/api/coin/index')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.range).toBe('24h')
  })

  it('caps the 7d series at roughly 200 points however many ticks exist', async () => {
    const { token } = await makeUser()
    await CoinIndexState.getSingleton()
    await seedTicks(3000)

    const res = await request(app)
      .get('/api/coin/index?range=7d')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.series.length).toBeLessThanOrEqual(201)
  })

  it('reports high and low across the last 24 hours', async () => {
    const { token } = await makeUser()
    await CoinIndexState.getSingleton()
    await seedTicks(100, (i) => 120000 + i * 10)

    const res = await request(app)
      .get('/api/coin/index?range=24h')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.high24h).toBe(120990)
    expect(res.body.low24h).toBe(120000)
  })

  it('counts distinct users holding an active ASM Coin investment', async () => {
    const { token } = await makeUser()
    await CoinIndexState.getSingleton()
    await seedTicks(5)
    const a = await makeUser()
    const b = await makeUser()

    // Two investments for the same user must count once.
    await Investment.create([
      { user: a.user._id, planKey: 'silver', amount: 500000, returnPct: 40, expectedReturn: 700000, referenceCode: 'R1', status: 'active' },
      { user: b.user._id, planKey: 'silver', amount: 500000, returnPct: 40, expectedReturn: 700000, referenceCode: 'R2', status: 'active' },
      { user: b.user._id, planKey: 'silver', amount: 500000, returnPct: 40, expectedReturn: 700000, referenceCode: 'R3', status: 'active' },
    ])

    const res = await request(app)
      .get('/api/coin/index')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    // These investments are 'silver', not 'asmcoin' — they must not count.
    expect(res.body.investorCount).toBe(0)
  })

  it('counts a user holding an active ASM Coin investment', async () => {
    const { token } = await makeUser()
    await CoinIndexState.getSingleton()
    await seedTicks(5)
    const a = await makeUser()
    const b = await makeUser()

    await Investment.create([
      { user: a.user._id, planKey: 'asmcoin', amount: 500000, returnPct: 40, expectedReturn: 700000, referenceCode: 'A1', status: 'active' },
      { user: b.user._id, planKey: 'asmcoin', amount: 500000, returnPct: 40, expectedReturn: 700000, referenceCode: 'B1', status: 'active' },
      { user: b.user._id, planKey: 'asmcoin', amount: 500000, returnPct: 40, expectedReturn: 700000, referenceCode: 'B2', status: 'active' },
    ])
    require('../../src/services/coinIndexService')._resetInvestorCountCache()

    const res = await request(app)
      .get('/api/coin/index')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.investorCount).toBe(2) // two distinct users, not three investments
  })
})
