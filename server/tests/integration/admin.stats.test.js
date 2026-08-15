process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Investment = require('../../src/models/Investment')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function adminToken() {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('admin123', 10)
  await User.create({ name: 'Admin', email: 'admin@asm.com', passwordHash, role: 'admin', referralCode: code })
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@asm.com', password: 'admin123' })
  return res.body.token
}

async function registerToken() {
  const res = await request(app).post('/api/auth/register').send({ name: 'U', email: `u${Math.random()}@b.com`, password: 'secret1' })
  return { token: res.body.token, id: res.body.user.id }
}

test('admin stats returns counts and totals', async () => {
  const { id } = await registerToken()
  await Investment.create({ user: id, planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000, referenceCode: `ASM-${Math.random()}`, status: 'pending' })
  const token = await adminToken()

  const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body.pendingDeposits).toBe(1)
  expect(res.body.users).toBeGreaterThanOrEqual(2)
  expect(typeof res.body.totals.invested).toBe('number')
  expect(typeof res.body.totals.walletLiability).toBe('number')
})

test('active investments and wallet balances are summed', async () => {
  const { id } = await registerToken()
  await Investment.create({ user: id, planKey: 'silver', amount: 300000, returnPct: 25, expectedReturn: 75000, referenceCode: `ASM-${Math.random()}`, status: 'active', startAt: new Date() })
  const Wallet = require('../../src/models/Wallet')
  await Wallet.updateOne({ user: id }, { $set: { balance: 150000 } }, { upsert: true })
  const token = await adminToken()

  const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`)
  expect(res.body.totals.invested).toBe(300000)
  expect(res.body.totals.walletLiability).toBe(150000)
})

test('non-admin is blocked with 403', async () => {
  const { token } = await registerToken()
  const res = await request(app).get('/api/admin/stats').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(403)
})
