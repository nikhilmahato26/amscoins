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

test('initiate to a bank account stores bank fields and no upiId', async () => {
  const u = await makeFundedUser(200000)
  const w = await initiateWithdrawal(u, {
    amount: 100000,
    accountName: 'Me',
    accountNumber: '123456789',
    ifsc: 'HDFC0001234',
  })
  expect(w.method).toBe('bank')
  expect(w.accountNumber).toBe('123456789')
  expect(w.ifsc).toBe('HDFC0001234')
  expect(w.upiId).toBeUndefined()
})

test('initiate via a saved payout method id resolves the destination', async () => {
  const u = await makeFundedUser(200000)
  u.payoutMethods.push({ type: 'upi', upiId: 'saved@okicici', isDefault: true })
  await u.save()
  const w = await initiateWithdrawal(u, { amount: 100000, payoutMethodId: String(u.payoutMethods[0]._id) })
  expect(w.method).toBe('upi')
  expect(w.upiId).toBe('saved@okicici')
})

test('completing an already-completed withdrawal throws 409', async () => {
  const u = await makeFundedUser(100000)
  const w = await initiateWithdrawal(u, { amount: 100000, upiId: 'x@upi' })
  await completeWithdrawal(w._id, adminId)
  await expect(completeWithdrawal(w._id, adminId)).rejects.toMatchObject({ statusCode: 409 })
})

test('complete a bank withdrawal succeeds and clears no upiId', async () => {
  const u = await makeFundedUser(200000)
  const w = await initiateWithdrawal(u, {
    amount: 100000,
    accountName: 'Me',
    accountNumber: '123456789',
    ifsc: 'HDFC0001234',
  })
  const done = await completeWithdrawal(w._id, adminId)
  expect(done.status).toBe('completed')
  expect(done.method).toBe('bank')
  expect(done.upiId).toBeUndefined()
  expect((await Withdrawal.findById(w._id)).status).toBe('completed')
})
