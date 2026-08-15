process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const PasswordReset = require('../../src/models/PasswordReset')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('forgot-password always returns 200 (even for unknown email)', async () => {
  const res = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@b.com' })
  expect(res.status).toBe(200)
  expect(res.body.message).toBeTruthy()
})

test('end-to-end: request → verify → reset → login', async () => {
  await request(app).post('/api/auth/register').send({ name: 'A', email: 'r@b.com', password: 'oldpass1' })

  // request
  await request(app).post('/api/auth/forgot-password').send({ email: 'r@b.com' })

  // read + replace the stored (hashed) OTP with a known value we can submit
  const user = await User.findOne({ email: 'r@b.com' })
  await PasswordReset.updateOne({ user: user._id }, { otpHash: await bcrypt.hash('424242', 10) })

  const verify = await request(app).post('/api/auth/verify-otp').send({ email: 'r@b.com', otp: '424242' })
  expect(verify.status).toBe(200)
  expect(verify.body.resetToken).toBeTruthy()

  const reset = await request(app)
    .post('/api/auth/reset-password')
    .send({ resetToken: verify.body.resetToken, password: 'newpass1' })
  expect(reset.status).toBe(200)

  const oldLogin = await request(app).post('/api/auth/login').send({ email: 'r@b.com', password: 'oldpass1' })
  expect(oldLogin.status).toBe(401)
  const newLogin = await request(app).post('/api/auth/login').send({ email: 'r@b.com', password: 'newpass1' })
  expect(newLogin.status).toBe(200)
})

test('verify-otp with a non-numeric code is 400 (validation)', async () => {
  const res = await request(app).post('/api/auth/verify-otp').send({ email: 'r@b.com', otp: 'abcdef' })
  expect(res.status).toBe(400)
})

test('reset-password with invalid resetToken returns 400', async () => {
  const res = await request(app)
    .post('/api/auth/reset-password')
    .send({ resetToken: 'not-a-real-token', password: 'whatever1' })
  expect(res.status).toBe(400)
})
