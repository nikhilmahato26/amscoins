'use strict'

const nodemailer = require('nodemailer')
const env = require('../config/env')
const logger = require('../lib/logger').child({ service: 'email' })

// In tests use a JSON transport so nothing is actually sent over SMTP.
const transport =
  process.env.NODE_ENV === 'test'
    ? nodemailer.createTransport({ jsonTransport: true })
    : nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })

const rupees = (paise) => `₹${(paise / 100).toLocaleString('en-IN')}`

async function sendMail({ to, subject, html }) {
  try {
    logger.info('Sending email', { to, subject })
    return await transport.sendMail({ from: env.MAIL_FROM, to, subject, html })
  } catch (e) {
    // A mail failure must never roll back a wallet transaction.
    logger.error('Email send failed', { to, subject, error: e.message })
    return null
  }
}

const withdrawalInitiated = (user, w) =>
  sendMail({
    to: user.email,
    subject: 'Your withdrawal has been initiated',
    html: `<p>Hi ${user.name}, your withdrawal of ${rupees(w.gross)} (net ${rupees(w.net)} after 5% TDS) has been initiated. Funds reach your bank within 3 hours once verified by our team.</p>`,
  })

const withdrawalCompleted = (user, w) =>
  sendMail({
    to: user.email,
    subject: 'Your withdrawal is complete',
    html: `<p>Hi ${user.name}, your withdrawal of ${rupees(w.net)} has been verified and paid to ${w.upiId}.</p>`,
  })

const withdrawalRejected = (user, w) =>
  sendMail({
    to: user.email,
    subject: 'Your withdrawal was reversed',
    html: `<p>Hi ${user.name}, your withdrawal could not be completed. ${rupees(w.gross)} has been credited back to your ASM Coins wallet.</p>`,
  })

module.exports = { sendMail, withdrawalInitiated, withdrawalCompleted, withdrawalRejected }
