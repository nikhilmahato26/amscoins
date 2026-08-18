'use strict'
const asyncHandler = require('../middleware/asyncHandler')
const Investment = require('../models/Investment')
const { ApiError } = require('../middleware/errorHandler')

function validDate(str) {
  const d = new Date(str)
  return isNaN(d.getTime()) ? null : d
}

function dateFilter(from, to) {
  const fromDate = from ? validDate(from) : null
  const toDate = to ? validDate(to) : null
  if (from && !fromDate) throw new ApiError(400, 'Invalid from date')
  if (to && !toDate) throw new ApiError(400, 'Invalid to date')
  const filter = {}
  if (fromDate || toDate) {
    filter.createdAt = {}
    if (fromDate) filter.createdAt.$gte = fromDate
    if (toDate)   filter.createdAt.$lte = toDate
  }
  return filter
}

const monthly = asyncHandler(async (req, res) => {
  const { from, to } = req.query
  const match = dateFilter(from, to)

  const rows = await Investment.aggregate([
    { $match: match },
    {
      $group: {
        _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
        count: { $sum: 1 },
        totalInvested: { $sum: '$amount' },
        totalReturned: { $sum: { $cond: [{ $eq: ['$status', 'returned'] }, '$creditedAmount', 0] } },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ])

  res.json(rows.map((r) => ({
    month: `${r._id.year}-${String(r._id.month).padStart(2, '0')}`,
    count: r.count,
    totalInvested: r.totalInvested,
    totalReturned: r.totalReturned,
  })))
})

const conversion = asyncHandler(async (req, res) => {
  const { from, to } = req.query
  const match = dateFilter(from, to)

  const rows = await Investment.aggregate([
    { $match: match },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ])

  const counts = Object.fromEntries(rows.map((r) => [r._id, r.count]))
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const returned = counts.returned ?? 0
  const active = (counts.active ?? 0) + (counts.matured ?? 0) + returned

  res.json({
    pending: counts.pending ?? 0,
    active,
    returned,
    rejected: counts.rejected ?? 0,
    total,
    conversionRate: total > 0 ? Math.round((returned / total) * 100 * 10) / 10 : 0,
  })
})

const roi = asyncHandler(async (req, res) => {
  const { from, to } = req.query
  const match = { ...dateFilter(from, to), status: 'returned' }

  const rows = await Investment.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        expectedReturn: { $sum: '$expectedReturn' },
        actualReturn: { $sum: '$creditedAmount' },
      },
    },
  ])

  if (!rows.length) return res.json({ expectedReturn: 0, actualReturn: 0, roiPct: 0 })
  const { expectedReturn, actualReturn } = rows[0]
  const roiPct = expectedReturn > 0
    ? Math.round((actualReturn / expectedReturn) * 100 * 10) / 10
    : 0
  res.json({ expectedReturn, actualReturn, roiPct })
})

const performance = asyncHandler(async (req, res) => {
  const { from, to } = req.query
  const match = dateFilter(from, to)

  const rows = await Investment.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$planKey',
        count: { $sum: 1 },
        totalInvested: { $sum: '$amount' },
        avgReturn: { $avg: '$returnPct' },
      },
    },
    { $sort: { totalInvested: -1 } },
  ])

  res.json(rows.map((r) => ({
    planKey: r._id,
    count: r.count,
    totalInvested: r.totalInvested,
    avgReturn: Math.round(r.avgReturn * 10) / 10,
  })))
})

const REPORT_HANDLERS = { monthly, conversion, roi, performance }

const getReport = asyncHandler(async (req, res, next) => {
  const handler = REPORT_HANDLERS[req.params.type]
  if (!handler) throw new ApiError(400, `Unknown report type: ${req.params.type}`)
  return handler(req, res, next)
})

module.exports = { getReport }
