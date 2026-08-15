'use strict'

const logger = require('../lib/logger').child({ service: 'validation' })

module.exports = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source])
  if (!result.success) {
    const errors = result.error.flatten()
    logger.warn('Request validation failed', {
      method: req.method,
      url: req.originalUrl,
      source,
      errors,
    })
    return res.status(400).json({ error: 'Validation failed', details: errors })
  }
  req[source] = result.data
  next()
}
