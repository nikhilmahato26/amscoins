process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const mongoose = require('mongoose')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const Withdrawal = require('../../src/models/Withdrawal')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { credit } = require('../../src/services/walletService')
const { initiateWithdrawal, completeWithdrawal, rejectWithdrawal } = require('../../src/services/withdrawalService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const adminId = new mongoose.Types.ObjectId()

async function makeFundedUser(balance) {
  const code = await generateUniqueCode()
  const u = await User.create({ name: 'A', email: `a${Math.random()}@b.com`, passwordHash: 'x', referralCode: code })
  await credit(u._id, balance, { type: 'adjustment', actor: 'admin' })
  return u
}

test('initiate debits gross and stores 5% TDS', async () => {
  const u = await makeFundedUser(200000)
  const w = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  expect(w.gross).toBe(100000)
  expect(w.tds).toBe(5000)
  expect(w.net).toBe(95000)
  expect((await Wallet.findOne({ user: u._id })).balance).toBe(100000)
})

test('initiate over balance throws Insufficient balance', async () => {
  const u = await makeFundedUser(50000)
  await expect(initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })).rejects.toThrow('Insufficient balance')
})

test('complete marks completed without changing wallet', async () => {
  const u = await makeFundedUser(100000)
  const w = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  await completeWithdrawal(w._id, adminId)
  expect((await Withdrawal.findById(w._id)).status).toBe('completed')
  expect((await Wallet.findOne({ user: u._id })).balance).toBe(0)
})

test('reject re-credits the gross amount', async () => {
  const u = await makeFundedUser(100000)
  const w = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  await rejectWithdrawal(w._id, adminId, 'bad details')
  expect((await Wallet.findOne({ user: u._id })).balance).toBe(100000)
  expect((await Withdrawal.findById(w._id)).status).toBe('rejected')
})

test('completing an already-completed withdrawal throws 409', async () => {
  const u = await makeFundedUser(100000)
  const w = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  await completeWithdrawal(w._id, adminId)
  await expect(completeWithdrawal(w._id, adminId)).rejects.toMatchObject({ statusCode: 409 })
})
