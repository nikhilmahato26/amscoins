'use strict'

const mongoose = require('mongoose')
const Plan = require('../models/Plan')
const Investment = require('../models/Investment')
const User = require('../models/User')
const Transaction = require('../models/Transaction')
const Wallet = require('../models/Wallet')
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
const queue = require('../config/queue')

async function uniqueRef() {
  for (let i = 0; i < 10; i++) {
    const ref = `ASM-${randomCode(8)}`
    if (!(await Investment.exists({ referenceCode: ref }))) return ref
  }
  logger.error('Reference code generation exhausted after 10 attempts')
  throw new ApiError(500, 'Could not generate reference code')
}

/**
 * Build the WhatsApp and Telegram support links a user taps to send their
 * payment screenshot. Both channels are offered for every payment method
 * (INR and USDT alike), so the confirmation screen can always show both.
 *
 * Links are derived from the admin-configured Settings singleton
 * (`whatsappNumber` / `telegramUsername`), falling back to the env-level
 * links when a channel isn't configured there. The WhatsApp URL is prefilled
 * with the reference code; Telegram person-chats can't be prefilled.
 */
async function buildSupportLinks(investment) {
  let whatsappLink = ''
  let telegramLink = ''

  try {
    const settings = await Settings.getSingleton()

    const number = String(settings.whatsappNumber || '').replace(/\D/g, '')
    if (number) {
      const message = `ASM Coins deposit — Reference: ${investment.referenceCode}`
      whatsappLink = `https://wa.me/${number}?text=${encodeURIComponent(message)}`
    }

    const username = String(settings.telegramUsername || '').replace(/^@/, '')
    if (username) telegramLink = `https://t.me/${username}`
  } catch (err) {
    logger.warn('Failed to read Settings for support links; falling back to env', {
      reason: err.message,
    })
  }

  return {
    whatsappLink: whatsappLink || env.WHATSAPP_LINK,
    telegramLink: telegramLink || env.TELEGRAM_LINK,
  }
}

/**
 * Deposit gate for a user. Decides whether they may start a new deposit:
 *   - 'pending'  — they have a deposit still awaiting approval (always blocks).
 *   - 'cooldown' — their last APPROVED deposit was < depositCooldownHours ago.
 *   - 'open'     — they may deposit now.
 *
 * The cooldown is anchored on `startAt`, which is set ONLY when a deposit is
 * approved (never on rejection/auto-reject) — so a rejected deposit lets the
 * user retry immediately, while an approval starts the wait. Read-only; used
 * both to enforce (createInvestment) and to render the UI (GET /deposit-gate).
 */
async function getDepositGate(userId) {
  const pending = await Investment.findOne({ user: userId, status: 'pending', paymentNotified: { $ne: false } })
    .select('_id createdAt')
    .lean()
  if (pending) {
    return { status: 'pending', pendingInvestmentId: String(pending._id), since: pending.createdAt }
  }

  const settings = await Settings.getSingleton()
  const cooldownMs = settings.depositCooldownHours * 3600e3
  if (cooldownMs > 0) {
    const lastApproved = await Investment.findOne({ user: userId, startAt: { $ne: null } })
      .sort({ startAt: -1 })
      .select('startAt')
      .lean()
    if (lastApproved && lastApproved.startAt) {
      const cooldownUntil = new Date(new Date(lastApproved.startAt).getTime() + cooldownMs)
      if (cooldownUntil > new Date()) {
        return { status: 'cooldown', cooldownUntil: cooldownUntil.toISOString() }
      }
    }
  }

  return { status: 'open' }
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

  // Per-user deposit gate: one deposit at a time, plus a post-approval cooldown.
  // Only notified (paymentNotified: true) investments block the gate — unnotified
  // drafts are transient and cleaned up below before the new record is created.
  const gate = await getDepositGate(user._id)
  if (gate.status === 'pending') {
    logger.warn('Investment creation blocked — deposit already pending', { userId: user._id })
    throw new ApiError(409, 'You already have a deposit awaiting approval')
  }
  if (gate.status === 'cooldown') {
    logger.warn('Investment creation blocked — deposit cooldown active', { userId: user._id, until: gate.cooldownUntil })
    throw new ApiError(429, 'Please wait for the deposit cooldown to finish before depositing again')
  }

  // Delete any unnotified draft the user left hanging (e.g. backed out of pay
  // screen to change method). The new record replaces it.
  await Investment.deleteMany({ user: user._id, status: 'pending', paymentNotified: false })

  const isFirstDeposit = !user.firstDepositCredited
  const investment = await Investment.create({
    user: user._id,
    planKey,
    amount,
    returnPct: plan.returnPct,
    installmentPcts: plan.installmentPcts || [],
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

  // The investment record is a draft at this point (paymentNotified: false).
  // The deposit is not submitted for review yet — email, timers, and the gate
  // lock all fire in notifyPaymentSubmitted once the user taps "I've paid".

  const { whatsappLink, telegramLink } = await buildSupportLinks(investment)
  return { investment, telegramLink, whatsappLink }
}

/**
 * Called when the user confirms they have paid (tapped "I've paid" on the pay
 * screen). This is the point the deposit is actually submitted for review, so
 * the confirmation email fires here rather than at record creation. Idempotent
 * and safe to call once per pending investment.
 */
async function notifyPaymentSubmitted(user, investmentId) {
  const investment = await Investment.findOne({ _id: investmentId, user: user._id })
  if (!investment) throw new ApiError(404, 'Investment not found')

  // Mark as submitted — this is the moment the deposit enters the admin queue.
  // Idempotent: calling again on an already-notified investment is harmless.
  if (!investment.paymentNotified) {
    investment.paymentNotified = true
    await investment.save()
    // Start auto-reject and auto-deposit timers now that the deposit is live.
    await queue.scheduleAutoReject(investment)
    await queue.scheduleAutoDeposit(investment)
  }

  const plan = await Plan.findOne({ key: investment.planKey })
  email.depositSubmitted(user, investment, plan?.name ?? investment.planKey).catch(() => {}) // fire-and-forget

  const { whatsappLink, telegramLink } = await buildSupportLinks(investment)
  return { investment, telegramLink, whatsappLink }
}

async function approveInvestment(investmentId, adminId, { auto = false } = {}) {
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
      if (inv.installmentPcts && inv.installmentPcts.length > 0) {
        // Build installments so their amounts sum exactly to expectedReturn.
        const pcts = inv.installmentPcts
        const partialAmounts = pcts.slice(0, -1).map((pct) => Math.round((inv.amount * pct) / 100))
        const lastAmount = inv.expectedReturn - partialAmounts.reduce((s, a) => s + a, 0)
        inv.installments = pcts.map((pct, i) => ({
          day: i + 1,
          pct,
          amount: i < pcts.length - 1 ? partialAmounts[i] : lastAmount,
          status: 'scheduled',
          maturesAt: new Date(now.getTime() + (i + 1) * 24 * 3600 * 1000),
        }))
        // maturesAt on the investment = when the last installment fires
        inv.maturesAt = inv.installments[inv.installments.length - 1].maturesAt
      } else {
        inv.maturesAt = new Date(now.getTime() + settings.cycleDurationHours * 3600 * 1000)
      }
      // auto = the auto-deposit timeout approved this (adminId is null); flag it
      // so admin History can distinguish an automated approval from a manual one.
      inv.approvedBy = adminId
      inv.approvedAt = now
      inv.autoApproved = auto
      await inv.save({ session })

      // NOTE: principal is intentionally NOT credited here. Funds stay locked
      // until maturity (see approveReturn / runMature). Job scheduling
      // (cancelAutoReject + scheduleMature) is wired in Task 5.

      const user = await User.findById(inv.user).session(session)
      const referralResult = user
        ? await creditReferralIfFirst(user, session, inv.amount)
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
        'cache:leaderboard:weekly',
        'cache:leaderboard:monthly'
      )
      if (result.user) email.depositApproved(result.user, result.inv).catch(() => {}) // fire-and-forget
      await queue.cancelAutoReject(result.inv._id)
      await queue.cancelAutoDeposit(result.inv._id)
      if (result.inv.installmentPcts && result.inv.installmentPcts.length > 0) {
        for (const inst of result.inv.installments) {
          await queue.scheduleInstallment(result.inv, inst.day)
        }
      } else {
        await queue.scheduleMature(result.inv)
      }
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

  // Stop a pending auto-deposit from later auto-approving what an admin just
  // rejected. (The atomic status guard would no-op it anyway, but cancelling
  // keeps the queue clean.)
  await queue.cancelAutoDeposit(inv._id)

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
      // Guard >0: walletService.credit throws on non-positive amounts, so a
      // future 0% plan (expectedReturn === 0) must not abort the transaction.
      if (inv.expectedReturn > 0) {
        await walletService.credit(
          inv.user, inv.expectedReturn,
          { type: 'return', actor: adminId ? 'admin' : 'system', note: `Return ${inv.referenceCode}`, ref: inv._id },
          session
        )
        credited += inv.expectedReturn
      }

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

/**
 * Admin acts on a RUNNING (or timer-ended) investment straight from the user's
 * profile — distinct from the pending-stage approve/reject and the matured-stage
 * return endpoints, which only apply at those specific states.
 *
 * approvePayout: pay the user their payout now (deposit + profit) and finish it.
 * Mirrors the maturity credit path, but accepts 'active' as well as 'matured'.
 * Idempotent via the status guard inside the transaction.
 */
async function approvePayout(investmentId, adminId) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'active' && inv.status !== 'matured') {
        throw new ApiError(409, 'Investment is not running')
      }

      let credited = 0
      if (!inv.walletCredited) {
        await walletService.credit(
          inv.user, inv.amount,
          { type: 'deposit', actor: adminId ? 'admin' : 'system', note: `Principal ${inv.referenceCode}`, ref: inv._id },
          session
        )
        credited += inv.amount
      }
      if (inv.expectedReturn > 0) {
        await walletService.credit(
          inv.user, inv.expectedReturn,
          { type: 'return', actor: adminId ? 'admin' : 'system', note: `Return ${inv.referenceCode}`, ref: inv._id },
          session
        )
        credited += inv.expectedReturn
      }

      inv.status = 'returned'
      inv.walletCredited = true
      inv.creditedAmount = credited
      inv.maturedAt = inv.maturedAt || new Date()
      inv.returnDecidedBy = adminId
      inv.returnDecidedAt = new Date()
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await queue.cancelMature(updated._id) // drop the pending auto-pay job (runMature no-ops anyway)
      await cacheDel('cache:admin:stats', `cache:dashboard:${updated.user}`, `cache:wallet:${updated.user}`)
      logger.info('Payout approved from user view', { investmentId, adminId, creditedAmount: updated.creditedAmount })
    }
    return updated
  } finally {
    session.endSession()
  }
}

/**
 * rejectPayout: cancel a running (or timer-ended) investment. The admin chooses
 * a custom amount to credit back to the user (0 = nothing). The credit is a
 * normal settled transaction, so it DOES show in the user's history — the
 * cycle's trace is kept. Mirrors rejectReturn but accepts 'active' too.
 */
async function rejectPayout(investmentId, adminId, { reason = '', amount = 0 } = {}) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status !== 'active' && inv.status !== 'matured') {
        throw new ApiError(409, 'Investment is not running')
      }
      const max = inv.amount + inv.expectedReturn
      if (amount < 0 || amount > max) throw new ApiError(400, 'Amount out of range')

      if (amount > 0 && !inv.walletCredited) {
        await walletService.credit(
          inv.user, amount,
          { type: 'return', actor: adminId ? 'admin' : 'system', note: `Reject payout ${inv.referenceCode}${reason ? ': ' + reason : ''}`, ref: inv._id },
          session
        )
        inv.walletCredited = true
        inv.creditedAmount = amount
      }
      inv.status = 'rejected'
      inv.returnRejectionReason = reason
      inv.returnDecidedBy = adminId
      inv.returnDecidedAt = new Date()
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await queue.cancelMature(updated._id)
      await cacheDel('cache:admin:stats', `cache:dashboard:${updated.user}`, `cache:wallet:${updated.user}`)
      logger.info('Payout rejected with custom amount', { investmentId, adminId, amount: updated.creditedAmount })
    }
    return updated
  } finally {
    session.endSession()
  }
}

/**
 * deleteInvestment: erase a whole investment cycle from the user's side. Every
 * wallet transaction tied to it is removed and its net balance effect reversed,
 * so the user sees no trace and their total-invested drops. The row itself is
 * soft-deleted (status 'deleted') so the admin History can still distinguish
 * deleted vs rejected vs approved. Idempotent via the status guard.
 */
async function deleteInvestment(investmentId, adminId) {
  const session = await mongoose.startSession()
  try {
    let updated
    await session.withTransaction(async () => {
      const inv = await Investment.findById(investmentId).session(session)
      if (!inv) throw new ApiError(404, 'Investment not found')
      if (inv.status === 'deleted') throw new ApiError(409, 'Investment already deleted')

      // Pull every wallet transaction tied to this investment and reverse their
      // net effect on the balance — as if the cycle never happened.
      const txns = await Transaction.find({ ref: inv._id }).session(session)
      const net = txns.reduce((s, t) => s + (t.direction === 'credit' ? t.amount : -t.amount), 0)
      if (net !== 0) {
        await Wallet.updateOne({ user: inv.user }, { $inc: { balance: -net } }, { session })
      }
      if (txns.length) await Transaction.deleteMany({ ref: inv._id }, { session })

      inv.status = 'deleted'
      inv.walletCredited = false
      inv.creditedAmount = 0
      inv.deletedBy = adminId
      inv.deletedAt = new Date()
      await inv.save({ session })
      updated = inv
    })

    if (updated) {
      await queue.cancelAutoReject(updated._id)
      await queue.cancelAutoDeposit(updated._id)
      await queue.cancelMature(updated._id)
      await cacheDel(
        'cache:admin:stats',
        `cache:dashboard:${updated.user}`,
        `cache:wallet:${updated.user}`,
        'cache:leaderboard:daily',
        'cache:leaderboard:weekly',
        'cache:leaderboard:monthly'
      )
      logger.info('Investment deleted (cycle erased)', { investmentId, adminId })
    }
    return updated
  } finally {
    session.endSession()
  }
}

async function runAutoReject(investmentId) {
  const settings = await Settings.getSingleton()
  if (!settings.autoRejectEnabled) return null // admin switched auto-reject off — no-op
  const hours = settings.autoRejectHours
  const inv = await Investment.findOneAndUpdate(
    { _id: investmentId, status: 'pending' },
    { $set: { status: 'rejected', autoRejected: true, rejectionReason: `auto-rejected: approval timeout (${hours}h)`, approvedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) return null // already approved/processed — idempotent no-op
  await cacheDel('cache:admin:stats', `cache:dashboard:${inv.user}`)
  logger.info('Investment auto-rejected (approval timeout)', { investmentId, hours }) // no email
  return inv
}

/**
 * Auto-deposit: the mirror of runAutoReject. When a deposit has been pending
 * past the admin-configured window, advance it to the next step by APPROVING
 * it (pending -> active) as the system (adminId = null), instead of rejecting.
 *
 * Reuses approveInvestment so the exact same money path runs — maturity timer,
 * referral credit, cache busting and job (un)scheduling all stay correct. The
 * status guard inside approveInvestment makes this idempotent: a deposit already
 * approved or rejected/auto-rejected first yields a 409, which we swallow.
 */
async function runAutoDeposit(investmentId) {
  const settings = await Settings.getSingleton()
  if (!settings.autoDepositEnabled) return null // admin switched auto-deposit off — no-op
  try {
    const inv = await approveInvestment(investmentId, null, { auto: true })
    logger.info('Investment auto-deposited (approval timeout)', { investmentId, hours: settings.autoDepositHours })
    return inv
  } catch (err) {
    // 409 = already processed (approved/rejected/deleted first), 404 = gone.
    // Both are idempotent no-ops for the sweep / delayed job.
    if (err.statusCode === 409 || err.statusCode === 404) return null
    throw err
  }
}

async function runMature(investmentId) {
  // Guard: installment-based investments never use this path — they are handled
  // by runInstallment. An empty installmentPcts means single-payout (old Diamond
  // or legacy).
  const inv = await Investment.findOneAndUpdate(
    {
      _id: investmentId,
      status: 'active',
      $or: [
        { installmentPcts: { $size: 0 } },
        { installmentPcts: { $exists: false } },
      ],
    },
    { $set: { status: 'matured', maturedAt: new Date() } },
    { returnDocument: 'after' }
  )
  if (!inv) return null
  await cacheDel('cache:admin:stats', `cache:dashboard:${inv.user}`)
  logger.info('Investment matured', { investmentId })

  // Auto-pay requires BOTH the deploy-level master flag AND the admin toggle
  // (both default on). Either one off leaves the investment waiting for a
  // manual payout decision.
  const settings = await Settings.getSingleton()
  if (env.WALLET_AUTO_CREDIT_ON_MATURITY && settings.autoPayEnabled) {
    // Reuse the return-approve credit path with a system actor (adminId = null).
    await approveReturn(inv._id, null)
  }
  return await Investment.findById(investmentId)
}

async function bulkApproveInvestments(ids, adminId) {
  let approved = 0
  let failed = 0
  for (const id of ids) {
    try {
      await approveInvestment(id, adminId)
      approved++
    } catch (err) {
      failed++
      logger.warn('Bulk approve: single item failed', { id, error: err.message })
    }
  }
  logger.info('Bulk approve complete', { approved, failed, adminId })
  return { approved, failed }
}

async function bulkRejectInvestments(ids, adminId, note = '') {
  let rejected = 0
  let failed = 0
  for (const id of ids) {
    try {
      await rejectInvestment(id, adminId, note)
      rejected++
    } catch (err) {
      failed++
      logger.warn('Bulk reject: single item failed', { id, error: err.message })
    }
  }
  logger.info('Bulk reject complete', { rejected, failed, adminId })
  return { rejected, failed }
}

// Bulk approve returns — handles both active (payout) and matured (return) rows.
async function bulkApproveReturns(ids, adminId) {
  const investments = await Investment.find({ _id: { $in: ids } }).lean()
  let approved = 0
  let failed = 0
  for (const inv of investments) {
    try {
      if (inv.status === 'active') await approvePayout(inv._id, adminId)
      else await approveReturn(inv._id, adminId)
      approved++
    } catch (err) {
      failed++
      logger.warn('Bulk approve returns: item failed', { id: inv._id, error: err.message })
    }
  }
  logger.info('Bulk approve returns complete', { approved, failed, adminId })
  return { approved, failed }
}

// Bulk reject returns — handles both active (payout) and matured (return) rows.
async function bulkRejectReturns(ids, adminId, reason = '', amount = 0) {
  const investments = await Investment.find({ _id: { $in: ids } }).lean()
  let rejected = 0
  let failed = 0
  for (const inv of investments) {
    try {
      if (inv.status === 'active') await rejectPayout(inv._id, adminId, { reason, amount })
      else await rejectReturn(inv._id, adminId, { reason, amount })
      rejected++
    } catch (err) {
      failed++
      logger.warn('Bulk reject returns: item failed', { id: inv._id, error: err.message })
    }
  }
  logger.info('Bulk reject returns complete', { rejected, failed, adminId })
  return { rejected, failed }
}

module.exports = { getDepositGate, createInvestment, notifyPaymentSubmitted, approveInvestment, rejectInvestment, approveReturn, rejectReturn, approvePayout, rejectPayout, deleteInvestment, runAutoReject, runAutoDeposit, runMature, bulkApproveInvestments, bulkRejectInvestments, bulkApproveReturns, bulkRejectReturns }
