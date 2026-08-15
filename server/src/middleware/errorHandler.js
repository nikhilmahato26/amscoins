'use strict'

const logger = require('../lib/logger').child({ service: 'error' })

class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

const notFound = (_req, res) => res.status(404).json({ error: 'Not found' })

const errorHandler = (err, req, res, _next) => {
  const code = err.statusCode || 500

  if (code >= 500) {
    // True server errors — log full stack trace.
    logger.error(err.message || 'Server error', {
      stack: err.stack,
      statusCode: code,
      name: err.name,
      method: req.method,
      url: req.originalUrl,
    })
  } else {
    // Client/auth errors — log at warn with lightweight context.
    // Mongoose CastError and ValidationError are in this bucket too.
    logger.warn(err.message || 'Client error', {
      statusCode: code,
      name: err.name,
      method: req.method,
      url: req.originalUrl,
    })
  }

  res.status(code).json({ error: err.message || 'Server error' })
}

module.exports = { ApiError, notFound, errorHandler }
