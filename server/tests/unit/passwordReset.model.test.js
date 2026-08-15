process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const PasswordReset = require('../../src/models/PasswordReset')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

test('stores a reset record with defaults', async () => {
  const r = await PasswordReset.create({
    user: new mongoose.Types.ObjectId(), otpHash: 'hashed', expiresAt: new Date(Date.now() + 60000),
  })
  expect(r.attempts).toBe(0)
  expect(r.verified).toBe(false)
})
