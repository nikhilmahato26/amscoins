'use strict'

const jwt = require('jsonwebtoken')
const User = require('../models/User')
const env = require('../config/env')
const { ApiError } = require('./errorHandler')
const logger = require('../lib/logger').child({ service: 'auth' })

module.exports = async (req, _res, next) => {
  try {
    const header = req.headers.authorization || ''
    const token = header.startsWith('Bearer ') ? header.slice(7) : null

    if (!token) {
      logger.warn('Missing Authorization header', { ip: req.ip, url: req.originalUrl })
      throw new ApiError(401, 'Authentication required')
    }

    let payload
    try {
      payload = jwt.verify(token, env.JWT_SECRET)
    } catch (jwtErr) {
      logger.warn('Invalid or expired JWT', {
        ip: req.ip,
        url: req.originalUrl,
        reason: jwtErr.message,
      })
      throw new ApiError(401, 'Invalid token')
    }

    if (payload.purpose) {
      logger.warn('Purpose-scoped token used as session token', { url: req.originalUrl })
      throw new ApiError(401, 'Invalid token')
    }

    const user = await User.findById(payload.id)
    if (!user) {
      logger.warn('Token references non-existent user', {
        tokenUserId: payload.id,
        url: req.originalUrl,
      })
      throw new ApiError(401, 'Invalid token')
    }

    req.user = user
    next()
  } catch (e) {
    next(e.statusCode ? e : new ApiError(401, 'Invalid token'))
  }
}
