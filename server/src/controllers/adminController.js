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
const secretBox = require('../lib/secretBox')
const { cacheGet, cacheSet, cacheDel } = require('../config/redis')

// Escape a user-supplied string for safe use inside a RegExp.
const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

// Whitelisted sort keys → Mongoose sort expressions (prevents arbitrary sort injection).
const INVESTMENT_SORTS = {
  amount: 'amount',
  '-amount': '-amount',
  maturesAt: 'maturesAt', // soonest-completion first when ascending
  '-maturesAt': '-maturesAt',
  createdAt: 'createdAt', // oldest-pending first when ascending
  '-createdAt': '-createdAt',
  tier: 'planKey',
  '-tier': '-planKey',
}

const listInvestments = asyncHandler(async (req, res) => {
  const { status, tier, amountMin, amountMax, dateFrom, dateTo, q, sort } = req.query
  const filter = {}

  // Status (Investment / Return / History sections) — single or comma list.
  if (status) filter.status = { $in: String(status).split(',') }
  // Tier (planKey snapshot) — single or comma list.
  if (tier) filter.planKey = { $in: String(tier).split(',') }
  // Amount range (paise).
  if (amountMin != null || amountMax != null) {
    filter.amount = {}
    if (amountMin != null) filter.amount.$gte = Number(amountMin)
    if (amountMax != null) filter.amount.$lte = Number(amountMax)
  }
  // Date range on creation.
  if (dateFrom || dateTo) {
    filter.createdAt = {}
    if (dateFrom) filter.createdAt.$gte = new Date(dateFrom)
    if (dateTo) filter.createdAt.$lte = new Date(dateTo)
  }
  // Search: Investment ID (`invest-{ref}` / referenceCode), or User ID
  // (`user-{publicId}`) / name / email.
  if (q) {
    const raw = String(q).trim()
    const invRx = new RegExp(escapeRegex(raw.replace(/^invest-/i, '')), 'i')
    const userRx = new RegExp(escapeRegex(raw.replace(/^user-/i, '')), 'i')
    const users = await User.find({
      $or: [{ name: userRx }, { email: userRx }, { publicId: userRx }],
    }).select('_id')
    filter.$or = [{ referenceCode: invRx }, { user: { $in: users.map((u) => u._id) } }]
  }

  // Exclude unnotified draft investments from the pending admin view — they
  // aren't submitted for review yet (user hasn't tapped "I've paid").
  if (filter.status) {
    const statuses = filter.status.$in ?? [filter.status]
    if (statuses.includes('pending')) filter.paymentNotified = { $ne: false }
  }

  const sortBy = INVESTMENT_SORTS[sort] || 'createdAt'
  res.json(await Investment.find(filter).sort(sortBy).populate('user', 'name email publicId tier'))
})

// GET /api/admin/investments/stats — the investment-panel overview dashboard.
const getInvestmentStats = asyncHandler(async (_req, res) => {
  const now = new Date()
  const soon = new Date(now.getTime() + 60 * 60 * 1000) // within 1 hour
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [pendingApprovals, returnsAwaiting, aboutToComplete, capitalAgg, decided, revenueAgg] =
    await Promise.all([
      Investment.countDocuments({ status: 'pending', paymentNotified: { $ne: false } }),
      Investment.countDocuments({ status: 'matured' }),
      Investment.countDocuments({ status: 'active', maturesAt: { $gt: now, $lte: soon } }),
      Investment.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, s: { $sum: '$amount' } } },
      ]),
      // Approval rate = approved vs rejected RETURN decisions only (returnDecidedAt
      // is null for pre-approval / auto-rejects, so those are excluded).
      Investment.aggregate([
        { $match: { status: { $in: ['returned', 'rejected'] }, returnDecidedAt: { $ne: null } } },
        { $group: { _id: '$status', c: { $sum: 1 } } },
      ]),
      // Revenue = returns (profit) distributed this calendar month.
      Investment.aggregate([
        { $match: { status: 'returned', returnDecidedAt: { $gte: monthStart } } },
        { $group: { _id: null, s: { $sum: '$expectedReturn' } } },
      ]),
    ])

  const decidedMap = Object.fromEntries(decided.map((d) => [d._id, d.c]))
  const approved = decidedMap.returned || 0
  const rejected = decidedMap.rejected || 0
  const approvalRate = approved + rejected > 0 ? Math.round((approved / (approved + rejected)) * 100) : null

  res.json({
    pendingApprovals,
    returnsAwaiting,
    aboutToComplete,
    capitalUnderManagement: capitalAgg[0]?.s || 0,
    approvalRate, // null when no return decisions yet
    revenueThisMonth: revenueAgg[0]?.s || 0,
  })
})

const approveInvestment = asyncHandler(async (req, res) =>
  res.json(await invSvc.approveInvestment(req.params.id, req.user._id))
)

const rejectInvestment = asyncHandler(async (req, res) =>
  res.json(await invSvc.rejectInvestment(req.params.id, req.user._id, req.body && req.body.note))
)

const approveReturn = asyncHandler(async (req, res) =>
  res.json(await invSvc.approveReturn(req.params.id, req.user._id))
)

const rejectReturn = asyncHandler(async (req, res) => {
  const { reason, amount } = req.body
  res.json(await invSvc.rejectReturn(req.params.id, req.user._id, { reason, amount }))
})

const approvePayout = asyncHandler(async (req, res) =>
  res.json(await invSvc.approvePayout(req.params.id, req.user._id))
)

const rejectPayout = asyncHandler(async (req, res) => {
  const { reason, amount } = req.body
  res.json(await invSvc.rejectPayout(req.params.id, req.user._id, { reason, amount }))
})

const deleteInvestment = asyncHandler(async (req, res) =>
  res.json(await invSvc.deleteInvestment(req.params.id, req.user._id))
)

// Day comes from the URL, so it's validated here rather than by a body schema.
// 3 is the largest installment count any plan has ever had (legacy Silver/Gold);
// the service 404s on a day the investment itself doesn't have.
function parseInstallmentDay(raw) {
  const day = Number(raw)
  if (!Number.isInteger(day) || day < 1 || day > 3) return null
  return day
}

const approveInstallment = asyncHandler(async (req, res) => {
  const day = parseInstallmentDay(req.params.day)
  if (day === null) return res.status(400).json({ message: 'day must be 1, 2, or 3' })
  res.json(await invSvc.approveInstallment(req.params.id, day, req.user._id))
})

const rejectInstallment = asyncHandler(async (req, res) => {
  const day = parseInstallmentDay(req.params.day)
  if (day === null) return res.status(400).json({ message: 'day must be 1, 2, or 3' })
  const { reason, amount } = req.body
  res.json(await invSvc.rejectInstallment(req.params.id, day, req.user._id, { reason, amount }))
})

const bulkApproveInstallments = asyncHandler(async (req, res) => {
  const { items } = req.body
  res.json(await invSvc.bulkApproveInstallments(items, req.user._id))
})

const approveBreak = asyncHandler(async (req, res) =>
  res.json(await invSvc.approveBreak(req.params.id, req.user._id))
)

const rejectBreak = asyncHandler(async (req, res) =>
  res.json(await invSvc.rejectBreak(req.params.id, req.user._id))
)

const bulkApproveInvestments = asyncHandler(async (req, res) => {
  const { ids } = req.body
  res.json(await invSvc.bulkApproveInvestments(ids, req.user._id))
})

const bulkRejectInvestments = asyncHandler(async (req, res) => {
  const { ids, note } = req.body
  res.json(await invSvc.bulkRejectInvestments(ids, req.user._id, note))
})

const bulkApproveReturns = asyncHandler(async (req, res) => {
  const { ids } = req.body
  res.json(await invSvc.bulkApproveReturns(ids, req.user._id))
})

const bulkRejectReturns = asyncHandler(async (req, res) => {
  const { ids, reason, amount } = req.body
  res.json(await invSvc.bulkRejectReturns(ids, req.user._id, reason, amount))
})

const listWithdrawals = asyncHandler(async (req, res) => {
  const q = req.query.status
    ? { status: { $in: String(req.query.status).split(',') } }
    : {}
  res.json(await Withdrawal.find(q).sort('-createdAt').populate('user', 'name email'))
})

const completeWithdrawal = asyncHandler(async (req, res) =>
  res.json(await wdSvc.completeWithdrawal(req.params.id, req.user._id, req.body && req.body.note))
)

const rejectWithdrawal = asyncHandler(async (req, res) =>
  res.json(await wdSvc.rejectWithdrawal(req.params.id, req.user._id, req.body && req.body.note))
)

const bulkApproveWithdrawals = asyncHandler(async (req, res) => {
  const { ids } = req.body
  res.json(await wdSvc.bulkApproveWithdrawals(ids, req.user._id))
})

const retryWithdrawal = asyncHandler(async (req, res) => {
  res.json(await wdSvc.retryWithdrawal(req.params.id))
})

const listUsers = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '').trim()
  const filter = {}
  if (q) {
    // Escape regex metacharacters so a search term is matched literally.
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ name: rx }, { email: rx }, { publicId: rx }]
  }

  const users = await User.find(filter).select('-passwordHash').lean()

  // Run both aggregations in parallel:
  // 1. Lifetime total — all approved investments (active/matured/returned + rejected-return)
  // 2. Currently active — only investments still running right now
  const [agg, activeAgg] = await Promise.all([
    Investment.aggregate([
      {
        $match: {
          $or: [
            { status: { $in: ['active', 'matured', 'returned'] } },
            { status: 'rejected', startAt: { $exists: true } },
          ],
        },
      },
      { $group: { _id: '$user', total: { $sum: '$amount' } } },
    ]),
    Investment.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$user', total: { $sum: '$amount' }, count: { $sum: 1 } } },
    ]),
  ])
  const totals = new Map(agg.map((a) => [String(a._id), a.total]))
  const actives = new Map(activeAgg.map((a) => [String(a._id), { amount: a.total, count: a.count }]))
  let result = users.map((u) => ({
    ...u,
    totalInvested: totals.get(String(u._id)) || 0,
    activeInvested: actives.get(String(u._id))?.amount || 0,
    activeCount: actives.get(String(u._id))?.count || 0,
  }))

  // Investor filter: 'true' = has an active investment right now, 'false' = none active.
  const investor = req.query.investor
  if (investor === 'true') result = result.filter((u) => u.activeInvested > 0)
  else if (investor === 'false') result = result.filter((u) => u.activeInvested === 0)

  // Sort: by lifetime invested (either direction), else investors-first (default:
  // users with a live active investment float to the top, biggest first, then
  // newest signups among the rest).
  const sort = req.query.sort
  if (sort === 'invested') result.sort((a, b) => a.totalInvested - b.totalInvested)
  else if (sort === '-invested') result.sort((a, b) => b.totalInvested - a.totalInvested)
  else {
    result.sort((a, b) => {
      if (b.activeInvested !== a.activeInvested) return b.activeInvested - a.activeInvested
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  res.json(result)
})

// GET /api/admin/users/:id — full profile + wallet + money history for one user.
const getUserDetail = asyncHandler(async (req, res) => {
  // +passwordEnc so we can decrypt the readable password for this admin-only
  // view. The ciphertext itself is stripped from the response below.
  const user = await User.findById(req.params.id).select('-passwordHash +passwordEnc')
  if (!user) throw new ApiError(404, 'User not found')

  const [wallet, investments, withdrawals, transactions] = await Promise.all([
    Wallet.findOne({ user: user._id }),
    Investment.find({ user: user._id }).sort('-createdAt'),
    Withdrawal.find({ user: user._id }).sort('-createdAt'),
    Transaction.find({ user: user._id }).sort('-createdAt').limit(100),
  ])

  const password = secretBox.open(user.passwordEnc) // null when not captured/unconfigured
  const userObj = user.toObject()
  delete userObj.passwordEnc // never leak ciphertext

  res.json({
    user: userObj,
    password,
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

  const todayStart = new Date()
  todayStart.setUTCHours(0, 0, 0, 0)

  const approvedStatuses = ['active', 'matured', 'returned']

  const [users, pendingDeposits, pendingWithdrawals, invAgg, walAgg, todayAgg] = await Promise.all([
    User.countDocuments(),
    Investment.countDocuments({ status: 'pending', paymentNotified: { $ne: false } }),
    Withdrawal.countDocuments({ status: 'pending' }),
    // All-time total: every investment that was ever approved (active + matured + returned)
    Investment.aggregate([{ $match: { status: { $in: approvedStatuses } } }, { $group: { _id: null, s: { $sum: '$amount' } } }]),
    Wallet.aggregate([{ $group: { _id: null, s: { $sum: '$balance' } } }]),
    // Today's approved investments only — keeps it comparable to total
    Investment.aggregate([
      { $match: { createdAt: { $gte: todayStart }, status: { $in: approvedStatuses } } },
      { $group: { _id: null, s: { $sum: '$amount' } } },
    ]),
  ])
  const result = {
    users,
    pendingDeposits,
    pendingWithdrawals,
    totals: {
      invested: invAgg[0]?.s || 0,
      walletLiability: walAgg[0]?.s || 0,
      todayInvested: todayAgg[0]?.s || 0,
    },
  }

  await cacheSet(cacheKey, JSON.stringify(result), 30)
  res.json(result)
})

/** GET /admin/activity — last 20 platform events for the dashboard timeline. */
const getActivity = asyncHandler(async (_req, res) => {
  const LIMIT = 20

  const [investments, withdrawals, users] = await Promise.all([
    Investment.find({ status: { $in: ['returned', 'rejected'] } })
      .sort('-updatedAt')
      .limit(LIMIT)
      .populate('user', 'name')
      .lean(),
    Withdrawal.find({ status: { $in: ['completed', 'rejected'] } })
      .sort('-updatedAt')
      .limit(LIMIT)
      .populate('user', 'name')
      .lean(),
    User.find()
      .sort('-createdAt')
      .limit(LIMIT)
      .select('name createdAt')
      .lean(),
  ])

  const events = [
    ...investments.map((inv) => ({
      id: inv._id.toString(),
      type: inv.status === 'returned' ? 'investment_approved' : 'investment_rejected',
      userName: inv.user?.name ?? 'Unknown',
      amount: inv.amount, // paise
      timestamp: inv.updatedAt.toISOString(),
    })),
    ...withdrawals.map((wd) => ({
      id: wd._id.toString(),
      type: wd.status === 'completed' ? 'withdrawal_approved' : 'withdrawal_rejected',
      userName: wd.user?.name ?? 'Unknown',
      amount: wd.amount, // paise
      timestamp: wd.updatedAt.toISOString(),
    })),
    ...users.map((u) => ({
      id: u._id.toString(),
      type: 'user_registered',
      userName: u.name,
      timestamp: u.createdAt.toISOString(),
    })),
  ]

  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  res.json(events.slice(0, LIMIT))
})

module.exports = {
  listInvestments,
  getInvestmentStats,
  approveInvestment,
  rejectInvestment,
  approveReturn,
  rejectReturn,
  approvePayout,
  rejectPayout,
  deleteInvestment,
  approveInstallment,
  rejectInstallment,
  bulkApproveInstallments,
  approveBreak,
  rejectBreak,
  bulkApproveInvestments,
  bulkRejectInvestments,
  bulkApproveReturns,
  bulkRejectReturns,
  listWithdrawals,
  completeWithdrawal,
  rejectWithdrawal,
  bulkApproveWithdrawals,
  retryWithdrawal,
  listUsers,
  getUserDetail,
  freeze: setStatus('frozen'),
  unfreeze: setStatus('active'),
  adjustWallet,
  listSupport,
  resolveSupport,
  getStats,
  getActivity,
}
