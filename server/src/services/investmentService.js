const mongoose = require('mongoose')
const Plan = require('../models/Plan')
const Investment = require('../models/Investment')
const User = require('../models/User')
const env = require('../config/env')
const walletService = require('./walletService')
const { creditReferralIfFirst } = require('./referralService')
const { canAccessPlan } = require('./tierService')
const { randomCode } = require('./referralCode')
const { ApiError } = require('../middleware/errorHandler')

async function uniqueRef() {
  for (let i = 0; i < 10; i++) {
    const ref = `ASM-${randomCode(8)}`
    if (!(await Investment.exists({ referenceCode: ref }))) return ref
  }
  throw new ApiError(500, 'Could not generate reference code')
}

async function createInvestment(user, { planKey, amount, referralCode }) {
  const plan = await Plan.findOne({ key: planKey, active: true })
  if (!plan) throw new ApiError(404, 'Plan not found')
  if (!canAccessPlan(user.tier, planKey)) throw new ApiError(403, 'Plan locked')
  if (amount < plan.minInvest || amount > plan.maxInvest) {
    throw new ApiError(400, 'Amount outside plan limits')
  }
  const isFirstDeposit = !user.firstDepositCredited
  const investment = await Investment.create({
    user: user._id,
    planKey,
    amount,
    returnPct: plan.returnPct,
    expectedReturn: Math.round((amount * plan.returnPct) / 100),
    referenceCode: await uniqueRef(),
    referralCodeUsed: isFirstDeposit && referralCode ? referralCode : null,
    isFirstDeposit,
    status: 'pending',
  })
  return { investment, telegramLink: env.TELEGRAM_LINK }
}

async function approveInvestment(investmentId, adminId) {
  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'pending') throw new ApiError(409, 'Investment already processed')
      const plan = await Plan.findOne({ key: inv.planKey }).session(session)
      const now = new Date()
      inv.status = 'active'
      inv.startAt = now
      inv.maturesAt = new Date(now.getTime() + plan.durationHours * 3600 * 1000)
      inv.approvedBy = adminId
      inv.approvedAt = now
      await inv.save({ session })
      await walletService.credit(
        inv.user,
        inv.amount,
        { type: 'deposit', actor: 'admin', note: `Deposit ${inv.referenceCode}`, ref: inv._id },
        session
      )
      const user = await User.findById(inv.user).session(session)
      await creditReferralIfFirst(user, session)
      result = inv
    })
    return result
  } finally {
    session.endSession()
  }
}

async function rejectInvestment(investmentId, adminId, note = '') {
  const inv = await Investment.findOneAndUpdate(
    { _id: investmentId, status: 'pending' },
    { $set: { status: 'rejected', approvedBy: adminId, approvedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) throw new ApiError(409, 'Investment not pending')
  return inv
}

module.exports = { createInvestment, approveInvestment, rejectInvestment }
