process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const Investment = require('../../src/models/Investment')
const { seedPlans } = require('../../src/seed/seedPlans')
const invSvc = require('../../src/services/investmentService')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

/**
 * The whole ASM Coin journey in one pass, as a brand-new user actually walks
 * it: sign up with no referrals, invest, get approved, wait out the 7 days,
 * and withdraw the proceeds without TDS.
 */
test('a referral-less user invests in ASM Coin and withdraws the proceeds tax-free', async () => {
  // ── Sign up. No referrals, so this user is silver — normally 5% TDS.
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'New Investor', email: `new${Math.random()}@asm.com`, password: 'secret12' })
    .expect(201)
  const token = reg.body.token
  const user = await User.findOne({ email: reg.body.user.email })
  expect(user.tier).toBe('silver')
  expect(user.referralCount ?? 0).toBe(0)

  const admin = await User.create({
    name: 'Admin',
    email: `adm${Math.random()}@asm.com`,
    passwordHash: await bcrypt.hash('pass1234', 10),
    role: 'admin',
    referralCode: await generateUniqueCode(),
  })

  // ── The plan is visible and unlocked despite zero referrals.
  const plans = await request(app).get('/api/plans').set('Authorization', `Bearer ${token}`).expect(200)
  const coinPlan = plans.body.find((p) => p.key === 'asmcoin')
  expect(coinPlan).toBeTruthy()
  expect(coinPlan.unlocked).toBe(true)
  expect(coinPlan.returnPct).toBe(40)
  expect(coinPlan.durationHours).toBe(168)

  // ── Invest ₹5,000.
  const created = await invSvc.createInvestment(user, { planKey: 'asmcoin', amount: 500000 })
  await invSvc.approveInvestment(created.investment._id, admin._id)

  let inv = await Investment.findById(created.investment._id)
  expect(inv.status).toBe('active')
  expect(new Date(inv.maturesAt) - new Date(inv.startAt)).toBe(168 * 3600 * 1000)

  // ── Nothing reaches the wallet before maturity.
  let wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(0)

  // ── Seven days pass.
  await Investment.collection.updateOne(
    { _id: inv._id },
    { $set: { maturesAt: new Date(Date.now() - 1000) } },
  )
  await invSvc.runMature(inv._id)

  // ── ₹5,000 principal + ₹2,000 profit, every paisa of it TDS-exempt.
  wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(700000)
  expect(wallet.tdsExemptPaise).toBe(700000)

  // ── The withdraw screen is told about the exemption so its preview matches.
  const summary = await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`).expect(200)
  expect(summary.body.tdsExemptPaise).toBe(700000)

  // ── Withdraw the whole ₹7,000. A silver user would normally lose 5% (₹350).
  const wd = await request(app)
    .post('/api/withdrawals')
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 700000, upiId: 'investor@upi' })
    .expect(201)

  expect(wd.body.tds).toBe(0)
  expect(wd.body.net).toBe(700000)
  expect(wd.body.tdsExemptUsed).toBe(700000)

  // ── The wallet is empty and the exemption is spent, not left behind.
  wallet = await Wallet.findOne({ user: user._id })
  expect(wallet.balance).toBe(0)
  expect(wallet.tdsExemptPaise).toBe(0)
})
