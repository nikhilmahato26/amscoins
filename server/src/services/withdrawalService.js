'use strict'

const mongoose = require('mongoose')
const Withdrawal = require('../models/Withdrawal')
const User = require('../models/User')
const walletService = require('./walletService')
const email = require('./emailService')
const { computeTds } = require('./money')
const env = require('../config/env')
const { ApiError } = require('../middleware/errorHandler')
const logger = require('../lib/logger').child({ service: 'withdrawal' })
const { cacheDel } = require('../config/redis')

async function initiateWithdrawal(user, { amount, upiId }) {
  const { tds, net } = computeTds(amount, env.TDS_PCT)
  const session = await mongoose.startSession()
  let withdrawal
  try {
    await session.withTransaction(async () => {
      // Deduct the gross immediately (spec: money leaves the wallet on init).
      await walletService.debit(
        user._id,
        amount,
        { type: 'withdrawal', actor: 'user', note: `Withdrawal to ${upiId}` },
        session
      )
      ;[withdrawal] = await Withdrawal.create(
        [{ user: user._id, gross: amount, tds, net, upiId, status: 'pending' }],
        { session }
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
    upiId,
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

  logger.info('Withdrawal completed', {
    withdrawalId: w._id,
    userId: w.user,
    adminId,
    net: w.net,
    upiId: w.upiId,
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
      // Re-credit the gross amount that was deducted on initiation.
      await walletService.credit(
        w.user,
        w.gross,
        { type: 'refund', actor: 'admin', note: `Refund ${note}`, ref: w._id },
        session
      )
      w.status = 'rejected'
      w.processedBy = adminId
      w.note = note
      await w.save({ session })
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

module.exports = { initiateWithdrawal, completeWithdrawal, rejectWithdrawal }
