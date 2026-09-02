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

// ── Installment-plan tests ────────────────────────────────────────────────────

const { approveInstallment, requestBreak, approveBreak, rejectBreak } = require('../../src/services/investmentService')
const User = require('../../src/models/User')
const { generateUniqueCode } = require('../../src/services/referralCode')

async function makeUser() {
  const code = await generateUniqueCode()
  return User.create({ name: 'T', email: `t${Math.random()}@b.com`, passwordHash: 'x', referralCode: code })
}

async function installmentInv(extra = {}) {
  const user = await makeUser()
  return Investment.create({
    user: user._id,
    planKey: 'silver',
    amount: 100000,          // ₹1,000
    returnPct: 30,
    installmentPcts: [10, 10, 10],
    expectedReturn: 30000,   // ₹300
    referenceCode: `ASM-${Math.random().toString(36).slice(2, 10)}`,
    status: 'active',
    startAt: new Date(),
    installments: [
      { day: 1, pct: 10, amount: 10000, status: 'available', maturesAt: new Date(Date.now() - 1000) },
      { day: 2, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 86400000) },
      { day: 3, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 172800000) },
    ],
    ...extra,
  })
}

test('approveInstallment (day 1) credits installment amount, investment stays active', async () => {
  const inv = await installmentInv()
  await approveInstallment(inv._id, 1, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  expect(w.balance).toBe(10000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('active')
  expect(fresh.installments[0].status).toBe('paid')
  expect(fresh.creditedAmount).toBe(10000)
})

test('approveInstallment (day 3) credits installment + principal and marks returned', async () => {
  const inv = await installmentInv({
    installments: [
      { day: 1, pct: 10, amount: 10000, status: 'paid',      maturesAt: new Date(Date.now() - 172800000) },
      { day: 2, pct: 10, amount: 10000, status: 'paid',      maturesAt: new Date(Date.now() - 86400000) },
      { day: 3, pct: 10, amount: 10000, status: 'available', maturesAt: new Date(Date.now() - 1000) },
    ],
    creditedAmount: 20000, // days 1+2 already credited
  })
  await approveInstallment(inv._id, 3, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  // principal (100000) + day-3 installment (10000)
  expect(w.balance).toBe(110000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
  expect(fresh.creditedAmount).toBe(130000) // 20000 + 10000 + 100000
})

test('approveInstallment rejects when already paid', async () => {
  const inv = await installmentInv({
    installments: [
      { day: 1, pct: 10, amount: 10000, status: 'paid', maturesAt: new Date(Date.now() - 1000) },
      { day: 2, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 86400000) },
      { day: 3, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 172800000) },
    ],
  })
  await expect(approveInstallment(inv._id, 1, adminId)).rejects.toMatchObject({ statusCode: 409 })
})

test('requestBreak sets status to break_requested', async () => {
  const inv = await installmentInv()
  await requestBreak(inv._id, inv.user)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('break_requested')
  expect(fresh.breakRequestedAt).not.toBeNull()
})

test('approveBreak credits available installments + principal and marks returned', async () => {
  const inv = await installmentInv({
    status: 'break_requested',
    breakRequestedAt: new Date(),
    installments: [
      { day: 1, pct: 10, amount: 10000, status: 'available', maturesAt: new Date(Date.now() - 1000) },
      { day: 2, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 86400000) },
      { day: 3, pct: 10, amount: 10000, status: 'scheduled', maturesAt: new Date(Date.now() + 172800000) },
    ],
  })
  await approveBreak(inv._id, adminId)
  const w = await Wallet.findOne({ user: inv.user })
  // day 1 (available, 10000) + principal (100000) — days 2+3 not yet due
  expect(w.balance).toBe(110000)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
})

test('rejectBreak restores active status', async () => {
  const inv = await installmentInv({ status: 'break_requested', breakRequestedAt: new Date() })
  await rejectBreak(inv._id, adminId)
  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('active')
  expect(fresh.breakRequestedAt).toBeNull()
})
