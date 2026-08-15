const mongoose = require('mongoose')
const Withdrawal = require('../models/Withdrawal')
const User = require('../models/User')
const walletService = require('./walletService')
const email = require('./emailService')
const { computeTds } = require('./money')
const env = require('../config/env')
const { ApiError } = require('../middleware/errorHandler')

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
  } finally {
    session.endSession()
  }
  await email.withdrawalInitiated(user, withdrawal)
  return withdrawal
}

async function completeWithdrawal(id, adminId, note = '') {
  const w = await Withdrawal.findOneAndUpdate(
    { _id: id, status: 'pending' },
    { $set: { status: 'completed', completedAt: new Date(), processedBy: adminId, note } },
    { returnDocument: 'after' }
  )
  if (!w) throw new ApiError(409, 'Withdrawal not pending')
  await email.withdrawalCompleted(await User.findById(w.user), w)
  return w
}

async function rejectWithdrawal(id, adminId, note = '') {
  const session = await mongoose.startSession()
  let w
  try {
    await session.withTransaction(async () => {
      w = await Withdrawal.findOne({ _id: id, status: 'pending' }).session(session)
      if (!w) throw new ApiError(409, 'Withdrawal not pending')
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
  } finally {
    session.endSession()
  }
  await email.withdrawalRejected(await User.findById(w.user), w)
  return w
}

module.exports = { initiateWithdrawal, completeWithdrawal, rejectWithdrawal }
