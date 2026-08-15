'use strict'

const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const User = require('../models/User')
const Wallet = require('../models/Wallet')
const env = require('../config/env')
const { ApiError } = require('../middleware/errorHandler')
const { generateUniqueCode } = require('./referralCode')
const logger = require('../lib/logger').child({ service: 'auth' })

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

module.exports = { register, login, signToken }
