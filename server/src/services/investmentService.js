'use strict'

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
const logger = require('../lib/logger').child({ service: 'investment' })
const { cacheDel } = require('../config/redis')
const email = require('./emailService')

async function uniqueRef() {
  for (let i = 0; i < 10; i++) {
    const ref = `ASM-${randomCode(8)}`
    if (!(await Investment.exists({ referenceCode: ref }))) return ref
  }
  logger.error('Reference code generation exhausted after 10 attempts')
  throw new ApiError(500, 'Could not generate reference code')
}

async function createInvestment(user, { planKey, amount, referralCode }) {
  const plan = await Plan.findOne({ key: planKey, active: true })
  if (!plan) {
    logger.warn('Investment creation failed — plan not found', { planKey })
    throw new ApiError(404, 'Plan not found')
  }

  if (!canAccessPlan(user.tier, planKey)) {
    logger.warn('Investment creation failed — plan locked by tier', {
      userId: user._id,
      planKey,
      userTier: user.tier,
    })
    throw new ApiError(403, 'Plan locked')
  }

  if (amount < plan.minInvest || amount > plan.maxInvest) {
    logger.warn('Investment creation failed — amount outside plan limits', {
      userId: user._id,
      planKey,
      amount,
      minInvest: plan.minInvest,
      maxInvest: plan.maxInvest,
    })
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

  logger.info('Investment created', {
    investmentId: investment._id,
    userId: user._id,
    planKey,
    amount,
    referenceCode: investment.referenceCode,
  })

  await cacheDel('cache:admin:stats', `cache:dashboard:${user._id}`)

  email.depositSubmitted(user, investment, plan.name).catch(() => {}) // fire-and-forget

  return { investment, telegramLink: env.TELEGRAM_LINK }
}

async function approveInvestment(investmentId, adminId) {
  const session = await mongoose.startSession()
  try {
    let result
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'pending') {
        logger.warn('Investment approval failed — already processed', {
          investmentId,
          currentStatus: inv.status,
        })
        throw new ApiError(409, 'Investment already processed')
      }

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
      const referralResult = await creditReferralIfFirst(user, session)

      // Send approval notification after the transaction commits (below)
      result = { inv, user }

      logger.info('Investment approved', {
        investmentId: inv._id,
        userId: inv.user,
        adminId,
        amount: inv.amount,
        planKey: inv.planKey,
        referralCredited: referralResult.credited,
        referrerId: referralResult.referrerId,
      })
    })

    if (result) {
      await cacheDel(
        'cache:admin:stats',
        `cache:dashboard:${result.inv.user}`,
        `cache:wallet:${result.inv.user}`,
        'cache:leaderboard:daily',
        'cache:leaderboard:monthly',
        'cache:leaderboard:yearly'
      )
      email.depositApproved(result.user, result.inv).catch(() => {}) // fire-and-forget
    }

    return result?.inv
  } catch (err) {
    // Only log if it's an unexpected error (not a deliberate ApiError).
    if (!err.statusCode) {
      logger.error('Investment approval transaction failed', {
        investmentId,
        adminId,
        error: err.message,
        stack: err.stack,
      })
    }
    throw err
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
  if (!inv) {
    logger.warn('Investment rejection failed — not pending', { investmentId })
    throw new ApiError(409, 'Investment not pending')
  }

  logger.info('Investment rejected', { investmentId: inv._id, adminId, note })

  await cacheDel('cache:admin:stats', `cache:dashboard:${inv.user}`)

  return inv
}

module.exports = { createInvestment, approveInvestment, rejectInvestment }
