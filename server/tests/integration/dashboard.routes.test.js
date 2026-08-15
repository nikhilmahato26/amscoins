process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const { seedPlans } = require('../../src/seed/seedPlans')
const Investment = require('../../src/models/Investment')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function registerToken(referralCode) {
  const res = await request(app).post('/api/auth/register').send({ name: 'A', email: `a${Math.random()}@b.com`, password: 'secret1', referralCode })
  return res.body.token
}

test('GET /api/dashboard without auth returns 401', async () => {
  const res = await request(app).get('/api/dashboard')
  expect(res.status).toBe(401)
})

test('GET /api/dashboard with auth returns summary for user with no investments', async () => {
  const token = await registerToken()
  const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body.balance).toBe(0)
  expect(res.body.tier).toBe('silver')
  expect(res.body.referralCount).toBe(0)
  expect(res.body.totals.invested).toBe(0)
  expect(res.body.totals.expectedReturn).toBe(0)
  expect(res.body.totals.activeCount).toBe(0)
  expect(Array.isArray(res.body.activeInvestments)).toBe(true)
  expect(res.body.activeInvestments.length).toBe(0)
})

test('GET /api/dashboard with one active investment returns correct totals', async () => {
  // Parse token to get user ID
  const registerRes = await request(app).post('/api/auth/register').send({ name: 'B', email: `b${Math.random()}@b.com`, password: 'secret1' })
  const userId = registerRes.body.user.id
  const token2 = registerRes.body.token

  // Create an active investment directly
  const investmentAmount = 500000
  const expectedReturnAmount = 50000
  const startAt = new Date()
  const maturesAt = new Date(startAt.getTime() + 36 * 60 * 60 * 1000)

  const investment = await Investment.create({
    user: userId,
    planKey: 'silver',
    amount: investmentAmount,
    returnPct: 10,
    expectedReturn: expectedReturnAmount,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    status: 'active',
    startAt,
    maturesAt,
  })

  const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token2}`)
  expect(res.status).toBe(200)
  expect(res.body.balance).toBe(0)
  expect(res.body.tier).toBe('silver')
  expect(res.body.totals.invested).toBe(investmentAmount)
  expect(res.body.totals.expectedReturn).toBe(expectedReturnAmount)
  expect(res.body.totals.activeCount).toBe(1)
  expect(res.body.activeInvestments.length).toBe(1)
  expect(res.body.activeInvestments[0].id).toBe(investment._id.toString())
  expect(res.body.activeInvestments[0].planKey).toBe('silver')
  expect(res.body.activeInvestments[0].amount).toBe(investmentAmount)
  expect(res.body.activeInvestments[0].expectedReturn).toBe(expectedReturnAmount)
})

test('GET /api/dashboard includes wallet balance when wallet has balance', async () => {
  const registerRes = await request(app).post('/api/auth/register').send({ name: 'C', email: `c${Math.random()}@b.com`, password: 'secret1' })
  const userId = registerRes.body.user.id
  const token = registerRes.body.token

  // Update wallet balance directly
  const Wallet = require('../../src/models/Wallet')
  await Wallet.updateOne({ user: userId }, { $set: { balance: 200000 } }, { upsert: true })

  const res = await request(app).get('/api/dashboard').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body.balance).toBe(200000)
})
