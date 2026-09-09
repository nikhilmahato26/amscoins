process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const request = require('supertest')
const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const app = require('../../src/app')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const Withdrawal = require('../../src/models/Withdrawal')
const Investment = require('../../src/models/Investment')
const { seedPlans } = require('../../src/seed/seedPlans')
const walletService = require('../../src/services/walletService')
const withdrawalService = require('../../src/services/withdrawalService')
const invSvc = require('../../src/services/investmentService')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

async function registerUser() {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ name: 'A', email: `a${Math.random()}@b.com`, password: 'secret12' })
  const user = await User.findOne({ email: reg.body.user.email })
  return { user, token: reg.body.token }
}

async function makeAdmin() {
  return User.create({
    name: 'Admin',
    email: `adm${Math.random()}@asm.com`,
    passwordHash: await bcrypt.hash('pass1234', 10),
    role: 'admin',
    referralCode: await generateUniqueCode(),
  })
}

describe('the TDS-exempt wallet sub-balance', () => {
  it('grows only when a credit is tagged exempt', async () => {
    const { user } = await registerUser()

    await walletService.credit(user._id, 100000, { type: 'adjustment', actor: 'admin' })
    let w = await Wallet.findOne({ user: user._id })
    expect(w.balance).toBe(100000)
    expect(w.tdsExemptPaise).toBe(0)

    await walletService.credit(user._id, 50000, { type: 'return', actor: 'admin', tdsExemptPaise: 50000 })
    w = await Wallet.findOne({ user: user._id })
    expect(w.balance).toBe(150000)
    expect(w.tdsExemptPaise).toBe(50000)
  })

  it('refuses a credit claiming more exempt money than the credit itself', async () => {
    const { user } = await registerUser()
    await expect(
      walletService.credit(user._id, 10000, { type: 'return', actor: 'admin', tdsExemptPaise: 20000 })
    ).rejects.toThrow(/exempt/i)
  })

  it('refuses a debit spending more exemption than the wallet holds', async () => {
    const { user } = await registerUser()
    await walletService.credit(user._id, 100000, { type: 'adjustment', actor: 'admin' })

    await expect(
      walletService.debit(user._id, 50000, { type: 'withdrawal', actor: 'user', tdsExemptUsed: 50000 })
    ).rejects.toThrow(/Insufficient balance/)

    const w = await Wallet.findOne({ user: user._id })
    expect(w.balance).toBe(100000) // the rejected debit changed nothing
  })
})

describe('an ASM Coin payout', () => {
  it('lands in the wallet as exempt money — principal and profit alike', async () => {
    const { user } = await registerUser()
    const admin = await makeAdmin()

    const created = await invSvc.createInvestment(user, { planKey: 'asmcoin', amount: 500000 })
    await invSvc.approveInvestment(created.investment._id, admin._id)
    await Investment.collection.updateOne(
      { _id: created.investment._id },
      { $set: { maturesAt: new Date(Date.now() - 1000) } },
    )
    await invSvc.runMature(created.investment._id)

    const w = await Wallet.findOne({ user: user._id })
    // ₹5,000 principal + ₹2,000 profit, all of it withdrawable TDS-free.
    expect(w.balance).toBe(700000)
    expect(w.tdsExemptPaise).toBe(700000)
  })

  it('leaves a silver plan payout fully taxable', async () => {
    const { user } = await registerUser()
    const admin = await makeAdmin()

    const created = await invSvc.createInvestment(user, { planKey: 'silver', amount: 100000 })
    await invSvc.approveInvestment(created.investment._id, admin._id)

    const w = await Wallet.findOne({ user: user._id })
    expect(w.tdsExemptPaise).toBe(0)
  })
})

describe('withdrawing exempt money', () => {
  async function fundedUser({ exempt = 0, taxable = 0 } = {}) {
    const { user, token } = await registerUser()
    if (taxable > 0) await walletService.credit(user._id, taxable, { type: 'adjustment', actor: 'admin' })
    if (exempt > 0) {
      await walletService.credit(user._id, exempt, { type: 'return', actor: 'admin', tdsExemptPaise: exempt })
    }
    return { user, token }
  }

  it('charges no TDS when the whole withdrawal is ASM Coin money', async () => {
    const { token } = await fundedUser({ exempt: 200000 })

    const res = await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, upiId: 'x@upi' })

    expect(res.status).toBe(201)
    expect(res.body.tds).toBe(0)
    expect(res.body.net).toBe(100000)
  })

  it('taxes only the portion beyond the exempt balance', async () => {
    // Silver pays 5%. ₹1,000 withdrawn against ₹600 exempt leaves ₹400 taxable.
    const { token } = await fundedUser({ exempt: 60000, taxable: 100000 })

    const res = await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, upiId: 'x@upi' })

    expect(res.status).toBe(201)
    expect(res.body.tds).toBe(2000) // 5% of ₹400, not of ₹1,000
    expect(res.body.net).toBe(98000)
  })

  it('spends the exemption so a second withdrawal is taxed in full', async () => {
    const { user, token } = await fundedUser({ exempt: 100000, taxable: 100000 })

    await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, upiId: 'x@upi' })
      .expect(201)

    const w = await Wallet.findOne({ user: user._id })
    expect(w.tdsExemptPaise).toBe(0)

    // Step past the one-per-12h cooldown; createdAt is immutable through
    // Mongoose, so backdate it with the raw driver.
    await Withdrawal.collection.updateMany(
      { user: user._id },
      { $set: { createdAt: new Date(Date.now() - 48 * 3600e3) } },
    )

    const second = await withdrawalService.initiateWithdrawal(
      await User.findById(user._id),
      { amount: 100000, upiId: 'x@upi' },
    )
    expect(second.tds).toBe(5000) // full silver rate — nothing exempt is left
  })

  it('restores the exemption when the withdrawal is rejected', async () => {
    const { user, token } = await fundedUser({ exempt: 100000 })
    const admin = await makeAdmin()

    const res = await request(app)
      .post('/api/withdrawals')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100000, upiId: 'x@upi' })
      .expect(201)

    let w = await Wallet.findOne({ user: user._id })
    expect(w.tdsExemptPaise).toBe(0)

    await withdrawalService.rejectWithdrawal(res.body._id, admin._id, 'wrong UPI')

    w = await Wallet.findOne({ user: user._id })
    // The refund must put back exempt money as exempt, not as taxable money.
    expect(w.balance).toBe(100000)
    expect(w.tdsExemptPaise).toBe(100000)

    const stored = await Withdrawal.findById(res.body._id)
    expect(stored.tdsExemptUsed).toBe(100000)
  })
})

describe('GET /api/wallet', () => {
  it('reports the exempt sub-balance so the client can preview the real TDS', async () => {
    const { user, token } = await registerUser()
    await walletService.credit(user._id, 70000, { type: 'return', actor: 'admin', tdsExemptPaise: 70000 })

    const res = await request(app).get('/api/wallet').set('Authorization', `Bearer ${token}`).expect(200)
    expect(res.body.tdsExemptPaise).toBe(70000)
  })
})
