process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const { seedPlans } = require('../../src/seed/seedPlans')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function registerToken(referralCode) {
  const res = await request(app).post('/api/auth/register').send({ name: 'A', email: `a${Math.random()}@b.com`, password: 'secret1', referralCode })
  return res.body.token
}

test('create silver investment returns 201 + telegramLink', async () => {
  const token = await registerToken()
  const res = await request(app).post('/api/investments').set('Authorization', `Bearer ${token}`).send({ planKey: 'silver', amount: 200000 })
  expect(res.status).toBe(201)
  expect(res.body.telegramLink).toBeTruthy()
  expect(res.body.investment.referenceCode).toMatch(/^ASM-/)
})

test('gold plan is locked for a new silver user', async () => {
  const token = await registerToken()
  const res = await request(app).post('/api/investments').set('Authorization', `Bearer ${token}`).send({ planKey: 'gold', amount: 300000 })
  expect(res.status).toBe(403)
  expect(res.body.error).toBe('Plan locked')
})

test('wallet summary returns balance 0 for new user', async () => {
  const token = await registerToken()
  const res = await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body.balance).toBe(0)
})

test('referral overview returns own code and next tier target 21', async () => {
  const token = await registerToken()
  const res = await request(app).get('/api/referral').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body.referralCode).toHaveLength(6)
  expect(res.body.count).toBe(0)
  expect(res.body.nextTier).toBe('gold')
  expect(res.body.nextTierAt).toBe(21)
})

test('deposit-gate is open for a new user, pending after a deposit, and blocks a 2nd deposit (409)', async () => {
  const token = await registerToken()

  // Open before any deposit.
  const open = await request(app).get('/api/investments/deposit-gate').set('Authorization', `Bearer ${token}`)
  expect(open.status).toBe(200)
  expect(open.body.status).toBe('open')

  // First deposit succeeds.
  const first = await request(app).post('/api/investments').set('Authorization', `Bearer ${token}`).send({ planKey: 'silver', amount: 200000 })
  expect(first.status).toBe(201)
  // Notify payment submitted so the gate sees this deposit as blocking.
  await request(app).post(`/api/investments/${first.body.investment._id}/notify`).set('Authorization', `Bearer ${token}`)

  // Gate now reports pending, and a second deposit is refused with 409.
  const gated = await request(app).get('/api/investments/deposit-gate').set('Authorization', `Bearer ${token}`)
  expect(gated.body.status).toBe('pending')
  expect(gated.body.pendingInvestmentId).toBe(first.body.investment._id)

  const second = await request(app).post('/api/investments').set('Authorization', `Bearer ${token}`).send({ planKey: 'silver', amount: 200000 })
  expect(second.status).toBe(409)
  expect(second.body.error).toMatch(/awaiting approval/i)
})

test("returns 404 when fetching another user's investment by id", async () => {
  const token1 = await registerToken()
  const token2 = await registerToken()

  // user1 creates an investment
  const createRes = await request(app)
    .post('/api/investments')
    .set('Authorization', `Bearer ${token1}`)
    .send({ planKey: 'silver', amount: 200000 })
  expect(createRes.status).toBe(201)
  const investmentId = createRes.body.investment._id

  // user2 tries to fetch user1's investment — must get 404 (ownership guard)
  const res = await request(app)
    .get(`/api/investments/${investmentId}`)
    .set('Authorization', `Bearer ${token2}`)
  expect(res.status).toBe(404)
})
