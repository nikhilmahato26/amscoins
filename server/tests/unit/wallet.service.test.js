process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const Transaction = require('../../src/models/Transaction')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { credit, debit, getOrCreateWallet } = require('../../src/services/walletService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

async function makeUser() {
  const code = await generateUniqueCode()
  return User.create({ name: 'A', email: `a${Math.random()}@b.com`, passwordHash: 'x', referralCode: code })
}

test('credit increases balance and writes a settled credit txn', async () => {
  const u = await makeUser()
  await credit(u._id, 50000, { type: 'deposit', actor: 'admin' })
  expect((await Wallet.findOne({ user: u._id })).balance).toBe(50000)
  expect(await Transaction.countDocuments({ user: u._id, direction: 'credit' })).toBe(1)
})

test('debit reduces balance', async () => {
  const u = await makeUser()
  await credit(u._id, 50000, { type: 'deposit', actor: 'admin' })
  await debit(u._id, 20000, { type: 'withdrawal', actor: 'user' })
  expect((await Wallet.findOne({ user: u._id })).balance).toBe(30000)
})

test('debit beyond balance throws Insufficient balance', async () => {
  const u = await makeUser()
  await getOrCreateWallet(u._id)
  await expect(debit(u._id, 100, { type: 'withdrawal', actor: 'user' })).rejects.toThrow('Insufficient balance')
})

test('credit rejects non-positive amount', async () => {
  const u = await makeUser()
  await expect(credit(u._id, 0, { type: 'deposit' })).rejects.toThrow('positive')
})
