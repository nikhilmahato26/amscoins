'use strict'

process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { initiateWithdrawal } = require('../../src/services/withdrawalService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function userWithBalance(tier, balancePaise) {
  const referralCode = await generateUniqueCode()
  const user = await User.create({
    name: 'W', email: `w-${Date.now()}-${Math.random()}@t.com`,
    passwordHash: 'x', referralCode, tier,
  })
  await Wallet.create({ user: user._id, balance: balancePaise })
  return user
}

test('rejects a withdrawal above the silver tier limit', async () => {
  const user = await userWithBalance('silver', 10000000) // ₹1,00,000 balance
  await expect(
    initiateWithdrawal(user, { amount: 3000001, upiId: 'a@okhdfc' }) // ₹30,000.01
  ).rejects.toMatchObject({ statusCode: 400 })
})

test('allows a withdrawal at the diamond tier limit', async () => {
  const user = await userWithBalance('diamond', 20000000) // ₹2,00,000 balance
  const w = await initiateWithdrawal(user, { amount: 10000000, upiId: 'a@okhdfc' }) // ₹1,00,000
  expect(w.gross).toBe(10000000)
})
