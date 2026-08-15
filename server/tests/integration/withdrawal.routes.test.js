process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const { credit } = require('../../src/services/walletService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function registerFunded(balance) {
  const reg = await request(app).post('/api/auth/register').send({ name: 'A', email: `a${Math.random()}@b.com`, password: 'secret1' })
  const user = await User.findOne({ email: reg.body.user.email })
  await credit(user._id, balance, { type: 'adjustment', actor: 'admin' })
  return reg.body.token
}

test('withdrawal returns 201 with tds and net', async () => {
  const token = await registerFunded(200000)
  const res = await request(app).post('/api/withdrawals').set('Authorization', `Bearer ${token}`).send({ amount: 100000, upiId: 'x@upi' })
  expect(res.status).toBe(201)
  expect(res.body.tds).toBe(5000)
  expect(res.body.net).toBe(95000)
})

test('withdrawal beyond balance is 400', async () => {
  const token = await registerFunded(10000)
  const res = await request(app).post('/api/withdrawals').set('Authorization', `Bearer ${token}`).send({ amount: 100000, upiId: 'x@upi' })
  expect(res.status).toBe(400)
  expect(res.body.error).toBe('Insufficient balance')
})
