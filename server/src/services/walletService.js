const Wallet = require('../models/Wallet')
const Transaction = require('../models/Transaction')
const { ApiError } = require('../middleware/errorHandler')

async function getOrCreateWallet(userId, session) {
  let w = await Wallet.findOne({ user: userId }).session(session || null)
  if (!w) [w] = await Wallet.create([{ user: userId, balance: 0 }], { session })
  return w
}

async function credit(userId, amount, meta, session) {
  if (amount <= 0) throw new ApiError(400, 'Amount must be positive')
  const w = await Wallet.findOneAndUpdate(
    { user: userId },
    { $inc: { balance: amount } },
    { returnDocument: 'after', upsert: true, session }
  )
  await Transaction.create(
    [{ user: userId, type: meta.type, direction: 'credit', amount, note: meta.note || '', actor: meta.actor || 'system', ref: meta.ref }],
    { session }
  )
  return w
}

async function debit(userId, amount, meta, session) {
  if (amount <= 0) throw new ApiError(400, 'Amount must be positive')
  const w = await Wallet.findOneAndUpdate(
    { user: userId, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { returnDocument: 'after', session }
  )
  if (!w) throw new ApiError(400, 'Insufficient balance')
  await Transaction.create(
    [{ user: userId, type: meta.type, direction: 'debit', amount, note: meta.note || '', actor: meta.actor || 'system', ref: meta.ref }],
    { session }
  )
  return w
}

module.exports = { getOrCreateWallet, credit, debit }
