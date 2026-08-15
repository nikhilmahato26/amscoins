process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function makeUser(overrides = {}) {
  const code = await generateUniqueCode()
  return User.create({ name: 'A', email: `a${Math.random()}@b.com`, passwordHash: 'x', referralCode: code, ...overrides })
}

test('generateUniqueCode returns a 6-char uppercase code', async () => {
  const code = await generateUniqueCode()
  expect(code).toMatch(/^[A-Z2-9]{6}$/)
})

test('user defaults: silver tier, count 0, not credited, active', async () => {
  const u = await makeUser()
  expect(u.tier).toBe('silver')
  expect(u.referralCount).toBe(0)
  expect(u.firstDepositCredited).toBe(false)
  expect(u.status).toBe('active')
})

test('email must be unique', async () => {
  await makeUser({ email: 'dup@b.com' })
  await expect(makeUser({ email: 'dup@b.com' })).rejects.toThrow()
})

test('wallet balance defaults to 0', async () => {
  const u = await makeUser()
  const w = await Wallet.create({ user: u._id })
  expect(w.balance).toBe(0)
})

test('a Google user can be created without a passwordHash', async () => {
  const u = await User.create({
    name: 'G', email: 'g@b.com', googleId: 'google-123', referralCode: 'ABC123',
  })
  expect(u.passwordHash).toBeUndefined()
  expect(u.googleId).toBe('google-123')
})

test('a non-Google user still requires a passwordHash', async () => {
  await expect(
    User.create({ name: 'P', email: 'p@b.com', referralCode: 'DEF456' })
  ).rejects.toThrow(/passwordHash/)
})
