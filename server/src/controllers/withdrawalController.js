const asyncHandler = require('../middleware/asyncHandler')
const Withdrawal = require('../models/Withdrawal')
const { initiateWithdrawal } = require('../services/withdrawalService')

const create = asyncHandler(async (req, res) =>
  res.status(201).json(await initiateWithdrawal(req.user, req.body))
)

const mine = asyncHandler(async (req, res) =>
  res.json(await Withdrawal.find({ user: req.user._id }).sort('-createdAt'))
)

module.exports = { create, mine }
