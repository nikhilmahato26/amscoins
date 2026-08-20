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

async function makeUser(name) {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('secret1', 10)
  return User.create({ name, email: `${name}@b.com`, passwordHash, referralCode: code })
}

function invDoc(user, amount, status = 'active') {
  return {
    user: user._id, planKey: 'silver', amount, returnPct: 25, expectedReturn: Math.round(amount * 0.25),
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`, status,
  }
}

test('users list carries lifetime totalInvested and supports investor filter + sort', async () => {
  const aToken = await adminToken()
  const investor = await makeUser('investor')
  const nonInvestor = await makeUser('newbie')
  // Two investments across different statuses — both count toward lifetime total.
  // Rejected counts only when startAt is set (was approved, then return-rejected).
  await Investment.create(invDoc(investor, 200000, 'active'))
  await Investment.create({ ...invDoc(investor, 100000, 'rejected'), startAt: new Date() })

  const all = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${aToken}`)
  const byName = Object.fromEntries(all.body.map((u) => [u.name, u.totalInvested]))
  expect(byName.investor).toBe(300000) // sum across all statuses
  expect(byName.newbie).toBe(0)
  expect(byName.Admin).toBe(0)

  const investors = await request(app).get('/api/admin/users?investor=true').set('Authorization', `Bearer ${aToken}`)
  expect(investors.body.map((u) => u.name).sort()).toEqual(['investor'])

  const nonInvestors = await request(app).get('/api/admin/users?investor=false').set('Authorization', `Bearer ${aToken}`)
  expect(nonInvestors.body.map((u) => u.name).sort()).toEqual(['Admin', 'newbie'])

  const sorted = await request(app).get('/api/admin/users?sort=-invested').set('Authorization', `Bearer ${aToken}`)
  expect(sorted.body[0].name).toBe('investor') // highest first
})
