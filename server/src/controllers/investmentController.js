const asyncHandler = require('../middleware/asyncHandler')
const Investment = require('../models/Investment')
const { createInvestment } = require('../services/investmentService')

const create = asyncHandler(async (req, res) => {
  const { investment, telegramLink, whatsappLink } = await createInvestment(req.user, req.body)
  res.status(201).json({ investment, telegramLink, whatsappLink })
})

const mine = asyncHandler(async (req, res) =>
  res.json(await Investment.find({ user: req.user._id }).sort('-createdAt'))
)

const getOne = asyncHandler(async (req, res) => {
  const investment = await Investment.findOne({ _id: req.params.id, user: req.user._id })
  if (!investment) return res.status(404).json({ message: 'Investment not found' })
  res.json(investment)
})

module.exports = { create, mine, getOne }
