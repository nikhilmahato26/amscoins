process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Investment = require('../../src/models/Investment')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function registerToken() {
  const res = await request(app).post('/api/auth/register').send({ name: 'TestUser', email: `user${Math.random()}@b.com`, password: 'secret1', referralCode: '' })
  return res.body.token
}

test('GET /api/leaderboard?period=yearly with auth returns 200 with entries', async () => {
  const token = await registerToken()

  // Create two active investments
  const code1 = await generateUniqueCode()
  const code2 = await generateUniqueCode()
  const u1 = await User.create({ name: 'Alice', email: `alice${Math.random()}@b.com`, passwordHash: 'x', referralCode: code1 })
  const u2 = await User.create({ name: 'Bob', email: `bob${Math.random()}@b.com`, passwordHash: 'x', referralCode: code2 })

  await Investment.create({ user: u1._id, planKey: 'silver', amount: 500000, returnPct: 25, expectedReturn: 125000,
    referenceCode: `ASM-${Math.random()}`, status: 'active', approvedAt: new Date(), startAt: new Date() })
  await Investment.create({ user: u2._id, planKey: 'silver', amount: 900000, returnPct: 25, expectedReturn: 225000,
    referenceCode: `ASM-${Math.random()}`, status: 'active', approvedAt: new Date(), startAt: new Date() })

  const res = await request(app).get('/api/leaderboard?period=yearly').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body.period).toBe('yearly')
  expect(res.body.entries.length).toBe(2)
  expect(res.body.entries[0].name).toBe('Bob')
  expect(res.body.entries[0].rank).toBe(1)
  expect(res.body.entries[0].totalInvested).toBe(900000)
  expect(res.body.entries[1].name).toBe('Alice')
})

test('GET /api/leaderboard?period=badvalue returns 400', async () => {
  const token = await registerToken()
  const res = await request(app).get('/api/leaderboard?period=badvalue').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(400)
  expect(res.body.error).toBe('Invalid period')
})

test('GET /api/leaderboard without auth header returns 401', async () => {
  const res = await request(app).get('/api/leaderboard')
  expect(res.status).toBe(401)
  expect(res.body.error).toBe('Authentication required')
})
