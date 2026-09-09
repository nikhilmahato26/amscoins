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

describe('downsample', () => {
  it('returns the input untouched when it is already short enough', () => {
    const docs = [{ p: 1 }, { p: 2 }, { p: 3 }]
    expect(svc.downsample(docs, 10)).toHaveLength(3)
  })

  it('reduces a long series to at most maxPoints plus the final tick', () => {
    const docs = Array.from({ length: 1000 }, (_, i) => ({ p: i }))
    const out = svc.downsample(docs, 100)
    expect(out.length).toBeLessThanOrEqual(101)
  })

  it('always preserves the very last tick so the chart end matches the live price', () => {
    const docs = Array.from({ length: 1000 }, (_, i) => ({ p: i }))
    const out = svc.downsample(docs, 100)
    expect(out[out.length - 1].p).toBe(999)
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
    expect(res.body.series[0]).toHaveProperty('p')
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
