process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const bcrypt = require('bcryptjs')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const { findOrCreateGoogleUser } = require('../../src/services/authService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('creates a new client user + wallet on first Google sign-in', async () => {
  const user = await findOrCreateGoogleUser({ googleId: 'gid-1', email: 'New@B.com', name: 'New' })
  expect(user.role).toBe('user')
  expect(user.email).toBe('new@b.com')
  expect(user.referralCode).toHaveLength(6)
  expect(await Wallet.findOne({ user: user._id })).toBeTruthy()
})

test('is idempotent — same googleId returns the same user', async () => {
  const a = await findOrCreateGoogleUser({ googleId: 'gid-2', email: 'a@b.com', name: 'A' })
  const b = await findOrCreateGoogleUser({ googleId: 'gid-2', email: 'a@b.com', name: 'A' })
  expect(String(a._id)).toBe(String(b._id))
  expect(await Wallet.countDocuments({ user: a._id })).toBe(1)
})

test('links googleId onto an existing password account with the same email', async () => {
  const existing = await User.create({
    name: 'P', email: 'link@b.com', passwordHash: await bcrypt.hash('secret1', 10), referralCode: 'LINK01',
  })
  const linked = await findOrCreateGoogleUser({ googleId: 'gid-3', email: 'link@b.com', name: 'P' })
  expect(String(linked._id)).toBe(String(existing._id))
  expect(linked.googleId).toBe('gid-3')
})

test('rejects admin accounts', async () => {
  await User.create({
    name: 'Adm', email: 'adm@b.com', role: 'admin',
    passwordHash: await bcrypt.hash('secret1', 10), referralCode: 'ADM001',
  })
  await expect(findOrCreateGoogleUser({ googleId: 'gid-4', email: 'adm@b.com', name: 'Adm' }))
    .rejects.toMatchObject({ statusCode: 403 })
})

test('rejects frozen accounts', async () => {
  await User.create({
    name: 'F', email: 'f@b.com', status: 'frozen', googleId: 'gid-5', referralCode: 'FRZ001',
  })
  await expect(findOrCreateGoogleUser({ googleId: 'gid-5', email: 'f@b.com', name: 'F' }))
    .rejects.toMatchObject({ statusCode: 403 })
})
