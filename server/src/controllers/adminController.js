const asyncHandler = require('../middleware/asyncHandler')
const Investment = require('../models/Investment')
const Withdrawal = require('../models/Withdrawal')
const User = require('../models/User')
const Wallet = require('../models/Wallet')
const Transaction = require('../models/Transaction')
const { ApiError } = require('../middleware/errorHandler')
const invSvc = require('../services/investmentService')
const wdSvc = require('../services/withdrawalService')
const supportSvc = require('../services/supportService')
const walletService = require('../services/walletService')
const { cacheGet, cacheSet, cacheDel } = require('../config/redis')

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

const listUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim()
  let filter = {}
  if (q) {
    // Escape regex metacharacters so a search term is matched literally.
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter = { $or: [{ name: rx }, { email: rx }, { publicId: rx }] }
  }
  res.json(await User.find(filter).select('-passwordHash').sort('-createdAt'))
})

// GET /api/admin/users/:id — full profile + wallet + money history for one user.
const getUserDetail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('-passwordHash')
  if (!user) throw new ApiError(404, 'User not found')

  const [wallet, investments, withdrawals, transactions] = await Promise.all([
    Wallet.findOne({ user: user._id }),
    Investment.find({ user: user._id }).sort('-createdAt'),
    Withdrawal.find({ user: user._id }).sort('-createdAt'),
    Transaction.find({ user: user._id }).sort('-createdAt').limit(100),
  ])

  res.json({
    user,
    balance: wallet ? wallet.balance : 0,
    investments,
    withdrawals,
    transactions,
  })
})

const setStatus = (status) =>
  asyncHandler(async (req, res) => {
    const u = await User.findByIdAndUpdate(req.params.id, { status }, { returnDocument: 'after' }).select('-passwordHash')
    res.json(u)
  })

const adjustWallet = asyncHandler(async (req, res) => {
  const { amount, direction, note } = req.body
  const fn = direction === 'credit' ? walletService.credit : walletService.debit
  const w = await fn(req.params.userId, amount, { type: 'adjustment', actor: 'admin', note })
  await cacheDel('cache:admin:stats')
  res.json({ balance: w.balance })
})

const listSupport = asyncHandler(async (req, res) =>
  res.json(await supportSvc.listAll(req.query.status))
)

const resolveSupport = asyncHandler(async (req, res) => {
  const t = await supportSvc.resolveTicket(req.params.id, req.user._id, req.body && req.body.adminNote)
  res.json(t.toPublic())
})

const getStats = asyncHandler(async (_req, res) => {
  const cacheKey = 'cache:admin:stats'
  const cached = await cacheGet(cacheKey)
  if (cached) {
    try {
      return res.json(JSON.parse(cached))
    } catch {
      // fallback
    }
  }

  const [users, pendingDeposits, pendingWithdrawals, invAgg, walAgg] = await Promise.all([
    User.countDocuments(),
    Investment.countDocuments({ status: 'pending' }),
    Withdrawal.countDocuments({ status: 'pending' }),
    Investment.aggregate([{ $match: { status: 'active' } }, { $group: { _id: null, s: { $sum: '$amount' } } }]),
    Wallet.aggregate([{ $group: { _id: null, s: { $sum: '$balance' } } }]),
  ])
  const result = {
    users,
    pendingDeposits,
    pendingWithdrawals,
    totals: { invested: invAgg[0]?.s || 0, walletLiability: walAgg[0]?.s || 0 },
  }

  await cacheSet(cacheKey, JSON.stringify(result), 30)
  res.json(result)
})

module.exports = {
  listInvestments,
  approveInvestment,
  rejectInvestment,
  listWithdrawals,
  completeWithdrawal,
  rejectWithdrawal,
  listUsers,
  getUserDetail,
  freeze: setStatus('frozen'),
  unfreeze: setStatus('active'),
  adjustWallet,
  listSupport,
  resolveSupport,
  getStats,
}
