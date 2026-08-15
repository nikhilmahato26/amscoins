process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const bcrypt = require('bcryptjs')
const User = require('../../src/models/User')
const PasswordReset = require('../../src/models/PasswordReset')
const svc = require('../../src/services/authService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function makeUser(over = {}) {
  return User.create({
    name: 'U', email: 'u@b.com', passwordHash: await bcrypt.hash('oldpass1', 10),
    referralCode: 'USR001', ...over,
  })
}

test('requestPasswordReset creates a hashed OTP record for a known user', async () => {
  await makeUser()
  await svc.requestPasswordReset('u@b.com')
  const rec = await PasswordReset.findOne({})
  expect(rec).toBeTruthy()
  expect(rec.otpHash).not.toMatch(/^\d{6}$/) // stored hashed, not plaintext
})

test('requestPasswordReset is silent for unknown email (no record)', async () => {
  await svc.requestPasswordReset('nobody@b.com')
  expect(await PasswordReset.countDocuments({})).toBe(0)
})

test('requestPasswordReset ignores admin accounts', async () => {
  await makeUser({ email: 'adm@b.com', role: 'admin', referralCode: 'ADM002' })
  await svc.requestPasswordReset('adm@b.com')
  expect(await PasswordReset.countDocuments({})).toBe(0)
})

test('full flow: verify OTP then reset password', async () => {
  const user = await makeUser()
  const otp = '654321'
  await PasswordReset.create({
    user: user._id, otpHash: await bcrypt.hash(otp, 10), expiresAt: new Date(Date.now() + 600000),
  })
  const { resetToken } = await svc.verifyResetOtp('u@b.com', otp)
  expect(resetToken).toBeTruthy()

  await svc.resetPassword(resetToken, 'brandnew1')
  const fresh = await User.findById(user._id)
  expect(await bcrypt.compare('brandnew1', fresh.passwordHash)).toBe(true)
  expect(await PasswordReset.countDocuments({ user: user._id })).toBe(0) // single-use
})

test('wrong OTP increments attempts and throws 400', async () => {
  const user = await makeUser()
  await PasswordReset.create({
    user: user._id, otpHash: await bcrypt.hash('111111', 10), expiresAt: new Date(Date.now() + 600000),
  })
  await expect(svc.verifyResetOtp('u@b.com', '000000')).rejects.toMatchObject({ statusCode: 400 })
  const rec = await PasswordReset.findOne({ user: user._id })
  expect(rec.attempts).toBe(1)
})

test('expired OTP throws 400', async () => {
  const user = await makeUser()
  await PasswordReset.create({
    user: user._id, otpHash: await bcrypt.hash('222222', 10), expiresAt: new Date(Date.now() - 1000),
  })
  await expect(svc.verifyResetOtp('u@b.com', '222222')).rejects.toMatchObject({ statusCode: 400 })
})

test('resetPassword rejects a token that was never OTP-verified', async () => {
  const user = await makeUser()
  const jwt = require('jsonwebtoken')
  const forged = jwt.sign({ id: user._id, purpose: 'pwreset' }, process.env.JWT_SECRET, { expiresIn: '15m' })
  await expect(svc.resetPassword(forged, 'brandnew1')).rejects.toMatchObject({ statusCode: 400 })
})
