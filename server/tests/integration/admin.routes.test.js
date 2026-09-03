process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { seedPlans } = require('../../src/seed/seedPlans')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function adminToken() {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('admin123', 10)
  await User.create({ name: 'Admin', email: 'admin@asm.com', passwordHash, role: 'admin', referralCode: code })
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@asm.com', password: 'admin123' })
  return res.body.token
}

async function registerToken(referralCode) {
  const res = await request(app).post('/api/auth/register').send({ name: 'U', email: `u${Math.random()}@b.com`, password: 'secret12', referralCode })
  return { token: res.body.token, user: res.body.user }
}

test('non-admin is blocked from admin routes with 403', async () => {
  const { token } = await registerToken()
  const res = await request(app).get('/api/admin/investments').set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(403)
})

test('admin approves a deposit; funds stay locked and referrer incremented', async () => {
  const referrer = await registerToken()
  const { token: userToken } = await registerToken(referrer.user.referralCode)
  const inv = await request(app).post('/api/investments').set('Authorization', `Bearer ${userToken}`).send({ planKey: 'silver', amount: 200000 })
  await request(app).post(`/api/investments/${inv.body.investment._id}/notify`).set('Authorization', `Bearer ${userToken}`)

  const aToken = await adminToken()
  const pending = await request(app).get('/api/admin/investments?status=pending').set('Authorization', `Bearer ${aToken}`)
  expect(pending.body).toHaveLength(1)

  const approve = await request(app).post(`/api/admin/investments/${pending.body[0]._id}/approve`).set('Authorization', `Bearer ${aToken}`)
  expect(approve.status).toBe(200)

  const investorId = pending.body[0].user._id
  // Lock-till-maturity: principal is NOT credited at approval (wallet stays ₹0).
  const w = await Wallet.findOne({ user: investorId })
  expect(w == null || w.balance === 0).toBe(true)
  // Referral reward still fires at approval (unrelated to the investor's lock).
  expect((await User.findById(referrer.user.id)).referralCount).toBe(1)
})

test('admin can adjust a wallet balance', async () => {
  const { user } = await registerToken()
  const aToken = await adminToken()
  const res = await request(app)
    .post(`/api/admin/wallets/${user.id}/adjust`)
    .set('Authorization', `Bearer ${aToken}`)
    .send({ amount: 50000, direction: 'credit', note: 'bonus' })
  expect(res.status).toBe(200)
  expect(res.body.balance).toBe(50000)
})
