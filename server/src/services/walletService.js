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

  // meta.tdsExemptPaise is the portion of THIS credit that must not be taxed
  // when it is later withdrawn (ASM Coin returns, and the restore leg of a
  // rejected withdrawal). It rides along as a sub-balance of the same wallet.
  const exempt = meta.tdsExemptPaise || 0
  if (exempt < 0 || exempt > amount) {
    logger.warn('Credit rejected — invalid exempt portion', { userId, amount, exempt })
    throw new ApiError(400, 'Invalid exempt portion')
  }

  const inc = exempt > 0 ? { balance: amount, tdsExemptPaise: exempt } : { balance: amount }

  const w = await Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: inc },
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

  // meta.tdsExemptUsed is how much of this debit is drawn from the TDS-exempt
  // sub-balance. Decremented in the SAME atomic update as the balance, and
  // guarded by $gte, so two concurrent withdrawals cannot spend it twice.
  const exemptUsed = meta.tdsExemptUsed || 0
  if (exemptUsed < 0 || exemptUsed > amount) {
    logger.warn('Debit rejected — invalid exempt portion', { userId, amount, exemptUsed })
    throw new ApiError(400, 'Invalid exempt portion')
  }

  const filter = { user: userId, balance: { $gte: amount } }
  const dec = { balance: -amount }
  if (exemptUsed > 0) {
    filter.tdsExemptPaise = { $gte: exemptUsed }
    dec.tdsExemptPaise = -exemptUsed
  }

  const w = await Wallet.findOneAndUpdate(
    filter,
    { $inc: dec },
    { returnDocument: 'after', session }
  )

  if (!w) {
    logger.warn('Debit rejected — insufficient balance', { userId, amount, exemptUsed })
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
