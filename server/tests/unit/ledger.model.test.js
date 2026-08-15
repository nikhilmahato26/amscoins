process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const mongoose = require('mongoose')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const Investment = require('../../src/models/Investment')
const Withdrawal = require('../../src/models/Withdrawal')
const Transaction = require('../../src/models/Transaction')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const uid = () => new mongoose.Types.ObjectId()

test('investment referenceCode is unique', async () => {
  const base = { user: uid(), planKey: 'silver', amount: 100000, returnPct: 25, expectedReturn: 25000 }
  await Investment.create({ ...base, referenceCode: 'ASM-DUP' })
  await expect(Investment.create({ ...base, referenceCode: 'ASM-DUP' })).rejects.toThrow()
})

test('withdrawal stores gross/tds/net', async () => {
  const w = await Withdrawal.create({ user: uid(), gross: 100000, tds: 5000, net: 95000, upiId: 'x@upi' })
  expect(w.status).toBe('pending')
})

test('transaction rejects invalid direction', async () => {
  await expect(
    Transaction.create({ user: uid(), type: 'deposit', direction: 'sideways', amount: 100 })
  ).rejects.toThrow()
})
