const asyncHandler = require('../middleware/asyncHandler')
const Investment = require('../models/Investment')
const { createInvestment, notifyPaymentSubmitted } = require('../services/investmentService')

const create = asyncHandler(async (req, res) => {
  const { investment, telegramLink, whatsappLink } = await createInvestment(req.user, req.body)
  res.status(201).json({ investment, telegramLink, whatsappLink })
})

// Fired when the user taps "I've paid" on the pay screen — this is the point
// the deposit is actually submitted for review, so the email goes out now.
const notify = asyncHandler(async (req, res) => {
  const { investment, telegramLink, whatsappLink } = await notifyPaymentSubmitted(
    req.user,
    req.params.id
  )
  res.json({ investment, telegramLink, whatsappLink })
})

const mine = asyncHandler(async (req, res) =>
  // Deleted cycles are erased from the user's side — never surface them.
  res.json(await Investment.find({ user: req.user._id, status: { $ne: 'deleted' } }).sort('-createdAt'))
)

const getOne = asyncHandler(async (req, res) => {
  const investment = await Investment.findOne({ _id: req.params.id, user: req.user._id, status: { $ne: 'deleted' } })
  if (!investment) return res.status(404).json({ message: 'Investment not found' })
  res.json(investment)
})

module.exports = { create, notify, mine, getOne }
