process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const Investment = require('../../src/models/Investment')
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

async function maturedInvestment() {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('secret1', 10)
  const user = await User.create({ name: 'U', email: `u${Math.random()}@b.com`, passwordHash, referralCode: code })
  return Investment.create({
    user: user._id, planKey: 'silver', amount: 200000, returnPct: 25, expectedReturn: 50000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`, status: 'matured', maturedAt: new Date(),
  })
}

test('approve return credits wallet (principal + return) and marks returned', async () => {
  const aToken = await adminToken()
  const inv = await maturedInvestment()
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/return/approve`)
    .set('Authorization', `Bearer ${aToken}`)
  expect(res.status).toBe(200)
  expect((await Investment.findById(inv._id)).status).toBe('returned')
  expect((await Wallet.findOne({ user: inv.user })).balance).toBe(250000)
})

test('reject return requires a reason (400)', async () => {
  const aToken = await adminToken()
  const inv = await maturedInvestment()
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/return/reject`)
    .set('Authorization', `Bearer ${aToken}`)
    .send({ amount: 0 })
  expect(res.status).toBe(400)
})

test('reject return credits a custom partial amount and marks rejected', async () => {
  const aToken = await adminToken()
  const inv = await maturedInvestment()
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/return/reject`)
    .set('Authorization', `Bearer ${aToken}`)
    .send({ reason: 'partial', amount: 100000 })
  expect(res.status).toBe(200)
  expect((await Investment.findById(inv._id)).status).toBe('rejected')
  expect((await Wallet.findOne({ user: inv.user })).balance).toBe(100000)
})

test('list filters by a single and comma-separated status', async () => {
  const aToken = await adminToken()
  await maturedInvestment()
  const matured = await request(app)
    .get('/api/admin/investments?status=matured')
    .set('Authorization', `Bearer ${aToken}`)
  expect(matured.status).toBe(200)
  expect(matured.body.every((i) => i.status === 'matured')).toBe(true)

  const history = await request(app)
    .get('/api/admin/investments?status=returned,rejected')
    .set('Authorization', `Bearer ${aToken}`)
  expect(history.status).toBe(200)
  expect(history.body.every((i) => ['returned', 'rejected'].includes(i.status))).toBe(true)
})
