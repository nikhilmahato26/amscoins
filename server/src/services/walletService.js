'use strict'

const Wallet = require('../models/Wallet')
const Transaction = require('../models/Transaction')
const { ApiError } = require('../middleware/errorHandler')
const logger = require('../lib/logger').child({ service: 'wallet' })
const { cacheDel } = require('../config/redis')

async function getOrCreateWallet(userId, session) {
  let w = await Wallet.findOne({ user: userId }).session(session || null)
  if (!w) {
    ;[w] = await Wallet.create([{ user: userId, balance: 0 }], { session })
    logger.info('Wallet created for new user', { userId })
  }
  return w
}

async function credit(userId, amount, meta, session) {
  if (amount <= 0) {
    logger.warn('Credit rejected — amount must be positive', { userId, amount })
    throw new ApiError(400, 'Amount must be positive')
  }

  const w = await Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: { balance: amount } },
    { returnDocument: 'after', upsert: true, session }
  )

  await Transaction.create(
    [{ user: userId, type: meta.type, direction: 'credit', amount, note: meta.note || '', actor: meta.actor || 'system', ref: meta.ref, status: meta.status || 'settled' }],
    { session }
  )

  logger.info('Wallet credited', {
    userId,
    amount,
    type: meta.type,
    actor: meta.actor,
    newBalance: w.balance,
  })

  await cacheDel(`cache:wallet:${userId}`, `cache:dashboard:${userId}`)

  return w
}

async function debit(userId, amount, meta, session) {
  if (amount <= 0) {
    logger.warn('Debit rejected — amount must be positive', { userId, amount })
    throw new ApiError(400, 'Amount must be positive')
  }

  const w = await Wallet.findOneAndUpdate(
    { user: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { returnDocument: 'after', session }
  )

  if (!w) {
    logger.warn('Debit rejected — insufficient balance', { userId, amount })
    throw new ApiError(400, 'Insufficient balance')
  }

  await Transaction.create(
    [{ user: userId, type: meta.type, direction: 'debit', amount, note: meta.note || '', actor: meta.actor || 'system', ref: meta.ref, status: meta.status || 'settled' }],
    { session }
  )

  logger.info('Wallet debited', {
    userId,
    amount,
    type: meta.type,
    actor: meta.actor,
    newBalance: w.balance,
  })

  await cacheDel(`cache:wallet:${userId}`, `cache:dashboard:${userId}`)

  return w
}

module.exports = { getOrCreateWallet, credit, debit }
