const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const mongoose = require('mongoose')
const Investment = require('../../src/models/Investment')
const Wallet = require('../../src/models/Wallet')
const Transaction = require('../../src/models/Transaction')
const svc = require('../../src/services/investmentService')

beforeAll(setupDb)
afterEach(clearDb)
afterAll(teardownDb)

const adminId = new mongoose.Types.ObjectId()

async function maturedInv(extra = {}) {
  return Investment.create({
    user: new mongoose.Types.ObjectId(),
    planKey: 'silver',
    amount: 100000,
    returnPct: 25,
    expectedReturn: 25000,
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'matured',
    maturedAt: new Date(),
    ...extra,
  })
}

test('approveReturn credits principal + return once and marks returned', async () => {
  const inv = await maturedInv()
  await svc.approveReturn(inv._id, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(125000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
  expect(fresh.walletCredited).toBe(true)
  expect(fresh.creditedAmount).toBe(125000)
})

test('approveReturn on a legacy walletCredited row credits only the return', async () => {
  const inv = await maturedInv({ walletCredited: true })
  await svc.approveReturn(inv._id, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(25000) // return only, principal already paid
  const fresh = await Investment.findById(inv._id)
  expect(fresh.creditedAmount).toBe(25000)
})

test('approveReturn is rejected when not matured', async () => {
  const inv = await maturedInv({ status: 'active' })
  await expect(svc.approveReturn(inv._id, adminId)).rejects.toMatchObject({ statusCode: 409 })
})

test('rejectReturn credits a custom partial amount and marks rejected', async () => {
  const inv = await maturedInv()
  await svc.rejectReturn(inv._id, adminId, { reason: 'KYC mismatch', amount: 50000 })
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(50000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('rejected')
  expect(fresh.returnRejectionReason).toBe('KYC mismatch')
  expect(fresh.creditedAmount).toBe(50000)
})

test('rejectReturn with amount 0 credits nothing', async () => {
  const inv = await maturedInv()
  await svc.rejectReturn(inv._id, adminId, { reason: 'policy violation', amount: 0 })
  const w = await Wallet.findOne({ user: inv.user })
  expect(w).toBeNull() // no wallet created, no credit
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('rejected')
})

test('rejectReturn rejects an amount above principal+return', async () => {
  const inv = await maturedInv()
  await expect(
    svc.rejectReturn(inv._id, adminId, { reason: 'x', amount: 200000 })
  ).rejects.toMatchObject({ statusCode: 400 })
})
