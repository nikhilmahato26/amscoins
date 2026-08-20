process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
process.env.PASSWORD_ENC_KEY = 'integration-test-key' // enable readable password capture
const request = require('supertest')
const bcrypt = require('bcryptjs')
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

test('a newly registered password is readable by an admin in the user view', async () => {
  const reg = await request(app).post('/api/auth/register').send({ name: 'Neha', email: 'neha@b.com', password: 'MyPass123' })
  const aToken = await adminToken()

  const detail = await request(app).get(`/api/admin/users/${reg.body.user.id}`).set('Authorization', `Bearer ${aToken}`)
  expect(detail.status).toBe(200)
  expect(detail.body.password).toBe('MyPass123')
  // Ciphertext must never leak on the user object.
  expect(detail.body.user.passwordEnc).toBeUndefined()
  expect(detail.body.user.passwordHash).toBeUndefined()
})

test('captures the password for a pre-existing account on next login', async () => {
  // Simulate an account created before the feature: hash only, no passwordEnc.
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('OldPass99', 10)
  const u = await User.create({ name: 'Old', email: 'old@b.com', passwordHash, referralCode: code })

  // Before login: nothing readable.
  const aToken = await adminToken()
  let detail = await request(app).get(`/api/admin/users/${u._id}`).set('Authorization', `Bearer ${aToken}`)
  expect(detail.body.password).toBeNull()

  // Log in once → password gets captured.
  const login = await request(app).post('/api/auth/login').send({ email: 'old@b.com', password: 'OldPass99' })
  expect(login.status).toBe(200)

  detail = await request(app).get(`/api/admin/users/${u._id}`).set('Authorization', `Bearer ${aToken}`)
  expect(detail.body.password).toBe('OldPass99')
})

test('the users list never leaks the password or its ciphertext', async () => {
  await request(app).post('/api/auth/register').send({ name: 'Neha', email: 'neha@b.com', password: 'MyPass123' })
  const aToken = await adminToken()

  const list = await request(app).get('/api/admin/users').set('Authorization', `Bearer ${aToken}`)
  for (const u of list.body) {
    expect(u.passwordEnc).toBeUndefined()
    expect(u.passwordHash).toBeUndefined()
    expect(u.password).toBeUndefined()
  }
})
