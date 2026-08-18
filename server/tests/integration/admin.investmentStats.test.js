process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
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

async function makeUser(name) {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('secret1', 10)
  return User.create({ name, email: `${name}${Math.random()}@b.com`, passwordHash, referralCode: code, publicId: `${name}-pub` })
}

function invDoc(user, extra = {}) {
  return {
    user: user._id, planKey: 'silver', amount: 100000, returnPct: 25, expectedReturn: 25000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`, ...extra,
  }
}

test('investment stats aggregates the dashboard metrics', async () => {
  const aToken = await adminToken()
  const u = await makeUser('alice')
  await Investment.create(invDoc(u, { status: 'pending' }))
  await Investment.create(invDoc(u, { status: 'active', maturesAt: new Date(Date.now() + 30 * 60 * 1000) })) // <1h
  await Investment.create(invDoc(u, { status: 'active', maturesAt: new Date(Date.now() + 10 * 3600 * 1000) })) // >1h
  await Investment.create(invDoc(u, { status: 'matured', maturedAt: new Date() }))
  await Investment.create(invDoc(u, { status: 'returned', returnDecidedAt: new Date() }))
  await Investment.create(invDoc(u, { status: 'rejected', returnDecidedAt: new Date() })) // a return-reject

  const res = await request(app).get('/api/admin/investments/stats').set('Authorization', `Bearer ${aToken}`)
  expect(res.status).toBe(200)
  expect(res.body.pendingApprovals).toBe(1)
  expect(res.body.returnsAwaiting).toBe(1)
  expect(res.body.aboutToComplete).toBe(1)
  expect(res.body.capitalUnderManagement).toBe(200000) // two active investments
  expect(res.body.approvalRate).toBe(50) // 1 returned / (1 returned + 1 rejected)
  expect(res.body.revenueThisMonth).toBe(25000) // one returned this month
})

test('list filters by tier + amount range and searches by user id', async () => {
  const aToken = await adminToken()
  const alice = await makeUser('alice')
  const bob = await makeUser('bob')
  await Investment.create(invDoc(alice, { planKey: 'silver', amount: 100000 }))
  await Investment.create(invDoc(bob, { planKey: 'gold', amount: 500000, returnPct: 30, expectedReturn: 150000 }))

  const gold = await request(app).get('/api/admin/investments?tier=gold').set('Authorization', `Bearer ${aToken}`)
  expect(gold.body).toHaveLength(1)
  expect(gold.body[0].planKey).toBe('gold')

  const range = await request(app).get('/api/admin/investments?amountMin=200000').set('Authorization', `Bearer ${aToken}`)
  expect(range.body).toHaveLength(1)
  expect(range.body[0].amount).toBe(500000)

  const search = await request(app).get('/api/admin/investments?q=user-alice-pub').set('Authorization', `Bearer ${aToken}`)
  expect(search.body).toHaveLength(1)
  expect(search.body[0].user.publicId).toBe('alice-pub')
})

test('list sorts by amount ascending', async () => {
  const aToken = await adminToken()
  const u = await makeUser('carol')
  await Investment.create(invDoc(u, { amount: 300000 }))
  await Investment.create(invDoc(u, { amount: 100000 }))
  const res = await request(app).get('/api/admin/investments?sort=amount').set('Authorization', `Bearer ${aToken}`)
  expect(res.body.map((i) => i.amount)).toEqual([100000, 300000])
})
