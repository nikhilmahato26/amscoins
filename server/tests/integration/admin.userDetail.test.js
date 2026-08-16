process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
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

async function registerUser(name, email) {
  const res = await request(app).post('/api/auth/register').send({ name, email, password: 'secret1' })
  return res.body.user
}

test('admin can search users by publicId, name, and email', async () => {
  const user = await registerUser('Ravi Kumar', 'ravi@b.com')
  const aToken = await adminToken()
  const auth = { Authorization: `Bearer ${aToken}` }

  const byPublicId = await request(app).get(`/api/admin/users?q=${user.publicId}`).set(auth)
  expect(byPublicId.status).toBe(200)
  expect(byPublicId.body.map((u) => u.email)).toContain('ravi@b.com')

  const byName = await request(app).get('/api/admin/users?q=ravi').set(auth)
  expect(byName.body.map((u) => u.email)).toContain('ravi@b.com')

  const byEmail = await request(app).get('/api/admin/users?q=RAVI@B.com').set(auth)
  expect(byEmail.body.map((u) => u.email)).toContain('ravi@b.com')

  const noMatch = await request(app).get('/api/admin/users?q=zzzznomatch').set(auth)
  expect(noMatch.body).toHaveLength(0)
})

test('admin user detail returns profile, balance and history arrays', async () => {
  const user = await registerUser('Ravi Kumar', 'ravi2@b.com')
  const aToken = await adminToken()

  const detail = await request(app).get(`/api/admin/users/${user.id}`).set('Authorization', `Bearer ${aToken}`)
  expect(detail.status).toBe(200)
  expect(detail.body.user.email).toBe('ravi2@b.com')
  expect(detail.body.user.publicId).toMatch(/^ASM-/)
  expect(detail.body.balance).toBe(0)
  expect(Array.isArray(detail.body.investments)).toBe(true)
  expect(Array.isArray(detail.body.withdrawals)).toBe(true)
  expect(Array.isArray(detail.body.transactions)).toBe(true)
})

test('admin user detail for an unknown id is 404', async () => {
  const aToken = await adminToken()
  const res = await request(app)
    .get(`/api/admin/users/${new mongoose.Types.ObjectId()}`)
    .set('Authorization', `Bearer ${aToken}`)
  expect(res.status).toBe(404)
})
