process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const { register, login } = require('../../src/services/authService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('register hashes password, creates wallet, issues token', async () => {
  const { user, token } = await register({ name: 'A', email: 'a@b.com', password: 'secret1' })
  expect(user.passwordHash).not.toBe('secret1')
  expect(token).toBeTruthy()
  expect(await Wallet.findOne({ user: user._id })).toBeTruthy()
  expect(user.referralCode).toHaveLength(6)
})

test('register with valid referral code sets referredBy', async () => {
  const { user: referrer } = await register({ name: 'R', email: 'r@b.com', password: 'secret1' })
  const { user } = await register({ name: 'U', email: 'u@b.com', password: 'secret1', referralCode: referrer.referralCode })
  expect(String(user.referredBy)).toBe(String(referrer._id))
})

test('register with unknown referral code leaves referredBy null', async () => {
  const { user } = await register({ name: 'U', email: 'u2@b.com', password: 'secret1', referralCode: 'ZZZZZZ' })
  expect(user.referredBy).toBeNull()
})

test('duplicate email throws 409', async () => {
  await register({ name: 'A', email: 'dup@b.com', password: 'secret1' })
  await expect(register({ name: 'A', email: 'dup@b.com', password: 'secret1' })).rejects.toMatchObject({ statusCode: 409 })
})

test('login wrong password throws 401', async () => {
  await register({ name: 'A', email: 'l@b.com', password: 'secret1' })
  await expect(login({ email: 'l@b.com', password: 'wrong' })).rejects.toMatchObject({ statusCode: 401 })
})

test('login frozen account throws 403', async () => {
  const { user } = await register({ name: 'A', email: 'f@b.com', password: 'secret1' })
  await User.updateOne({ _id: user._id }, { status: 'frozen' })
  await expect(login({ email: 'f@b.com', password: 'secret1' })).rejects.toMatchObject({ statusCode: 403 })
})

test('login google-only account (no passwordHash) throws 401', async () => {
  await User.create({ name: 'G', email: 'g@login.com', googleId: 'g-login-1', referralCode: 'GLOG01' })
  await expect(login({ email: 'g@login.com', password: 'anything' })).rejects.toMatchObject({ statusCode: 401 })
})
