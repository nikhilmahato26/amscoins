'use strict'

const SupportTicket = require('../models/SupportTicket')
const email = require('./emailService')
const { randomCode } = require('./referralCode')
const { ApiError } = require('../middleware/errorHandler')
const logger = require('../lib/logger').child({ service: 'support' })

async function generateUniqueRef() {
  for (let i = 0; i < 10; i++) {
    const ref = `SUP-${randomCode(6)}`
    if (!(await SupportTicket.exists({ publicRef: ref }))) return ref
  }
  throw new Error('Could not generate unique support reference')
}

// A user raises a query → persist, email the admin inbox + confirm to the user.
async function createTicket(user, { subject, message }) {
  const publicRef = await generateUniqueRef()
  const ticket = await SupportTicket.create({ user: user._id, publicRef, subject, message })

  logger.info('Support ticket created', { ticketId: ticket._id, userId: user._id, publicRef })

  // Email failures must not fail the request — emailService already swallows errors.
  await Promise.all([
    email.supportTicketAdmin(user, ticket),
    email.supportTicketConfirmation(user, ticket),
  ])

  return ticket
}

function listMine(userId) {
  return SupportTicket.find({ user: userId }).sort('-createdAt')
}

// Admin: list tickets (optionally filtered by status) with the requester's identity.
async function listAll(status) {
  const filter = status ? { status } : {}
  const tickets = await SupportTicket.find(filter)
    .sort('-createdAt')
    .populate('user', 'name email publicId')
    .lean()
  return tickets.map((t) => ({
    id: t._id,
    publicRef: t.publicRef,
    subject: t.subject,
    message: t.message,
    status: t.status,
    adminNote: t.adminNote || '',
    resolvedAt: t.resolvedAt || null,
    createdAt: t.createdAt,
    user: t.user
      ? { id: t.user._id, name: t.user.name, email: t.user.email, publicId: t.user.publicId || null }
      : null,
  }))
}

async function resolveTicket(id, adminId, adminNote = '') {
  const ticket = await SupportTicket.findOneAndUpdate(
    { _id: id, status: 'open' },
    { $set: { status: 'resolved', adminNote, resolvedBy: adminId, resolvedAt: new Date() } },
    { returnDocument: 'after' }
  ).populate('user', 'name email')
  if (!ticket) {
    logger.warn('Support ticket resolve failed — not open or not found', { ticketId: id })
    throw new ApiError(409, 'Ticket not open')
  }
  logger.info('Support ticket resolved', { ticketId: id, adminId })

  // Notify the user their query was resolved (email failures are swallowed).
  if (ticket.user && ticket.user.email) await email.supportTicketResolved(ticket.user, ticket)

  return ticket
}

module.exports = { createTicket, listMine, listAll, resolveTicket }
