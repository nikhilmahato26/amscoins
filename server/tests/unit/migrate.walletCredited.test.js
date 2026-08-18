const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const { markActiveAsCredited } = require('../../src/scripts/migrateWalletCredited')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

function inv(status) {
  return {
    user: new mongoose.Types.ObjectId(), planKey: 'silver', amount: 1000,
    returnPct: 25, expectedReturn: 250, referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`, status,
  }
}

test('marks only active investments as walletCredited, idempotently', async () => {
  await Investment.create(inv('active'))
  await Investment.create(inv('active'))
  await Investment.create(inv('pending'))
  const n1 = await markActiveAsCredited()
  expect(n1).toBe(2)
  const n2 = await markActiveAsCredited()
  expect(n2).toBe(0) // idempotent
  expect(await Investment.countDocuments({ status: 'pending', walletCredited: true })).toBe(0)
})
