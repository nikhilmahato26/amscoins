'use strict'

const logger = require('../lib/logger').child({ service: 'http' })

// Routes that generate too much log noise to be useful.
const SKIP_PATHS = new Set(['/api/health'])

/**
 * Express middleware that logs every HTTP request once the response finishes
 * (or when the client disconnects before a response is sent).
 *
 * Mounted BEFORE routes so `req.user` won't be available yet — we attach a
 * `res.on('finish')` listener that reads `req.user` lazily (populated later
 * by the auth middleware) at the time logging actually happens.
 */
module.exports = function httpLogger(req, res, next) {
  if (SKIP_PATHS.has(req.path)) return next()

  const start = Date.now()

  function log() {
    const responseTime = Date.now() - start
    const status = res.statusCode
    const meta = {
      method: req.method,
      url: req.originalUrl,
      status,
      responseTime,
      ip: req.ip,
      userId: req.user?._id?.toString(),
      userAgent: req.get('user-agent'),
      contentLength: res.get('content-length'),
    }

    // In development, include the request body on mutating requests (with
    // sensitive fields already stripped by the logger's redact helper).
    if (
      process.env.NODE_ENV !== 'production' &&
      ['POST', 'PUT', 'PATCH'].includes(req.method) &&
      req.body &&
      Object.keys(req.body).length > 0
    ) {
      meta.requestBody = logger.redact(req.body)
    }

    // Pick log level based on response status code.
    if (status >= 500) {
      logger.error(`${req.method} ${req.originalUrl} ${status}`, meta)
    } else if (status >= 400) {
      logger.warn(`${req.method} ${req.originalUrl} ${status}`, meta)
    } else {
      logger.http(`${req.method} ${req.originalUrl} ${status}`, meta)
    }
  }

  // `finish` fires when the response has been sent successfully.
  res.once('finish', log)

  // `close` fires when the underlying connection is closed — covers the edge
  // case where the client disconnects before the server finishes responding.
  // Guard against double-logging when both events fire.
  let logged = false
  const safeLog = () => {
    if (logged) return
    logged = true
    log()
  }
  res.once('finish', () => { logged = true })
  res.once('close', safeLog)

  next()
}
