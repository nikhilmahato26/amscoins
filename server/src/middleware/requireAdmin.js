'use strict'

const { ApiError } = require('./errorHandler')
const logger = require('../lib/logger').child({ service: 'auth' })

module.exports = (req, _res, next) => {
  if (req.user && req.user.role === 'admin') return next()

  logger.warn('Non-admin attempted to access admin route', {
    userId: req.user?._id?.toString(),
    role: req.user?.role,
    url: req.originalUrl,
    ip: req.ip,
  })

  next(new ApiError(403, 'Admin only'))
}
