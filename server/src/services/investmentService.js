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
const Settings = require('../models/Settings')

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

  return { investment, telegramLink: env.TELEGRAM_LINK, whatsappLink: env.WHATSAPP_LINK }
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

      const settings = await Settings.getSingleton()
      const now = new Date()
      inv.status = 'active'
      inv.startAt = now
      inv.maturesAt = new Date(now.getTime() + settings.cycleDurationHours * 3600 * 1000)
      inv.approvedBy = adminId
      inv.approvedAt = now
      await inv.save({ session })

      // NOTE: principal is intentionally NOT credited here. Funds stay locked
      // until maturity (see approveReturn / runMature). Job scheduling
      // (cancelAutoReject + scheduleMature) is wired in Task 5.

      const user = await User.findById(inv.user).session(session)
      const referralResult = user
        ? await creditReferralIfFirst(user, session)
        : { credited: false, referrerId: null }

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
      if (result.user) email.depositApproved(result.user, result.inv).catch(() => {}) // fire-and-forget
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

async function approveReturn(investmentId, adminId) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'matured') throw new ApiError(409, 'Investment not awaiting return')

      const wasCredited = inv.walletCredited
      let credited = 0
      if (!wasCredited) {
        await walletService.credit(
          inv.user, inv.amount,
          { type: 'deposit', actor: adminId ? 'admin' : 'system', note: `Principal ${inv.referenceCode}`, ref: inv._id },
          session
        )
        credited += inv.amount
      }
      await walletService.credit(
        inv.user, inv.expectedReturn,
        { type: 'return', actor: adminId ? 'admin' : 'system', note: `Return ${inv.referenceCode}`, ref: inv._id },
        session
      )
      credited += inv.expectedReturn

      inv.status = 'returned'
      inv.walletCredited = true
      inv.creditedAmount = credited
      inv.returnDecidedBy = adminId
      inv.returnDecidedAt = new Date()
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await cacheDel('cache:admin:stats', `cache:dashboard:${updated.user}`, `cache:wallet:${updated.user}`)
      logger.info('Return approved', { investmentId, adminId, creditedAmount: updated.creditedAmount })
    }
    return updated
  } finally {
    session.endSession()
  }
}

async function rejectReturn(investmentId, adminId, { reason, amount }) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'matured') throw new ApiError(409, 'Investment not awaiting return')
      const max = inv.amount + inv.expectedReturn
      if (amount < 0 || amount > max) throw new ApiError(400, 'Amount out of range')

      if (amount > 0) {
        await walletService.credit(
          inv.user, amount,
          { type: 'adjustment', actor: 'admin', note: `Return reject ${inv.referenceCode}: ${reason}`, ref: inv._id },
          session
        )
        inv.walletCredited = true
      }
      inv.status = 'rejected'
      inv.returnRejectionReason = reason
      inv.creditedAmount = amount
      inv.returnDecidedBy = adminId
      inv.returnDecidedAt = new Date()
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await cacheDel('cache:admin:stats', `cache:dashboard:${updated.user}`, `cache:wallet:${updated.user}`)
      logger.info('Return rejected', { investmentId, adminId, amount })
    }
    return updated
  } finally {
    session.endSession()
  }
}

async function runAutoReject(investmentId) {
  const inv = await Investment.findOneAndUpdate(
    { _id: investmentId, status: 'pending' },
    { $set: { status: 'rejected', autoRejected: true, rejectionReason: 'auto-rejected: approval timeout (8h)', approvedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) return null // already approved/processed — idempotent no-op
  await cacheDel('cache:admin:stats', `cache:dashboard:${inv.user}`)
  logger.info('Investment auto-rejected (8h timeout)', { investmentId }) // no email
  return inv
}

async function runMature(investmentId) {
  const inv = await Investment.findOneAndUpdate(
    { _id: investmentId, status: 'active' },
    { $set: { status: 'matured', maturedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) return null // not active — idempotent no-op
  await cacheDel('cache:admin:stats', `cache:dashboard:${inv.user}`)
  logger.info('Investment matured', { investmentId })

  if (process.env.WALLET_AUTO_CREDIT_ON_MATURITY === 'true') {
    // Reuse the return-approve credit path with a system actor (adminId = null).
    await approveReturn(inv._id, null)
  }
  return await Investment.findById(investmentId)
}

module.exports = { createInvestment, approveInvestment, rejectInvestment, approveReturn, rejectReturn, runAutoReject, runMature }
