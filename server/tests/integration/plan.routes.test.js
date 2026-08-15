process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const { seedPlans } = require('../../src/seed/seedPlans')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function registerToken() {
  const res = await request(app).post('/api/auth/register').send({ name: 'A', email: `a${Math.random()}@b.com`, password: 'secret1' })
  return res.body.token
}

test('silver user sees silver unlocked, gold/diamond locked', async () => {
  await seedPlans()
  const token = await registerToken()
  const res = await request(app).get('/api/plans').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  const byKey = Object.fromEntries(res.body.map((p) => [p.key, p.unlocked]))
  expect(byKey.silver).toBe(true)
  expect(byKey.gold).toBe(false)
  expect(byKey.diamond).toBe(false)
})

test('plans require auth', async () => {
  const res = await request(app).get('/api/plans')
  expect(res.status).toBe(401)
})
