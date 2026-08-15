const asyncHandler = require('../middleware/asyncHandler')
const Investment = require('../models/Investment')
const Withdrawal = require('../models/Withdrawal')
const User = require('../models/User')
const invSvc = require('../services/investmentService')
const wdSvc = require('../services/withdrawalService')
const walletService = require('../services/walletService')

const listInvestments = asyncHandler(async (req, res) => {
  const q = req.query.status ? { status: req.query.status } : {}
  res.json(await Investment.find(q).sort('-createdAt').populate('user', 'name email'))
})

const approveInvestment = asyncHandler(async (req, res) =>
  res.json(await invSvc.approveInvestment(req.params.id, req.user._id))
)

const rejectInvestment = asyncHandler(async (req, res) =>
  res.json(await invSvc.rejectInvestment(req.params.id, req.user._id, req.body && req.body.note))
)

const listWithdrawals = asyncHandler(async (req, res) => {
  const q = req.query.status ? { status: req.query.status } : {}
  res.json(await Withdrawal.find(q).sort('-createdAt').populate('user', 'name email'))
})

const completeWithdrawal = asyncHandler(async (req, res) =>
  res.json(await wdSvc.completeWithdrawal(req.params.id, req.user._id, req.body && req.body.note))
)

const rejectWithdrawal = asyncHandler(async (req, res) =>
  res.json(await wdSvc.rejectWithdrawal(req.params.id, req.user._id, req.body && req.body.note))
)

const listUsers = asyncHandler(async (_req, res) =>
  res.json(await User.find().select('-passwordHash').sort('-createdAt'))
)

const setStatus = (status) =>
  asyncHandler(async (req, res) => {
    const u = await User.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' }).select('-passwordHash')
    res.json(u)
  })

const adjustWallet = asyncHandler(async (req, res) => {
  const { amount, direction, note } = req.body
  const fn = direction === 'credit' ? walletService.credit : walletService.debit
  const w = await fn(req.params.userId, amount, { type: 'adjustment', actor: 'admin', note })
  res.json({ balance: w.balance })
})

module.exports = {
  listInvestments,
  approveInvestment,
  rejectInvestment,
  listWithdrawals,
  completeWithdrawal,
  rejectWithdrawal,
  listUsers,
  freeze: setStatus('frozen'),
  unfreeze: setStatus('active'),
  adjustWallet,
}
