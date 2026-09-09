process.env.JWT_SECRET = 'test'
process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/test'

const bcrypt = require('bcryptjs')
const { setupDb, clearDb, teardownDb } = require('../helpers/db')
const Plan = require('../../src/models/Plan')
const Investment = require('../../src/models/Investment')
const User = require('../../src/models/User')
const Wallet = require('../../src/models/Wallet')
const { seedPlans } = require('../../src/seed/seedPlans')
const { canAccessPlan } = require('../../src/services/tierService')
const svc = require('../../src/services/investmentService')
const { generateUniqueCode } = require('../../src/services/referralCode')

beforeAll(setupDb)
beforeEach(seedPlans)
afterEach(clearDb)
afterAll(teardownDb)

describe('the ASM Coin plan', () => {
  it('is seeded with the agreed terms', async () => {
    const plan = await Plan.findOne({ key: 'asmcoin' })

    expect(plan.name).toBe('ASM Coin')
    expect(plan.returnPct).toBe(40)
    expect(plan.durationHours).toBe(168)
    expect(plan.minInvest).toBe(500000)
    expect(plan.maxInvest).toBe(50000000)
    expect(plan.unlockReferrals).toBe(0)
    expect(plan.installmentPcts).toEqual([])
    expect(plan.active).toBe(true)
  })

  it('leaves the three existing plans untouched', async () => {
    const silver = await Plan.findOne({ key: 'silver' })
    expect(silver).toBeTruthy()
    expect(await Plan.countDocuments()).toBe(4)
  })

  it('is accessible to a silver user, who has no referrals', () => {
    expect(canAccessPlan('silver', 'asmcoin')).toBe(true)
  })

  it('still gates gold and diamond behind tier', () => {
    expect(canAccessPlan('silver', 'gold')).toBe(false)
    expect(canAccessPlan('silver', 'diamond')).toBe(false)
    expect(canAccessPlan('diamond', 'gold')).toBe(true)
  })

  it('accepts asmcoin as an Investment planKey', async () => {
    const inv = await Investment.create({
      user: new (require('mongoose').Types.ObjectId)(),
      planKey: 'asmcoin',
      amount: 500000,
      returnPct: 40,
      expectedReturn: 700000,
      referenceCode: 'ASM-TEST-1',
      status: 'active',
    })
    expect(inv.planKey).toBe('asmcoin')
  })

  it('still rejects a nonsense plan key', async () => {
    await expect(
      Investment.create({
        user: new (require('mongoose').Types.ObjectId)(),
        planKey: 'platinum',
        amount: 500000,
        returnPct: 40,
        expectedReturn: 700000,
        referenceCode: 'ASM-TEST-2',
        status: 'active',
      })
    ).rejects.toThrow()
  })
})

describe('an ASM Coin investment', () => {
  async function makeUserAndAdmin() {
    const passwordHash = await bcrypt.hash('pass1234', 10)
    const user = await User.create({
      name: 'Investor',
      email: `u${Math.random()}@asm.com`,
      passwordHash,
      referralCode: await generateUniqueCode(),
      tier: 'silver',
    })
    const admin = await User.create({
      name: 'Admin',
      email: `a${Math.random()}@asm.com`,
      passwordHash,
      role: 'admin',
      referralCode: await generateUniqueCode(),
    })
    await Wallet.create({ user: user._id, balance: 0 })
    return { user, admin }
  }

  it('matures exactly 168 hours after approval and carries no installments', async () => {
    const { user, admin } = await makeUserAndAdmin()

    const created = await svc.createInvestment(user, { planKey: 'asmcoin', amount: 500000 })
    await svc.approveInvestment(created.investment._id, admin._id)

    const inv = await Investment.findById(created.investment._id)
    expect(inv.status).toBe('active')
    expect(new Date(inv.maturesAt) - new Date(inv.startAt)).toBe(168 * 3600 * 1000)
    expect(inv.installments).toHaveLength(0)
  })

  it('carries a 40% return, credited separately from the returned principal', async () => {
    const { user, admin } = await makeUserAndAdmin()

    const created = await svc.createInvestment(user, { planKey: 'asmcoin', amount: 500000 })
    await svc.approveInvestment(created.investment._id, admin._id)

    const inv = await Investment.findById(created.investment._id)
    expect(inv.returnPct).toBe(40)
    // expectedReturn is the PROFIT only (principal is credited separately by
    // approveReturn/runMature) — ₹5,000 × 40% = ₹2,000, not the ₹7,000 total payout.
    expect(inv.expectedReturn).toBe(200000)
  })

  it('leaves the wallet untouched until the return is approved', async () => {
    const { user, admin } = await makeUserAndAdmin()

    const created = await svc.createInvestment(user, { planKey: 'asmcoin', amount: 500000 })
    await svc.approveInvestment(created.investment._id, admin._id)

    const wallet = await Wallet.findOne({ user: user._id })
    expect(wallet.balance).toBe(0)
  })

  it('is investable by a silver user with zero referrals', async () => {
    const { user } = await makeUserAndAdmin()

    await expect(
      svc.createInvestment(user, { planKey: 'asmcoin', amount: 500000 })
    ).resolves.toBeTruthy()
  })

  it('still refuses a silver user the gold plan', async () => {
    const { user } = await makeUserAndAdmin()

    await expect(
      svc.createInvestment(user, { planKey: 'gold', amount: 500000 })
    ).rejects.toThrow()
  })

  it('is matured by the sweep once its 7-day term has elapsed', async () => {
    const { user, admin } = await makeUserAndAdmin()

    const created = await svc.createInvestment(user, { planKey: 'asmcoin', amount: 500000 })
    await svc.approveInvestment(created.investment._id, admin._id)

    // Backdate past maturity through the raw driver — maturesAt is set by
    // approveInvestment and Mongoose would ignore a $set on a re-saved doc.
    await Investment.collection.updateOne(
      { _id: created.investment._id },
      { $set: { maturesAt: new Date(Date.now() - 1000) } },
    )

    await svc.runMature(created.investment._id)

    const inv = await Investment.findById(created.investment._id)
    expect(inv.status).not.toBe('active')
  })
})

describe('canAccessPlan', () => {
  it('denies a plan key it does not recognise', () => {
    // planRank returns -1 for an unknown key, which every tier would out-rank.
    expect(canAccessPlan('diamond', 'platinum')).toBe(false)
    expect(canAccessPlan('silver', '')).toBe(false)
  })
})
