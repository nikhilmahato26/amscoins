'use strict'

const mongoose = require('mongoose')
const Withdrawal = require('../models/Withdrawal')
const User = require('../models/User')
const Transaction = require('../models/Transaction')
const walletService = require('./walletService')

// Flip the history entry tied to a withdrawal to match its real state.
// (The debit is written PENDING on init; approval settles it, rejection marks
// it rejected.) `session` is optional so it can run in or out of a transaction.
function setWithdrawalTxnStatus(withdrawalId, status, session) {
  return Transaction.updateOne(
    { ref: withdrawalId, type: 'withdrawal', direction: 'debit' },
    { $set: { status } },
    session ? { session } : undefined
  )
}
const email = require('./emailService')
const { computeTds } = require('./money')
const env = require('../config/env')
const { ApiError } = require('../middleware/errorHandler')
const logger = require('../lib/logger').child({ service: 'withdrawal' })
const { cacheDel } = require('../config/redis')
const { withdrawalLimitFor } = require('../config/limits')

// Resolve the payout destination from the request body: a saved payout method,
// inline bank details, or an inline UPI id (in that order of precedence).
function resolveDestination(user, body) {
  const { payoutMethodId, upiId, accountName, accountNumber, ifsc } = body

  if (payoutMethodId) {
    const m = user.payoutMethods && user.payoutMethods.id(payoutMethodId)
    if (!m) throw new ApiError(400, 'Saved payout method not found')
    return m.type === 'bank'
      ? { method: 'bank', accountName: m.accountName, accountNumber: m.accountNumber, ifsc: m.ifsc }
      : { method: 'upi', upiId: m.upiId }
  }
  if (accountName && accountNumber && ifsc) {
    return { method: 'bank', accountName, accountNumber, ifsc }
  }
  if (upiId) return { method: 'upi', upiId }
  throw new ApiError(400, 'No payout destination provided')
}

function destinationLabel(dest) {
  return dest.method === 'bank'
    ? `bank A/C ••${String(dest.accountNumber).slice(-4)}`
    : dest.upiId
}

async function initiateWithdrawal(user, body) {
  const { amount } = body
  const limit = withdrawalLimitFor(user.tier)
  if (amount > limit) {
    throw new ApiError(400, 'Amount exceeds your withdrawal limit')
  }
  const dest = resolveDestination(user, body)
  const { tds, net } = computeTds(amount, env.TDS_PCT)
  const session = await mongoose.startSession()
  let withdrawal
  try {
    await session.withTransaction(async () => {
      // Create the withdrawal first so the ledger entry can reference it.
      ;[withdrawal] = await Withdrawal.create(
        [{ user: user._id, gross: amount, tds, net, status: 'pending', ...dest }],
        { session }
      )
      // Deduct the gross immediately (money leaves the wallet on init), but the
      // history entry stays PENDING until an admin approves — so the user never
      // sees a just-requested withdrawal shown as settled.
      await walletService.debit(
        user._id,
        amount,
        { type: 'withdrawal', actor: 'user', note: `Withdrawal to ${destinationLabel(dest)}`, ref: withdrawal._id, status: 'pending' },
        session
      )
    })
  } catch (err) {
    if (!err.statusCode) {
      logger.error('Withdrawal initiation transaction failed', {
        userId: user._id,
        amount,
        error: err.message,
        stack: err.stack,
      })
    }
    throw err
  } finally {
    session.endSession()
  }

  logger.info('Withdrawal initiated', {
    withdrawalId: withdrawal._id,
    userId: user._id,
    gross: amount,
    tds,
    net,
    method: dest.method,
    destination: destinationLabel(dest),
  })

  await cacheDel('cache:admin:stats', `cache:dashboard:${user._id}`, `cache:wallet:${user._id}`)
  await email.withdrawalInitiated(user, withdrawal)
  return withdrawal
}

async function completeWithdrawal(id, adminId, note = '') {
  const w = await Withdrawal.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'completed', completedAt: new Date(), processedBy: adminId, note } },
    { returnDocument: 'after' }
  )
  if (!w) {
    logger.warn('Withdrawal completion failed — not pending', { withdrawalId: id })
    throw new ApiError(409, 'Withdrawal not pending')
  }

  await setWithdrawalTxnStatus(w._id, 'settled') // history entry: pending → settled

  logger.info('Withdrawal completed', {
    withdrawalId: w._id,
    userId: w.user,
    adminId,
    net: w.net,
    method: w.method,
    destination: destinationLabel(w),
  })

  await cacheDel('cache:admin:stats')
  await email.withdrawalCompleted(await User.findById(w.user), w)
  return w
}

async function rejectWithdrawal(id, adminId, note = '') {
  const session = await mongoose.startSession()
  let w
  try {
    await session.withTransaction(async () => {
      w = await Withdrawal.findOne({ _id: id, status: 'pending' }).session(session)
      if (!w) {
        logger.warn('Withdrawal rejection failed — not pending', { withdrawalId: id })
        throw new ApiError(409, 'Withdrawal not pending')
      }
      // Re-credit the gross amount that was deducted on initiation. Marked
      // 'rejected' (not settled) so it stays hidden from the user's history —
      // a rejected withdrawal never appears, so neither should its reversal.
      await walletService.credit(
        w.user,
        w.gross,
        { type: 'refund', actor: 'admin', note: `Refund ${note}`, ref: w._id, status: 'rejected' },
        session
      )
      w.status = 'rejected'
      w.processedBy = adminId
      w.note = note
      await w.save({ session })
      await setWithdrawalTxnStatus(w._id, 'rejected', session) // history entry: pending → rejected
    })
  } catch (err) {
    if (!err.statusCode) {
      logger.error('Withdrawal rejection transaction failed', {
        withdrawalId: id,
        adminId,
        error: err.message,
        stack: err.stack,
      })
    }
    throw err
  } finally {
    session.endSession()
  }

  logger.info('Withdrawal rejected and refunded', {
    withdrawalId: w._id,
    userId: w.user,
    adminId,
    refundAmount: w.gross,
    note,
  })

  await cacheDel('cache:admin:stats', `cache:wallet:${w.user}`, `cache:dashboard:${w.user}`)
  await email.withdrawalRejected(await User.findById(w.user), w)
  return w
}

async function bulkApproveWithdrawals(ids, adminId) {
  let approved = 0
  for (const id of ids) {
    try {
      const w = await Withdrawal.findOneAndUpdate(
        { _id: id, status: 'pending' },
        { $set: { status: 'completed', processedAt: new Date() } },
        { returnDocument: 'after' }
      )
      if (w) {
        approved++
        await setWithdrawalTxnStatus(w._id, 'settled') // history entry: pending → settled
        logger.info('Bulk withdrawal completed', { withdrawalId: w._id, adminId })
        await cacheDel(
          'cache:admin:stats',
          `cache:wallet:${w.user}`,
          `cache:dashboard:${w.user}`
        )
        const user = await User.findById(w.user).lean()
        if (user) email.withdrawalCompleted(user, w).catch(() => {})
      }
    } catch (err) {
      logger.error('Bulk withdrawal step failed', { id, error: err.message })
    }
  }
  return { approved }
}

async function retryWithdrawal(id) {
  const w = await Withdrawal.findOneAndUpdate(
    { _id: id, status: 'failed' },
    { $set: { status: 'pending', failureReason: null } },
    { returnDocument: 'after' }
  )
  if (!w) throw new ApiError(400, 'Withdrawal is not in failed status')
  logger.info('Withdrawal retry requested', { withdrawalId: w._id })
  return w
}

module.exports = { initiateWithdrawal, completeWithdrawal, rejectWithdrawal, bulkApproveWithdrawals, retryWithdrawal }
