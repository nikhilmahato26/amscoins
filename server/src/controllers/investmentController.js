const asyncHandler = require('../middleware/asyncHandler')
const Investment = require('../models/Investment')
const { createInvestment } = require('../services/investmentService')

const create = asyncHandler(async (req, res) => {
  const { investment, telegramLink } = await createInvestment(req.user, req.body)
  res.status(201).json({ investment, telegramLink })
})

const mine = asyncHandler(async (req, res) =>
  res.json(await Investment.find({ user: req.user._id }).sort('-createdAt'))
)

module.exports = { create, mine }
