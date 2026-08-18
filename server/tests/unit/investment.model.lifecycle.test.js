const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Transaction = require('../../src/models/Transaction')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

function baseInv(extra = {}) {
  return {
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver',
    amount: 100000,
    returnPct: 25,
    expectedReturn: 25000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    ...extra,
  }
}

test('accepts the new lifecycle statuses', async () => {
  for (const status of ['pending', 'active', 'matured', 'returned', 'rejected']) {
    const inv = await Investment.create(baseInv({ status }))
    expect(inv.status).toBe(status)
  }
})

test('new fields default correctly', async () => {
  const inv = await Investment.create(baseInv())
  expect(inv.walletCredited).toBe(false)
  expect(inv.autoRejected).toBe(false)
  expect(inv.creditedAmount).toBe(0)
  expect(inv.returnRejectionReason).toBe('')
})

test('Transaction accepts type "return"', async () => {
  const txn = await Transaction.create({
    user: new mongoose.Types.ObjectId(),
    type: 'return',
    direction: 'credit',
    amount: 25000,
  })
  expect(txn.type).toBe('return')
})
