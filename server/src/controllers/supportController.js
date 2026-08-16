const asyncHandler = require('../middleware/asyncHandler')
const supportService = require('../services/supportService')

// POST /api/support — a user raises a support query.
const create = asyncHandler(async (req, res) => {
  const ticket = await supportService.createTicket(req.user, req.body)
  res.status(201).json({ ticket: ticket.toPublic() })
})

// GET /api/support/mine — the user's own tickets.
const mine = asyncHandler(async (req, res) => {
  const tickets = await supportService.listMine(req.user._id)
  res.json({ tickets: tickets.map((t) => t.toPublic()) })
})

module.exports = { create, mine }
