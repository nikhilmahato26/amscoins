process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const request = require('supertest')
const bcrypt = require('bcryptjs')
const mongoose = require('mongoose')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Investment = require('../../src/models/Investment')
const Wallet = require('../../src/models/Wallet')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { seedPlans } = require('../../src/seed/seedPlans')
const svc = require('../../src/services/investmentService')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function makeAdmin() {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('admin123', 10)
  const admin = await User.create({
    name: 'Admin',
    email: `admin${Math.random()}@asm.com`,
    passwordHash,
    role: 'admin',
    referralCode: code,
  })
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: admin.email, password: 'admin123' })
  return { admin, token: res.body.token }
}

async function makeUserWithWallet(overrides = {}) {
  const code = await generateUniqueCode()
  const u = await User.create({
    name: 'U',
    email: `u${Math.random()}@b.com`,
    passwordHash: 'x',
    referralCode: code,
    ...overrides,
  })
  await Wallet.create({ user: u._id, balance: 0 })
  return u
}

async function makeActiveInstallmentInvestment(user, admin) {
  const { investment } = await svc.createInvestment(user, { planKey: 'silver', amount: 200000 })
  await svc.approveInvestment(investment._id, admin._id)
  return Investment.findById(investment._id)
}

// ── POST /api/investments/:id/break (user) ────────────────────────────────────

test('POST /api/investments/:id/break returns 401 without auth', async () => {
  const id = new mongoose.Types.ObjectId()
  const res = await request(app).post(`/api/investments/${id}/break`)
  expect(res.status).toBe(401)
})

test('POST /api/investments/:id/break sets status to break_requested for an active investment', async () => {
  const { admin, token: adminToken } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  // Log in as the user to get a token
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('pass123', 10)
  const loginUser = await User.create({
    name: 'LoginUser',
    email: `login${Math.random()}@b.com`,
    passwordHash,
    referralCode: code,
  })
  await Wallet.create({ user: loginUser._id, balance: 0 })
  const { investment: loginInv } = await svc.createInvestment(loginUser, { planKey: 'silver', amount: 200000 })
  await svc.approveInvestment(loginInv._id, admin._id)

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: loginUser.email, password: 'pass123' })
  const userToken = loginRes.body.token

  const res = await request(app)
    .post(`/api/investments/${loginInv._id}/break`)
    .set('Authorization', `Bearer ${userToken}`)
  expect(res.status).toBe(200)
  expect(res.body.status).toBe('break_requested')
})

test('POST /api/investments/:id/break returns 409 if investment is not active', async () => {
  const passwordHash = await bcrypt.hash('pass123', 10)
  const code = await generateUniqueCode()
  const loginUser = await User.create({
    name: 'LU2',
    email: `lu2${Math.random()}@b.com`,
    passwordHash,
    referralCode: code,
  })
  await Wallet.create({ user: loginUser._id, balance: 0 })
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: loginUser.email, password: 'pass123' })
  const userToken = loginRes.body.token

  // Create a pending investment (not yet active)
  const { investment: pendingInv } = await svc.createInvestment(loginUser, {
    planKey: 'silver',
    amount: 200000,
  })

  const res = await request(app)
    .post(`/api/investments/${pendingInv._id}/break`)
    .set('Authorization', `Bearer ${userToken}`)
  expect(res.status).toBe(409)
})

// ── POST /api/admin/investments/:id/installments/:day/approve ─────────────────

test('POST /api/admin/investments/:id/installments/:day/approve returns 403 for non-admin', async () => {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('pass123', 10)
  const normalUser = await User.create({
    name: 'Normal',
    email: `normal${Math.random()}@b.com`,
    passwordHash,
    referralCode: code,
  })
  await Wallet.create({ user: normalUser._id, balance: 0 })
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: normalUser.email, password: 'pass123' })
  const userToken = loginRes.body.token

  const id = new mongoose.Types.ObjectId()
  const res = await request(app)
    .post(`/api/admin/investments/${id}/installments/1/approve`)
    .set('Authorization', `Bearer ${userToken}`)
  expect(res.status).toBe(403)
})

test('POST /api/admin/investments/:id/installments/:day/approve returns 400 for day=0', async () => {
  const { token } = await makeAdmin()
  const id = new mongoose.Types.ObjectId()
  const res = await request(app)
    .post(`/api/admin/investments/${id}/installments/0/approve`)
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(400)
  expect(res.body.message).toMatch(/day must be 1, 2, or 3/)
})

test('POST /api/admin/investments/:id/installments/:day/approve returns 400 for day=4', async () => {
  const { token } = await makeAdmin()
  const id = new mongoose.Types.ObjectId()
  const res = await request(app)
    .post(`/api/admin/investments/${id}/installments/4/approve`)
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(400)
})

test('POST /api/admin/investments/:id/installments/1/approve credits day 1 installment', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  // Set day 1 installment to 'available' directly (simulates the cron job running)
  await Investment.updateOne(
    { _id: inv._id, 'installments.day': 1 },
    { $set: { 'installments.$.status': 'available' } }
  )

  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/approve`)
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)

  const fresh = await Investment.findById(inv._id)
  expect(fresh.installments[0].status).toBe('paid')

  const wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(30000) // 15% of 200000 (day 1 of 50-50 over 48h)
})

// ── POST /api/admin/investments/:id/installments/:day/reject ──────────────────

// Flip a day to 'available' the way the timer/sweep does.
async function makeDayAvailable(invId, day) {
  await Investment.updateOne(
    { _id: invId, 'installments.day': day },
    { $set: { 'installments.$.status': 'available' } }
  )
}

test('POST /api/admin/investments/:id/installments/:day/reject requires a reason', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)
  await makeDayAvailable(inv._id, 1)

  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 0 })
  expect(res.status).toBe(400)
})

test('rejecting day 1 with amount 0 marks it rejected and credits nothing', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)
  await makeDayAvailable(inv._id, 1)

  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send({ reason: 'fraud suspected', amount: 0 })
  expect(res.status).toBe(200)

  const fresh = await Investment.findById(inv._id)
  expect(fresh.installments[0].status).toBe('rejected')
  expect(fresh.installments[0].rejectionReason).toBe('fraud suspected')
  expect(fresh.status).toBe('active') // day 2 still pending — cycle stays open

  const wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(0)
})

test('rejecting a day with a partial amount credits only that amount', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)
  await makeDayAvailable(inv._id, 1)

  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send({ reason: 'partial settlement', amount: 10000 })
  expect(res.status).toBe(200)

  const wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(10000)
})

test('rejecting a day cannot credit more than that day’s own return', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)
  await makeDayAvailable(inv._id, 1)

  // Day 1 of Silver on 200000 = 15% = 30000 paise.
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send({ reason: 'too much', amount: 30001 })
  expect(res.status).toBe(400)
})

test('rejecting a day that is not available yet returns 409', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send({ reason: 'too early', amount: 0 })
  expect(res.status).toBe(409)
})

test('rejecting an already rejected day returns 409', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)
  await makeDayAvailable(inv._id, 1)

  const body = { reason: 'declined', amount: 0 }
  await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send(body)
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send(body)
  expect(res.status).toBe(409)
})

test('a rejected day still lets the last decision return the principal and close the cycle', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  // Reject day 1 outright, then approve day 2 — the cycle must close.
  await makeDayAvailable(inv._id, 1)
  await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send({ reason: 'declined', amount: 0 })

  await makeDayAvailable(inv._id, 2)
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/2/approve`)
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)

  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')
  expect(fresh.walletCredited).toBe(true)

  // Day 2 return (30000) + principal (200000); day 1 was declined with no credit.
  const wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(230000)
})

test('rejecting the final undecided day also returns the principal', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  await makeDayAvailable(inv._id, 1)
  await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/1/approve`)
    .set('Authorization', `Bearer ${token}`)

  await makeDayAvailable(inv._id, 2)
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/installments/2/reject`)
    .set('Authorization', `Bearer ${token}`)
    .send({ reason: 'declined', amount: 0 })
  expect(res.status).toBe(200)

  const fresh = await Investment.findById(inv._id)
  expect(fresh.status).toBe('returned')

  // Day 1 return (30000) + principal (200000); day 2 declined with no credit.
  const wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(230000)
})

test('POST /api/admin/investments/:id/installments/:day/reject returns 403 for non-admin', async () => {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('pass123', 10)
  const normalUser = await User.create({
    name: 'N3',
    email: `n3${Math.random()}@b.com`,
    passwordHash,
    referralCode: code,
  })
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: normalUser.email, password: 'pass123' })
  const id = new mongoose.Types.ObjectId()
  const res = await request(app)
    .post(`/api/admin/investments/${id}/installments/1/reject`)
    .set('Authorization', `Bearer ${loginRes.body.token}`)
    .send({ reason: 'nope', amount: 0 })
  expect(res.status).toBe(403)
})

// ── POST /api/admin/investments/:id/approve-break ─────────────────────────────

test('POST /api/admin/investments/:id/approve-break returns 403 for non-admin', async () => {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('pass123', 10)
  const normalUser = await User.create({
    name: 'N2',
    email: `n2${Math.random()}@b.com`,
    passwordHash,
    referralCode: code,
  })
  await Wallet.create({ user: normalUser._id, balance: 0 })
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: normalUser.email, password: 'pass123' })
  const userToken = loginRes.body.token

  const id = new mongoose.Types.ObjectId()
  const res = await request(app)
    .post(`/api/admin/investments/${id}/approve-break`)
    .set('Authorization', `Bearer ${userToken}`)
  expect(res.status).toBe(403)
})

test('POST /api/admin/investments/:id/approve-break approves break and credits wallet', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  // User requests break via service directly
  await svc.requestBreak(inv._id, user._id)

  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/approve-break`)
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body.status).toBe('returned')

  // Principal should have been credited (200000)
  const wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBeGreaterThanOrEqual(200000)
})

test('POST /api/admin/investments/:id/approve-break returns 409 if no break pending', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  // Investment is active, not break_requested
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/approve-break`)
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(409)
})

// ── POST /api/admin/investments/:id/reject-break ──────────────────────────────

test('POST /api/admin/investments/:id/reject-break returns 403 for non-admin', async () => {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('pass123', 10)
  const normalUser = await User.create({
    name: 'N3',
    email: `n3${Math.random()}@b.com`,
    passwordHash,
    referralCode: code,
  })
  await Wallet.create({ user: normalUser._id, balance: 0 })
  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: normalUser.email, password: 'pass123' })
  const userToken = loginRes.body.token

  const id = new mongoose.Types.ObjectId()
  const res = await request(app)
    .post(`/api/admin/investments/${id}/reject-break`)
    .set('Authorization', `Bearer ${userToken}`)
  expect(res.status).toBe(403)
})

test('POST /api/admin/investments/:id/reject-break reverts status to active', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  await svc.requestBreak(inv._id, user._id)

  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/reject-break`)
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(200)
  expect(res.body.status).toBe('active')

  // Wallet should remain at 0 — nothing credited
  const wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(0)
})

test('POST /api/admin/investments/:id/reject-break returns 409 if no break pending', async () => {
  const { admin, token } = await makeAdmin()
  const user = await makeUserWithWallet()
  const inv = await makeActiveInstallmentInvestment(user, admin)

  // Still active, no break requested
  const res = await request(app)
    .post(`/api/admin/investments/${inv._id}/reject-break`)
    .set('Authorization', `Bearer ${token}`)
  expect(res.status).toBe(409)
})
