process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'
const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Investment = require('../../src/models/Investment')
const invSvc = require('../../src/services/investmentService')
const { generateUniqueCode } = require('../../src/services/referralCode')
const { seedPlans } = require('../../src/seed/seedPlans')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

const bearer = (t) => ({ Authorization: `Bearer ${t}` })

async function makeAdminToken() {
  const code = await generateUniqueCode()
  const passwordHash = await bcrypt.hash('admin123', 10)
  await User.create({ name: 'Admin', email: 'admin@asm.com', passwordHash, role: 'admin', referralCode: code })
  const res = await request(app).post('/api/auth/login').send({ email: 'admin@asm.com', password: 'admin123' })
  return res.body.token
}

async function register(referralCode) {
  const res = await request(app).post('/api/auth/register').send({ name: 'U', email: `u${Math.random()}@b.com`, password: 'secret12', referralCode })
  return { token: res.body.token, user: res.body.user }
}

// Registers a fresh user with the referrer's code, deposits, and admin-approves
// their FIRST deposit -> credits one referral member to the referrer.
async function addReferralMember(referrerCode, adminToken) {
  const { token } = await register(referrerCode)
  const inv = await request(app).post('/api/investments').set(bearer(token)).send({ planKey: 'silver', amount: 200000 })
  await request(app).post(`/api/admin/investments/${inv.body.investment._id}/approve`).set(bearer(adminToken))
}

test('full lifecycle: deposit -> approve -> referral tier unlock -> withdraw', async () => {
  const adminToken = await makeAdminToken()

  // 1. Referrer R registers.
  const R = await register()

  // 2. First referred user U registers with R's code.
  const U = await register(R.user.referralCode)

  // 3. Gold is locked for U (silver tier).
  const plans = await request(app).get('/api/plans').set(bearer(U.token))
  const byKey = Object.fromEntries(plans.body.map((p) => [p.key, p.unlocked]))
  expect(byKey.gold).toBe(false)

  const goldAttempt = await request(app).post('/api/investments').set(bearer(U.token)).send({ planKey: 'gold', amount: 300000 })
  expect(goldAttempt.status).toBe(403)

  // 4. U deposits silver ₹2,000; admin approves.
  const inv = await request(app).post('/api/investments').set(bearer(U.token)).send({ planKey: 'silver', amount: 200000 })
  expect(inv.body.telegramLink).toBeTruthy()
  await request(app).post(`/api/admin/investments/${inv.body.investment._id}/approve`).set(bearer(adminToken))

  // 5. Lock-till-maturity: funds are NOT in the wallet at approval. Referral
  //    reward still fires. Then drive the investment to maturity + return so
  //    the wallet is credited principal (200000) + return (25% = 50000).
  expect((await request(app).get('/api/wallet').set(bearer(U.token))).body.balance).toBe(0)
  expect((await User.findById(R.user.id)).referralCount).toBe(1)

  // Silver now uses installments (installmentPcts=[10,10,10]), so runMature is
  // correctly skipped for it. Drive the investment to matured+returned directly
  // via admin approvePayout (the admin "pay now" path), which works for any
  // active investment regardless of plan type.
  await invSvc.approvePayout(inv.body.investment._id, null)
  const wallet = await request(app).get('/api/wallet').set(bearer(U.token))
  expect(wallet.body.balance).toBe(260000)

  // 6. U withdraws ₹1,000 -> net 95000, wallet 160000 (260000 - 100000).
  const wd = await request(app).post('/api/withdrawals').set(bearer(U.token)).send({ amount: 100000, upiId: 'u@upi' })
  expect(wd.body.net).toBe(95000)
  expect((await request(app).get('/api/wallet').set(bearer(U.token))).body.balance).toBe(160000)

  // 7. Admin completes the withdrawal.
  const complete = await request(app).post(`/api/admin/withdrawals/${wd.body._id}/complete`).set(bearer(adminToken))
  expect(complete.body.status).toBe('completed')

  // 8. Grow R to 21 members total (already 1 -> add 20 more) to unlock gold.
  for (let i = 0; i < 20; i++) await addReferralMember(R.user.referralCode, adminToken)
  const rFresh = await User.findById(R.user.id)
  expect(rFresh.referralCount).toBe(21)
  expect(rFresh.tier).toBe('gold')

  // 9. R now sees gold unlocked.
  const rPlans = await request(app).get('/api/plans').set(bearer(R.token))
  const rByKey = Object.fromEntries(rPlans.body.map((p) => [p.key, p.unlocked]))
  expect(rByKey.gold).toBe(true)
  expect(rByKey.diamond).toBeFalsy() // diamond is disabled (active: false) so absent from plans list
})
