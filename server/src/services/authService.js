'use strict'

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Wallet = require('../models/Wallet')
const env = require('../config/env')
const { ApiError } = require('../middleware/errorHandler')
const { generateUniqueCode } = require('./referralCode')
const logger = require('../lib/logger').child({ service: 'auth' })
const PasswordReset = require('../models/PasswordReset')
const emailService = require('./emailService')

const OTP_TTL_MS = 10 * 60 * 1000
const OTP_MAX_ATTEMPTS = 5

function signToken(user) {
  return jwt.sign({ id: user._id, role: user.role }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES })
}

async function register({ name, email, password, referralCode }) {
  if (await User.exists({ email: email.toLowerCase() })) {
    logger.warn('Registration attempted with already-registered email', { email })
    throw new ApiError(409, 'Email already registered')
  }

  let referredBy = null
  if (referralCode) {
    const referrer = await User.findOne({ referralCode })
    if (referrer) referredBy = referrer._id // invalid codes are silently ignored
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const code = await generateUniqueCode()
  const user = await User.create({ name, email, passwordHash, referralCode: code, referredBy })
  await Wallet.create({ user: user._id, balance: 0 })

  logger.info('User registered', { userId: user._id, email: user.email })
  return { user, token: signToken(user) }
}

async function login({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase() })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    logger.warn('Login failed — invalid credentials', { email })
    throw new ApiError(401, 'Invalid email or password')
  }

  if (user.status === 'frozen') {
    logger.warn('Login attempted on frozen account', { userId: user._id, email })
    throw new ApiError(403, 'Account frozen')
  }

  logger.info('User logged in', { userId: user._id, email: user.email })
  return { user, token: signToken(user) }
}

async function findOrCreateGoogleUser({ googleId, email, name }) {
  const lowerEmail = String(email).toLowerCase()

  let user = await User.findOne({ googleId })
  if (user) {
    if (user.status === 'frozen') throw new ApiError(403, 'Account frozen')
    return user
  }

  user = await User.findOne({ email: lowerEmail })
  if (user) {
    if (user.role === 'admin') throw new ApiError(403, 'Admin accounts must sign in with a password')
    if (user.status === 'frozen') throw new ApiError(403, 'Account frozen')
    user.googleId = googleId
    await user.save()
    logger.info('Linked Google identity to existing account', { userId: user._id })
    return user
  }

  const code = await generateUniqueCode()
  user = await User.create({ name: name || lowerEmail, email: lowerEmail, googleId, referralCode: code })
  await Wallet.create({ user: user._id, balance: 0 })
  logger.info('User registered via Google', { userId: user._id, email: user.email })
  return user
}

async function requestPasswordReset(email) {
  const user = await User.findOne({ email: String(email).toLowerCase() })
  if (!user || user.role === 'admin') {
    logger.info('Password reset requested for unknown/admin email — ignoring', { email })
    return // silent: no account enumeration
  }
  await PasswordReset.deleteMany({ user: user._id })
  const otp = String(Math.floor(100000 + Math.random() * 900000)) // 6 digits
  const otpHash = await bcrypt.hash(otp, 10)
  await PasswordReset.create({ user: user._id, otpHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) })
  await emailService.passwordResetOtp(user, otp)
  logger.info('Password reset OTP issued', { userId: user._id })
}

async function verifyResetOtp(email, otp) {
  const user = await User.findOne({ email: String(email).toLowerCase() })
  if (!user) throw new ApiError(400, 'Invalid or expired code')

  const record = await PasswordReset.findOne({ user: user._id }).sort({ createdAt: -1 })
  if (!record || record.expiresAt < new Date()) throw new ApiError(400, 'Invalid or expired code')
  if (record.attempts >= OTP_MAX_ATTEMPTS) throw new ApiError(429, 'Too many attempts, request a new code')

  const ok = await bcrypt.compare(String(otp), record.otpHash)
  if (!ok) {
    record.attempts += 1
    await record.save()
    throw new ApiError(400, 'Invalid or expired code')
  }

  record.verified = true
  await record.save()
  const resetToken = jwt.sign({ id: user._id, purpose: 'pwreset' }, env.JWT_SECRET, { expiresIn: '15m' })
  return { resetToken }
}

async function resetPassword(resetToken, password) {
  let payload
  try {
    payload = jwt.verify(resetToken, env.JWT_SECRET)
  } catch {
    throw new ApiError(400, 'Reset session expired, please start again')
  }
  if (payload.purpose !== 'pwreset') throw new ApiError(400, 'Invalid reset token')

  const record = await PasswordReset.findOne({ user: payload.id, verified: true })
  if (!record) throw new ApiError(400, 'Reset session expired, please start again')

  const user = await User.findById(payload.id)
  if (!user) throw new ApiError(400, 'Invalid reset token')

  user.passwordHash = await bcrypt.hash(password, 10)
  await user.save()
  await PasswordReset.deleteMany({ user: user._id }) // single-use
  logger.info('Password reset completed', { userId: user._id })
  return { user }
}

module.exports = { register, login, signToken, findOrCreateGoogleUser, requestPasswordReset, verifyResetOtp, resetPassword }
